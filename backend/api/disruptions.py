"""
Bob — Disruption API Routes
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_all_disruptions, get_disruption_by_id, get_all_shipments
from models import (
    AffectedShipment,
    AIRecommendation,
    DisruptionMatchResponse,
)
from services.disruption_service import match_shipments
from services import ai_service

router = APIRouter(tags=["Disruptions"])


@router.get("/disruptions")
async def list_disruptions(user_id: str = Depends(get_current_user)):
    """List all active disruptions for the authenticated user."""
    return get_all_disruptions(user_id)


@router.get("/disruptions/{disruption_id}")
async def get_disruption(disruption_id: str, user_id: str = Depends(get_current_user)):
    """Get a single disruption by its display ID."""
    disruption = get_disruption_by_id(user_id, disruption_id)
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return disruption


@router.post("/disruptions/{disruption_id}/match", response_model=DisruptionMatchResponse)
async def match_disruption(disruption_id: str, user_id: str = Depends(get_current_user)):
    """
    Match a disruption to affected shipments + AI recommendations.
    1. Deterministic matching (no AI)
    2. For each matched shipment → AI recommendation (Gemini → Groq)
    """
    disruption = get_disruption_by_id(user_id, disruption_id)
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found")

    all_shipments = get_all_shipments(user_id)
    matched_shipments = match_shipments(disruption, all_shipments)
    sem = asyncio.Semaphore(3)

    async def process_shipment(index: int, shipment):
        ai_rec = None
        # Call AI for top matched shipments, adhering to Gemini/Groq rate limits
        if index < 5:
            try:
                async with sem:
                    ai_data = await ai_service.get_disruption_recommendation(
                        disruption=disruption.model_dump(),
                        shipment=shipment.model_dump(),
                    )
                    ai_rec = AIRecommendation(**ai_data)
            except Exception as e:
                print(f"AI recommendation failed for {shipment.shipment_id}: {e}")

        if not ai_rec:
            # Baseline deterministic recommendation
            delay = disruption.expected_duration_days
            risk = "high" if disruption.severity == "high" or shipment.cargo_type in ["vaccine", "frozen_goods"] else disruption.severity
            action = "reroute" if risk == "high" else "hold"
            ai_rec = AIRecommendation(
                estimated_delay_days=delay,
                risk_level=risk,
                recommended_action=action,
                justification=f"Automated risk evaluation: Active {disruption.type.replace('_', ' ')} at {disruption.location} impacts transit route. Recommended {action.replace('_', ' ')} to mitigate estimated {delay}-day delay.",
                ai_provider="groq",
            )

        return AffectedShipment(
            shipment_id=shipment.shipment_id,
            origin=shipment.origin,
            destination=shipment.destination,
            current_leg=shipment.current_leg,
            route_waypoints=shipment.route_waypoints,
            carrier=shipment.carrier,
            cargo_type=shipment.cargo_type,
            value_usd=shipment.value_usd,
            status=shipment.status,
            ai_recommendation=ai_rec,
        )

    affected = list(await asyncio.gather(*(process_shipment(i, s) for i, s in enumerate(matched_shipments))))

    return DisruptionMatchResponse(
        disruption_id=disruption_id,
        affected_count=len(affected),
        affected_shipments=affected,
        total_affected=len(affected),
        disruption=disruption,
    )
