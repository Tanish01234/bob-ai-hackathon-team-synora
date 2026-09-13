"""
Bob — Shipment API Routes
"""

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_all_shipments, get_shipment_by_id, get_sensor_log_for_shipment
from models import (
    AIExplanation,
    SensorCheckResponse,
)
from services.coldchain_service import detect_excursion, get_safe_range
from services import ai_service

router = APIRouter(tags=["Shipments"])


@router.get("/shipments")
async def list_shipments(user_id: str = Depends(get_current_user)):
    """List all shipments for the authenticated user."""
    return get_all_shipments(user_id)


@router.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: str, user_id: str = Depends(get_current_user)):
    """Get a single shipment by its display ID."""
    shipment = get_shipment_by_id(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.get("/shipments/{shipment_id}/sensor-check", response_model=SensorCheckResponse)
async def sensor_check(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Get cold chain sensor analysis for a shipment.
    1. Rule-based excursion detection (no AI)
    2. If excursion found → AI explanation (Gemini → Groq)
    """
    shipment = get_shipment_by_id(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if shipment.cargo_type not in ["vaccine", "perishable", "frozen_goods"]:
        raise HTTPException(
            status_code=400,
            detail=f"Shipment {shipment_id} has cargo type '{shipment.cargo_type}' which is not a cold-chain cargo",
        )

    log = get_sensor_log_for_shipment(user_id, shipment_id)
    if not log:
        raise HTTPException(status_code=404, detail="No sensor data for this shipment")

    safe_range = get_safe_range(shipment.cargo_type)
    excursion_result = detect_excursion(log)

    ai_explanation = None
    # Deterministic rule: ONLY call AI for moderate or critical excursions
    if excursion_result["status"] != "normal" and excursion_result["details"]:
        try:
            ai_data = await ai_service.get_cold_chain_explanation(
                cargo_type=shipment.cargo_type,
                safe_range=safe_range,
                excursion_details=excursion_result["details"].model_dump(),
            )
            # Deterministic classification is authoritative — AI explanation cannot override it
            ai_data["severity_classification"] = excursion_result["status"]
            ai_explanation = AIExplanation(**ai_data)
        except Exception as e:
            print(f"AI explanation failed for {shipment_id}: {e}")

    return SensorCheckResponse(
        shipment_id=shipment_id,
        cargo_type=shipment.cargo_type,
        safe_range=safe_range,
        excursion_status=excursion_result["status"],
        excursion_details=excursion_result.get("details"),
        ai_explanation=ai_explanation,
        readings=log.readings,
    )
