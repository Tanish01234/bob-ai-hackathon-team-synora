"""
Bob — AI Analysis API Routes
Shipment-specific AI reasoning endpoints.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_shipment_raw, get_all_disruptions
from db import get_supabase
from models import AIShipmentAnalysis
from services import ai_service
from services.tracking_service import get_shipment_tracking
from services.weather_service import get_weather_at_position, get_speed_modifier
from services.risk_service import calculate_risk
from services.route_service import evaluate_alternative_routes
from services.disruption_service import match_shipments
from services.coldchain_service import detect_excursion
from db.queries import get_sensor_log_for_shipment
from services.ai_guard import check_scope, BOB_SCOPE_REJECTION_MESSAGE
from services.ai_retrieval import get_shipment_context, get_fleet_summary, get_high_risk_shipments

router = APIRouter(tags=["AI"])


class AIChatRequest(BaseModel):
    message: str
    shipment_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None


class AIChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []
    risk_level: Optional[str] = None
    recommended_action: Optional[str] = None
    data_snapshot_at: str
    off_topic: bool = False


@router.post("/shipments/{shipment_id}/ai-analysis")
async def analyze_shipment(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Trigger full AI analysis for a shipment.
    Uses shipment-specific context including tracking, weather, disruptions, and cold-chain.
    Results are cached by state hash.
    """
    shipment = get_shipment_raw(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Gather all context
    tracking = get_shipment_tracking(shipment)

    # Weather
    weather_data = {}
    weather_severity = "normal"
    try:
        lat = tracking.current_position.lat
        lng = tracking.current_position.lng
        if lat != 0 or lng != 0:
            weather = await get_weather_at_position(lat, lng)
            weather_severity = weather.severity
            weather_data = weather.model_dump()
    except Exception:
        pass

    # Disruptions affecting this shipment
    disruption_list = []
    disruption_severity = "normal"
    try:
        disruptions = get_all_disruptions(user_id)
        from models import Shipment as ShipmentModel
        wp = shipment.get("route_waypoints", [])
        if isinstance(wp, str):
            wp = json.loads(wp)
        ship_model = ShipmentModel(
            shipment_id=shipment.get("shipment_id", ""),
            origin=shipment.get("origin", ""),
            destination=shipment.get("destination", ""),
            current_leg=shipment.get("current_leg", ""),
            route_waypoints=wp,
            carrier=shipment.get("carrier", ""),
            cargo_type=shipment.get("cargo_type", "standard"),
            eta=str(shipment.get("eta", "")),
            status=shipment.get("status", "in_transit"),
            value_usd=shipment.get("value_usd", 0),
        )
        for d in disruptions:
            if match_shipments(d, [ship_model]):
                disruption_list.append({"location": d.location, "type": d.type, "severity": d.severity})
                sev_order = {"low": 1, "medium": 2, "high": 3}
                if sev_order.get(d.severity, 0) > sev_order.get(disruption_severity, 0):
                    disruption_severity = d.severity
    except Exception:
        pass

    # Cold chain
    cold_chain_status = "normal"
    cold_chain_info = {}
    cargo_type = shipment.get("cargo_type", "standard")
    if cargo_type in ("vaccine", "frozen_goods", "perishable"):
        try:
            sensor_log = get_sensor_log_for_shipment(user_id, shipment_id)
            if sensor_log:
                excursion = detect_excursion(sensor_log)
                cold_chain_status = excursion.get("status", "normal")
                if excursion.get("details"):
                    cold_chain_info = excursion["details"].model_dump()
        except Exception:
            pass

    # Alternative routes
    alt_routes = []
    try:
        disruption_locs = [d["location"] for d in disruption_list]
        wp = shipment.get("route_waypoints", [])
        if isinstance(wp, str):
            wp = json.loads(wp)
        alt_routes = evaluate_alternative_routes(
            shipment_id=shipment_id,
            origin=shipment.get("origin", ""),
            destination=shipment.get("destination", ""),
            current_distance_remaining_km=tracking.distance_remaining_km,
            total_distance_km=shipment.get("total_distance_km", 0),
            cruising_speed_knots=shipment.get("cruising_speed_knots", 18.0),
            route_waypoints=wp,
            disruption_locations=disruption_locs,
            weather_severity=weather_severity,
        )
    except Exception:
        pass

    # Build state hash for caching
    state_key = f"{shipment_id}:{weather_severity}:{disruption_severity}:{cold_chain_status}:{round(tracking.progress_percent)}"
    state_hash = hashlib.md5(state_key.encode()).hexdigest()

    # Check cache
    cached = _check_ai_cache(user_id, shipment_id, state_hash)
    if cached:
        return cached

    # Build AI context
    context = {
        "shipment_id": shipment_id,
        "cargo_type": cargo_type,
        "cargo_value_usd": shipment.get("value_usd", 0),
        "origin": shipment.get("origin", ""),
        "destination": shipment.get("destination", ""),
        "current_location": tracking.current_region,
        "current_speed_knots": tracking.current_speed_knots,
        "normal_speed_knots": tracking.normal_speed_knots,
        "distance_remaining_km": tracking.distance_remaining_km,
        "progress_percent": tracking.progress_percent,
        "original_eta": tracking.original_eta,
        "current_eta": tracking.current_eta,
        "eta_delay_hours": tracking.eta_delay_hours,
        "weather_risk": weather_severity,
        "weather_details": weather_data,
        "disruption_risk": disruption_severity,
        "disruptions": disruption_list,
        "cold_chain_status": cold_chain_status,
        "cold_chain_details": cold_chain_info,
        "alternative_routes": [a.model_dump() for a in alt_routes],
    }

    # Call AI
    try:
        result = await _call_shipment_ai(context)

        # Cache the result
        _store_ai_cache(user_id, shipment_id, state_hash, result)

        return {
            "shipment_id": shipment_id,
            "analysis": result,
            "context_summary": {
                "weather": weather_severity,
                "disruption": disruption_severity,
                "cold_chain": cold_chain_status,
                "progress": tracking.progress_percent,
            },
            "alternative_routes": [a.model_dump() for a in alt_routes],
        }
    except Exception as e:
        # Fallback to deterministic risk when AI fails
        risk = calculate_risk(
            shipment_id=shipment_id,
            cargo_type=cargo_type,
            cargo_value_usd=shipment.get("value_usd", 0),
            weather_severity=weather_severity,
            disruption_severity=disruption_severity,
            cold_chain_status=cold_chain_status,
            eta_delay_hours=tracking.eta_delay_hours,
        )
        return {
            "shipment_id": shipment_id,
            "analysis": {
                "risk_level": risk.overall_risk,
                "recommended_action": "monitor",
                "justification": "AI service unavailable — showing deterministic risk assessment.",
                "summary": "; ".join(risk.reasons),
                "ai_provider": "fallback",
            },
            "context_summary": {
                "weather": weather_severity,
                "disruption": disruption_severity,
                "cold_chain": cold_chain_status,
                "progress": tracking.progress_percent,
            },
            "alternative_routes": [a.model_dump() for a in alt_routes],
            "ai_error": str(e),
        }


async def _call_shipment_ai(context: dict) -> dict:
    """Call AI with full shipment context for analysis."""
    system = """You are Bob, an expert supply chain intelligence analyst.
Given complete shipment state data, analyze the situation and recommend an action.
Return ONLY valid JSON. No markdown, no explanation, no preamble."""

    alt_routes_text = ""
    if context.get("alternative_routes"):
        alt_routes_text = f"\nAlternative routes available:\n{json.dumps(context['alternative_routes'], indent=2)}"

    user = f"""Shipment: {context['shipment_id']}
Cargo: {context['cargo_type']} (${context['cargo_value_usd']:,})
Route: {context['origin']} → {context['destination']}
Current location: {context['current_location']}
Progress: {context['progress_percent']}%
Speed: {context['current_speed_knots']} knots (normal: {context['normal_speed_knots']} knots)
Distance remaining: {context['distance_remaining_km']} km
Original ETA: {context['original_eta']}
Current ETA: {context['current_eta']}
ETA delay: {context.get('eta_delay_hours', 0)} hours

Weather risk: {context['weather_risk']}
Disruption risk: {context['disruption_risk']}
Disruptions: {json.dumps(context.get('disruptions', []))}
Cold chain: {context['cold_chain_status']}
{alt_routes_text}

Return exactly this JSON structure:
{{
  "risk_level": "<low|medium|high|critical>",
  "estimated_delay_days": <integer or null>,
  "recommended_action": "<reroute|hold|alternate_carrier|monitor|quarantine_and_review>",
  "recommended_route_id": "<route_id or null>",
  "justification": "<clear explanation, max 50 words>",
  "summary": "<one-sentence situation summary, max 30 words>"
}}"""

    result, provider = await ai_service.call_ai(system, user)
    result["ai_provider"] = provider
    return result


def _check_ai_cache(user_id: str, shipment_id: str, state_hash: str) -> dict | None:
    """Check for a cached AI assessment with matching state hash."""
    try:
        sb = get_supabase()
        result = (
            sb.table("ai_assessments")
            .select("*")
            .eq("user_id", user_id)
            .eq("shipment_id", shipment_id)
            .eq("state_hash", state_hash)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            resp = row.get("full_response")
            if isinstance(resp, str):
                try:
                    resp = json.loads(resp)
                except Exception:
                    pass
            if isinstance(resp, dict) and "analysis" in resp:
                return resp
    except Exception:
        pass
    return None


def _store_ai_cache(user_id: str, shipment_id: str, state_hash: str, result: dict):
    """Store an AI assessment in the cache."""
    try:
        sb = get_supabase()
        full_data = {
            "shipment_id": shipment_id,
            "analysis": result,
            "alternative_routes": [],
        }
        sb.table("ai_assessments").insert({
            "user_id": user_id,
            "shipment_id": shipment_id,
            "state_hash": state_hash,
            "model": result.get("ai_provider", ""),
            "risk_level": result.get("risk_level", ""),
            "recommended_action": result.get("recommended_action", ""),
            "explanation": result.get("justification", ""),
            "full_response": full_data,
        }).execute()
    except Exception as e:
        print(f"⚠️  Failed to cache AI assessment: {e}")


@router.post("/ai/chat", response_model=AIChatResponse)
async def chat_with_bob(req: AIChatRequest, user_id: str = Depends(get_current_user)):
    """
    Unified Bob AI Chat endpoint.
    Guarded by domain scope check and grounded in live database telemetry.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Platform Scope Guard
    is_allowed, rejection_msg = check_scope(req.message, has_shipment_context=bool(req.shipment_id))
    if not is_allowed:
        return AIChatResponse(
            answer=rejection_msg or BOB_SCOPE_REJECTION_MESSAGE,
            sources=[],
            risk_level=None,
            recommended_action=None,
            data_snapshot_at=now_iso,
            off_topic=True,
        )

    # 2. Live Data Grounding Retrieval
    sources = []
    context_data: Dict[str, Any] = {}
    shipment_ctx = None

    if req.shipment_id:
        shipment_ctx = await get_shipment_context(user_id, req.shipment_id)
        if shipment_ctx:
            context_data["shipment"] = shipment_ctx
            sources.append({"type": "shipment_state", "id": req.shipment_id})
            for d in shipment_ctx.get("disruptions", []):
                sources.append({"type": "disruption", "name": d.get("title", "Active Disruption")})
            if shipment_ctx.get("weather"):
                w = shipment_ctx["weather"]
                sources.append({
                    "type": "weather",
                    "location": f"{shipment_ctx.get('current_region', 'Route')} ({w.get('condition')}, {w.get('wind_speed_kmh')} km/h)",
                })
            if shipment_ctx.get("cold_chain_status") not in ("normal", None):
                sources.append({
                    "type": "cold_chain",
                    "name": f"Cold Chain Alert: {shipment_ctx['cold_chain_status']}",
                })
        else:
            fleet = get_fleet_summary(user_id)
            context_data["fleet"] = fleet
            sources.append({"type": "fleet_overview", "name": f"{fleet.get('total_shipments', 0)} shipments"})
    else:
        fleet = get_fleet_summary(user_id)
        high_risk = get_high_risk_shipments(user_id, 5)
        context_data["fleet"] = fleet
        context_data["high_risk_shipments"] = high_risk
        sources.append({
            "type": "fleet_overview",
            "name": f"{fleet.get('total_shipments', 0)} shipments ({fleet.get('active_disruptions', 0)} disruptions)",
        })
        for hr in high_risk[:2]:
            sources.append({"type": "shipment_state", "id": hr.get("shipment_id", "")})

    # 3. Construct AI Prompt
    system_prompt = (
        "You are Bob, the expert Supply Chain Intelligence Assistant for the BOB platform.\n"
        "Answer user inquiries grounded STRICTLY in the provided live telemetry and database state.\n"
        "RULES DETECT. AI REASONS. Never fabricate shipment IDs, metric values, or coordinates.\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "answer": "<direct, actionable, professional guidance, max 80 words>",\n'
        '  "risk_level": "<low|medium|high|critical>",\n'
        '  "recommended_action": "<reroute|hold|monitor|alternate_carrier|quarantine_and_review|none>"\n'
        "}"
    )

    history_str = ""
    if req.history:
        recent = req.history[-3:]
        history_str = "\nRecent Conversation History:\n" + "\n".join(
            f"- {h.get('role', 'user')}: {h.get('content', '')}" for h in recent
        )

    user_prompt = f"""Telemetry & Live State Context:
{json.dumps(context_data, indent=2)}
{history_str}

User Question: {req.message}
"""

    # 4. Invoke AI with deterministic fallback
    try:
        ai_resp, provider = await ai_service.call_ai(system_prompt, user_prompt)
        answer = ai_resp.get("answer", "")
        risk_level = ai_resp.get("risk_level")
        rec_action = ai_resp.get("recommended_action")
        if not answer:
            raise ValueError("Empty answer from AI provider")

        # Cache or log if shipment-specific
        if req.shipment_id and risk_level:
            try:
                state_key = f"chat:{req.shipment_id}:{risk_level}:{rec_action}"
                s_hash = hashlib.md5(state_key.encode()).hexdigest()
                _store_ai_cache(user_id, req.shipment_id, s_hash, {
                    "risk_level": risk_level,
                    "recommended_action": rec_action,
                    "justification": answer,
                    "ai_provider": provider,
                })
            except Exception:
                pass

        return AIChatResponse(
            answer=answer,
            sources=sources,
            risk_level=risk_level,
            recommended_action=rec_action,
            data_snapshot_at=now_iso,
            off_topic=False,
        )
    except Exception as e:
        print(f"⚠️  AI chat provider call failed ({e}) — falling back to deterministic response")
        # Grounded deterministic fallback
        if shipment_ctx:
            risk_level = shipment_ctx.get("overall_risk", "low")
            rec_action = "reroute" if risk_level in ("high", "critical") and shipment_ctx.get("alternative_routes") else "monitor"
            reasons = "; ".join(shipment_ctx.get("risk_reasons", [])) or "Operational metrics within tolerance."
            answer = (
                f"Shipment {req.shipment_id} ({shipment_ctx.get('origin')} → {shipment_ctx.get('destination')}) "
                f"is in {shipment_ctx.get('current_region')} with risk assessed as {risk_level.upper()}. "
                f"Weather: {shipment_ctx.get('weather', {}).get('condition')}. {reasons} Recommended action: {rec_action.replace('_', ' ').title()}."
            )
        else:
            fleet = context_data.get("fleet", {})
            delayed = fleet.get("delayed", 0)
            risk_level = "medium" if delayed > 0 else "low"
            rec_action = "monitor"
            answer = (
                f"Bob Fleet Overview: {fleet.get('total_shipments', 0)} shipments total "
                f"({fleet.get('in_transit', 0)} in-transit, {delayed} delayed). "
                f"There are {fleet.get('active_disruptions', 0)} active disruptions affecting {fleet.get('affected_shipments', 0)} shipments "
                f"with {fleet.get('critical_alerts', 0)} critical alerts active across the network."
            )

        return AIChatResponse(
            answer=answer,
            sources=sources,
            risk_level=risk_level,
            recommended_action=rec_action,
            data_snapshot_at=now_iso,
            off_topic=False,
        )
