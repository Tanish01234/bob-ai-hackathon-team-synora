"""
Bob — Admin API Routes
Shipment management, disruption management, simulation control, demo events.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db import get_supabase
from db.queries import get_all_shipments, get_all_disruptions, get_shipment_raw
from models import (
    ShipmentCreate, ShipmentUpdate,
    DisruptionCreate, DisruptionUpdate,
    SimulationSpeedRequest, DemoEventRequest,
)
from services.simulation_service import (
    get_simulation_state, pause_simulation, resume_simulation,
    set_simulation_speed, reset_simulation,
)
from services.alert_service import generate_alert
from services.weather_service import clear_weather_cache

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Admin auth dependency ────────────────────────────────────
async def get_admin_user(user_id: str = Depends(get_current_user)) -> str:
    """Verify user has admin role. Falls back to allowing all authenticated users for demo."""
    sb = get_supabase()
    try:
        result = (
            sb.table("profiles")
            .select("role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if result.data and result.data[0].get("role") == "admin":
            return user_id
    except Exception:
        pass

    # For demo: allow any authenticated user to access admin
    # In production, uncomment the raise below:
    # raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


# ── Overview ─────────────────────────────────────────────────

@router.get("/overview")
async def admin_overview(user_id: str = Depends(get_admin_user)):
    """Get admin overview stats matching dashboard summary."""
    from db.queries import (
        count_shipments_by_status, get_cold_chain_stats, get_alert_counts,
    )
    from services.disruption_service import match_shipments

    shipments = get_all_shipments(user_id)
    disruptions = get_all_disruptions(user_id)
    status_counts = count_shipments_by_status(user_id)
    cc_stats = get_cold_chain_stats(user_id)
    alert_counts = get_alert_counts(user_id)
    sim = get_simulation_state()

    affected_ids: set[str] = set()
    for disruption in disruptions:
        for shipment in match_shipments(disruption, shipments):
            affected_ids.add(shipment.shipment_id)

    return {
        "total_shipments": len(shipments),
        "in_transit": status_counts.get("in_transit", 0),
        "delayed": status_counts.get("delayed", 0),
        "delivered": status_counts.get("delivered", 0),
        "at_risk": len(affected_ids),
        "active_disruptions": len(disruptions),
        "affected_shipments": len(affected_ids),
        "disruption_alerts": len(disruptions),
        "weather_alerts": alert_counts.get("high", 0) + alert_counts.get("critical", 0),
        "cold_chain_alerts": cc_stats.get("critical", 0) + cc_stats.get("moderate", 0),
        "critical_alerts": alert_counts.get("critical", 0) + cc_stats.get("critical", 0),
        "simulation": sim,
    }


@router.get("/ai-activity")
async def admin_ai_activity(user_id: str = Depends(get_admin_user)):
    """Get recent AI activity logs from ai_assessments."""
    sb = get_supabase()
    try:
        result = sb.table("ai_assessments").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        return result.data or []
    except Exception:
        return []


# ── Shipment Management ─────────────────────────────────────

@router.get("/shipments")
async def admin_list_shipments(
    status: str = None,
    cargo_type: str = None,
    search: str = None,
    user_id: str = Depends(get_admin_user),
):
    """List shipments with optional filters."""
    sb = get_supabase()
    query = sb.table("shipments").select("*").eq("user_id", user_id)

    if status:
        query = query.eq("status", status)
    if cargo_type:
        query = query.eq("cargo_type", cargo_type)

    result = query.order("shipment_id").execute()
    data = result.data or []

    if search:
        search_lower = search.lower()
        data = [
            r for r in data
            if search_lower in r.get("shipment_id", "").lower()
            or search_lower in r.get("origin", "").lower()
            or search_lower in r.get("destination", "").lower()
            or search_lower in r.get("carrier", "").lower()
        ]

    return data


@router.get("/shipments/{shipment_id}")
async def admin_get_shipment(shipment_id: str, user_id: str = Depends(get_admin_user)):
    """Get full details of a single shipment for admin inspection."""
    ship = get_shipment_raw(user_id, shipment_id)
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return ship


@router.post("/shipments")
async def admin_create_shipment(body: ShipmentCreate, user_id: str = Depends(get_admin_user)):
    """Create a new shipment."""
    sb = get_supabase()
    # Generate next shipment ID
    existing = sb.table("shipments").select("shipment_id").eq("user_id", user_id).execute()
    max_num = 1000
    for row in existing.data or []:
        sid = row.get("shipment_id", "")
        if sid.startswith("SHP-"):
            try:
                num = int(sid.split("-")[1])
                max_num = max(max_num, num)
            except ValueError:
                pass
    new_id = f"SHP-{max_num + 1}"

    data = {
        "user_id": user_id,
        "shipment_id": new_id,
        "origin": body.origin,
        "destination": body.destination,
        "carrier": body.carrier,
        "cargo_type": body.cargo_type,
        "value_usd": body.value_usd,
        "status": body.status,
        "current_leg": f"{body.origin}–{body.destination}",
        "route_waypoints": json.dumps([body.origin, body.destination]),
        "eta": (datetime.now(timezone.utc).replace(day=datetime.now().day + 7)).strftime("%Y-%m-%d"),
    }
    result = sb.table("shipments").insert(data).execute()
    return result.data[0] if result.data else data


@router.patch("/shipments/{shipment_id}")
async def admin_update_shipment(
    shipment_id: str, body: ShipmentUpdate, user_id: str = Depends(get_admin_user)
):
    """Update a shipment."""
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    result = (
        sb.table("shipments")
        .update(updates)
        .eq("user_id", user_id)
        .eq("shipment_id", shipment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return result.data[0]


@router.delete("/shipments/{shipment_id}")
async def admin_delete_shipment(shipment_id: str, user_id: str = Depends(get_admin_user)):
    """Delete a shipment."""
    sb = get_supabase()
    result = (
        sb.table("shipments")
        .delete()
        .eq("user_id", user_id)
        .eq("shipment_id", shipment_id)
        .execute()
    )
    return {"deleted": shipment_id}


# ── Disruption Management ───────────────────────────────────

@router.post("/disruptions")
async def admin_create_disruption(body: DisruptionCreate, user_id: str = Depends(get_admin_user)):
    """Create a new disruption."""
    sb = get_supabase()
    existing = sb.table("disruptions").select("disruption_id").eq("user_id", user_id).execute()
    max_num = 0
    for row in existing.data or []:
        did = row.get("disruption_id", "")
        if did.startswith("DIS-"):
            try:
                num = int(did.split("-")[1])
                max_num = max(max_num, num)
            except ValueError:
                pass
    new_id = f"DIS-{max_num + 1:02d}"

    data = {
        "user_id": user_id,
        "disruption_id": new_id,
        "type": body.type,
        "location": body.location,
        "severity": body.severity,
        "expected_duration_days": body.expected_duration_days,
        "description": body.description,
        "start_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "active": True,
    }
    result = sb.table("disruptions").insert(data).execute()
    return result.data[0] if result.data else data


@router.patch("/disruptions/{disruption_id}")
async def admin_update_disruption(
    disruption_id: str, body: DisruptionUpdate, user_id: str = Depends(get_admin_user)
):
    """Update a disruption."""
    sb = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    result = (
        sb.table("disruptions")
        .update(updates)
        .eq("user_id", user_id)
        .eq("disruption_id", disruption_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return result.data[0]


@router.get("/disruptions")
async def admin_list_disruptions(user_id: str = Depends(get_admin_user)):
    """Get all disruptions for admin."""
    return get_all_disruptions(user_id)


@router.post("/disruptions/{disruption_id}/toggle")
async def admin_toggle_disruption(disruption_id: str, user_id: str = Depends(get_admin_user)):
    """Toggle a disruption active/inactive."""
    sb = get_supabase()
    res = sb.table("disruptions").select("active").eq("user_id", user_id).eq("disruption_id", disruption_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Disruption not found")
    new_active = not res.data[0].get("active", True)
    upd = sb.table("disruptions").update({"active": new_active}).eq("user_id", user_id).eq("disruption_id", disruption_id).execute()
    return upd.data[0] if upd.data else {"disruption_id": disruption_id, "active": new_active}


# ── Simulation Control ──────────────────────────────────────

@router.get("/simulation")
async def admin_simulation_status(user_id: str = Depends(get_admin_user)):
    """Get simulation state."""
    return get_simulation_state()


@router.post("/simulation/pause")
async def admin_pause(user_id: str = Depends(get_admin_user)):
    """Pause the simulation."""
    return pause_simulation()


@router.post("/simulation/resume")
async def admin_resume(user_id: str = Depends(get_admin_user)):
    """Resume the simulation."""
    return resume_simulation()


@router.post("/simulation/speed")
async def admin_set_speed(body: SimulationSpeedRequest, user_id: str = Depends(get_admin_user)):
    """Set simulation speed multiplier."""
    if body.speed_multiplier not in (1, 10, 50, 100):
        if body.speed_multiplier < 0.1 or body.speed_multiplier > 1000:
            raise HTTPException(status_code=400, detail="Speed must be between 0.1 and 1000")
    return set_simulation_speed(body.speed_multiplier)


@router.post("/simulation/reset")
async def admin_reset(user_id: str = Depends(get_admin_user)):
    """Reset simulation and clear caches."""
    clear_weather_cache()
    state = reset_simulation()

    # Clear alerts
    sb = get_supabase()
    try:
        sb.table("alerts").delete().eq("user_id", user_id).execute()
        sb.table("ai_assessments").delete().eq("user_id", user_id).execute()
    except Exception:
        pass

    return {"status": "reset", "simulation": state}


# ── Demo Event Triggers ──────────────────────────────────────

@router.post("/simulation/weather-event")
async def admin_trigger_weather(body: DemoEventRequest, user_id: str = Depends(get_admin_user)):
    """
    Simulate severe weather for a shipment.
    Generates a weather alert and the downstream effects.
    """
    shipment_id = body.shipment_id
    if not shipment_id:
        shipments = get_all_shipments(user_id)
        in_transit = [s for s in shipments if s.status == "in_transit"]
        if in_transit:
            import random
            shipment_id = random.choice(in_transit).shipment_id
        else:
            sb = get_supabase()
            res = sb.table("shipments").select("shipment_id").eq("status", "in_transit").limit(20).execute()
            if res.data:
                import random
                shipment_id = random.choice(res.data)["shipment_id"]
            else:
                res2 = sb.table("shipments").select("shipment_id").limit(1).execute()
                shipment_id = res2.data[0]["shipment_id"] if res2.data else "SHP-1001"

    severity = body.severity or "high"

    alert = generate_alert(
        user_id=user_id,
        shipment_id=shipment_id,
        alert_type="weather",
        severity=severity,
        title=f"Severe weather event ({severity})",
        message=f"Simulated severe weather event affecting {shipment_id}. Vessel speed will be reduced and ETA recalculated.",
        recommended_action="review_route",
    )

    return {
        "event": "weather_event",
        "shipment_id": shipment_id,
        "severity": severity,
        "alert": alert.model_dump(),
    }


@router.post("/simulation/cold-chain-event")
async def admin_trigger_cold_chain(body: DemoEventRequest, user_id: str = Depends(get_admin_user)):
    """Simulate a cold-chain excursion for a shipment."""
    shipment_id = body.shipment_id
    if not shipment_id:
        shipments = get_all_shipments(user_id)
        cold_chain = [s for s in shipments if s.cargo_type in ("vaccine", "frozen_goods", "perishable") and s.status == "in_transit"]
        if cold_chain:
            import random
            shipment_id = random.choice(cold_chain).shipment_id
        else:
            sb = get_supabase()
            res = sb.table("shipments").select("shipment_id").in_("cargo_type", ["vaccine", "frozen_goods", "perishable"]).limit(20).execute()
            if res.data:
                import random
                shipment_id = random.choice(res.data)["shipment_id"]
            else:
                shipment_id = "SHP-1042"

    alert = generate_alert(
        user_id=user_id,
        shipment_id=shipment_id,
        alert_type="cold_chain",
        severity="critical",
        title="Critical cold-chain excursion",
        message=f"Simulated temperature excursion for {shipment_id}. Temperature has exceeded safe range for over 2 hours.",
        recommended_action="quarantine_and_review",
    )

    return {
        "event": "cold_chain_excursion",
        "shipment_id": shipment_id,
        "severity": "critical",
        "alert": alert.model_dump(),
    }


@router.post("/simulation/port-strike")
async def admin_trigger_port_strike(body: DemoEventRequest, user_id: str = Depends(get_admin_user)):
    """Simulate a major port strike disruption."""
    shipment_id = body.shipment_id
    if not shipment_id:
        shipments = get_all_shipments(user_id)
        in_transit = [s for s in shipments if s.status == "in_transit"]
        if in_transit:
            import random
            shipment_id = random.choice(in_transit).shipment_id
        else:
            shipment_id = "SHP-1010"

    alert = generate_alert(
        user_id=user_id,
        shipment_id=shipment_id,
        alert_type="disruption",
        severity="high",
        title="Port Strike Disruption",
        message=f"Port labor strike impacting port operations along route for {shipment_id}. Berthing delays expected.",
        recommended_action="reroute",
    )

    return {
        "event": "port_strike",
        "shipment_id": shipment_id,
        "severity": "high",
        "alert": alert.model_dump(),
    }
