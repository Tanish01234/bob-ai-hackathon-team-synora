"""
Bob — Risk & Alerts API Routes
"""

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_shipment_raw, get_all_disruptions, get_all_shipments
from models import RiskResponse
from services.tracking_service import get_shipment_tracking
from services.weather_service import get_weather_at_position, get_speed_modifier
from services.risk_service import calculate_risk
from services.coldchain_service import detect_excursion
from services.disruption_service import match_shipments
from services.alert_service import get_alerts_for_shipment, get_all_alerts, check_and_generate_alerts
from db.queries import get_sensor_log_for_shipment

router = APIRouter(tags=["Risk & Alerts"])


@router.get("/shipments/{shipment_id}/risk", response_model=RiskResponse)
async def get_shipment_risk(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Get unified risk assessment for a shipment.
    Combines weather, disruption, cold-chain, and delay signals.
    """
    shipment = get_shipment_raw(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Get tracking for position and ETA delay
    tracking = get_shipment_tracking(shipment)

    # Get weather severity
    weather_severity = "normal"
    try:
        lat = tracking.current_position.lat
        lng = tracking.current_position.lng
        if lat != 0 or lng != 0:
            weather = await get_weather_at_position(lat, lng)
            weather_severity = weather.severity
    except Exception:
        pass

    # Get disruption severity
    disruption_severity = "normal"
    try:
        from models import Shipment as ShipmentModel
        shipment_model = ShipmentModel(**{
            "shipment_id": shipment.get("shipment_id", ""),
            "origin": shipment.get("origin", ""),
            "destination": shipment.get("destination", ""),
            "current_leg": shipment.get("current_leg", ""),
            "route_waypoints": _parse_waypoints(shipment.get("route_waypoints")),
            "carrier": shipment.get("carrier", ""),
            "cargo_type": shipment.get("cargo_type", "standard"),
            "eta": str(shipment.get("eta", "")),
            "status": shipment.get("status", "in_transit"),
            "value_usd": shipment.get("value_usd", 0),
        })
        disruptions = get_all_disruptions(user_id)
        for d in disruptions:
            matched = match_shipments(d, [shipment_model])
            if matched:
                sev_order = {"low": 1, "medium": 2, "high": 3}
                if sev_order.get(d.severity, 0) > sev_order.get(disruption_severity, 0):
                    disruption_severity = d.severity
    except Exception:
        pass

    # Get cold-chain status
    cold_chain_status = "normal"
    cargo_type = shipment.get("cargo_type", "standard")
    if cargo_type in ("vaccine", "frozen_goods", "perishable"):
        try:
            sensor_log = get_sensor_log_for_shipment(user_id, shipment_id)
            if sensor_log:
                excursion = detect_excursion(sensor_log)
                cold_chain_status = excursion.get("status", "normal")
        except Exception:
            pass

    # Calculate unified risk
    risk = calculate_risk(
        shipment_id=shipment_id,
        cargo_type=cargo_type,
        cargo_value_usd=shipment.get("value_usd", 0),
        weather_severity=weather_severity,
        disruption_severity=disruption_severity,
        cold_chain_status=cold_chain_status,
        eta_delay_hours=tracking.eta_delay_hours,
    )

    # Generate alerts if needed
    try:
        check_and_generate_alerts(
            user_id=user_id,
            shipment_id=shipment_id,
            weather_severity=weather_severity,
            disruption_severity=disruption_severity,
            cold_chain_status=cold_chain_status,
            overall_risk=risk.overall_risk,
            eta_delay_hours=tracking.eta_delay_hours,
        )
    except Exception as e:
        print(f"⚠️  Alert generation failed for {shipment_id}: {e}")

    return risk


@router.get("/shipments/{shipment_id}/alerts")
async def get_shipment_alerts(shipment_id: str, user_id: str = Depends(get_current_user)):
    """Get alerts for a specific shipment."""
    alerts = get_alerts_for_shipment(user_id, shipment_id)
    return alerts


@router.get("/alerts")
async def list_alerts(user_id: str = Depends(get_current_user)):
    """Get all alerts for the user."""
    alerts = get_all_alerts(user_id)
    return alerts


def _parse_waypoints(wp) -> list[str]:
    """Parse waypoints from various formats."""
    import json
    if isinstance(wp, list):
        return wp
    if isinstance(wp, str):
        try:
            return json.loads(wp)
        except Exception:
            return []
    return []
