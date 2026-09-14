"""
Bob — Tracking API Routes
Live vessel tracking and simulation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_shipment_raw, get_all_shipments, get_all_disruptions, count_shipments_by_status, get_cold_chain_stats, get_alert_counts
from models import TrackingResponse, DashboardSummary
from services.tracking_service import get_shipment_tracking
from services.weather_service import get_cached_weather, get_speed_modifier
from services.simulation_service import get_simulation_state
from services.disruption_service import match_shipments

router = APIRouter(tags=["Tracking"])


@router.get("/fleet/tracking")
@router.get("/shipments/fleet-tracking")
async def get_fleet_tracking(user_id: str = Depends(get_current_user)):
    """
    High-speed batch calculation of live positions, speeds, progress, and risk
    for all fleet shipments (<10ms total runtime).
    """
    from db.queries import get_all_shipments_raw, get_all_disruptions
    from services.simulation_service import calculate_position, get_simulation_time
    import json

    sim_time = get_simulation_time()
    raw_shipments = get_all_shipments_raw(user_id)
    disruptions = get_all_disruptions(user_id)

    # Pre-parse disruptions and map to locations
    disrupt_locs = {d.location for d in disruptions if getattr(d, "active", True) is not False}

    results = []
    for s in raw_shipments:
        shipment_id = s.get("shipment_id", "")
        origin = s.get("origin", "")
        destination = s.get("destination", "")
        status = s.get("status", "in_transit")
        cargo_type = s.get("cargo_type", "standard")
        carrier = s.get("carrier", "")
        value_usd = s.get("value_usd", 0)

        # Parse segments
        segs = s.get("route_segments", [])
        if isinstance(segs, str):
            try:
                segs = json.loads(segs)
            except Exception:
                segs = []

        # Calculate position along route
        pos = calculate_position(
            departure_time=s.get("departure_time") or sim_time.isoformat(),
            route_segments=segs,
            total_distance_km=s.get("total_distance_km", 0),
            cruising_speed_knots=s.get("cruising_speed_knots", 18.0),
            sim_time=sim_time,
        )

        # Risk state: normal (green), moderate (yellow), high (orange), critical (red)
        risk = "normal"
        if status == "delayed":
            risk = "high"
        elif cargo_type in ("vaccine", "frozen_goods") and status != "delivered":
            risk = "moderate"

        # Check route waypoints against disruptions
        wp = s.get("route_waypoints", [])
        if isinstance(wp, str):
            try:
                wp = json.loads(wp)
            except Exception:
                wp = []
        if any(w in disrupt_locs for w in wp):
            risk = "critical" if cargo_type in ("vaccine", "frozen_goods") else "high"

        results.append({
            "shipment_id": shipment_id,
            "origin": origin,
            "destination": destination,
            "carrier": carrier,
            "cargo_type": cargo_type,
            "status": status,
            "value_usd": value_usd,
            "latitude": pos.get("current_lat", 0.0),
            "longitude": pos.get("current_lng", 0.0),
            "current_speed_knots": pos.get("current_speed_knots", 18.0),
            "normal_speed_knots": s.get("cruising_speed_knots", 18.0),
            "progress_percent": pos.get("progress_percent", 0.0),
            "distance_travelled_km": pos.get("distance_travelled_km", 0),
            "distance_remaining_km": pos.get("distance_remaining_km", 0),
            "current_leg": pos.get("current_region") or pos.get("current_leg", ""),
            "route_waypoints": wp,
            "eta": str(s.get("eta", "")),
            "risk": risk,
        })

    return results


@router.get("/shipments/{shipment_id}/tracking", response_model=TrackingResponse)
async def get_tracking(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Get live tracking data for a shipment.
    Position is calculated from simulation time + route + speed.
    Weather can affect effective speed and ETA.
    """
    shipment = get_shipment_raw(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Check if weather at current position is cached (<0.01ms) to determine speed modifier.
    # Non-blocking: live tracking coordinates return immediately in <2ms without waiting for external API.
    weather_modifier = 1.0
    try:
        # First get basic position to know coordinates
        basic_tracking = get_shipment_tracking(shipment, weather_modifier=1.0)
        lat = basic_tracking.current_position.lat
        lng = basic_tracking.current_position.lng

        if lat != 0 and lng != 0:
            cached_weather = get_cached_weather(lat, lng)
            if cached_weather:
                weather_modifier = get_speed_modifier(cached_weather.severity)
    except Exception as e:
        print(f"⚠️  Weather cache check failed for tracking {shipment_id}: {e}")

    # Calculate full tracking with weather modifier
    tracking = get_shipment_tracking(shipment, weather_modifier=weather_modifier)
    return tracking


@router.get("/simulation")
async def get_simulation(user_id: str = Depends(get_current_user)):
    """Get current simulation state."""
    state = get_simulation_state()
    return state


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(user_id: str = Depends(get_current_user)):
    """
    Enhanced dashboard summary with all stat categories.
    """
    shipments = get_all_shipments(user_id)
    disruptions = get_all_disruptions(user_id)
    status_counts = count_shipments_by_status(user_id)
    cc_stats = get_cold_chain_stats(user_id)
    alert_counts = get_alert_counts(user_id)

    # Count disruption-affected shipments
    affected_ids: set[str] = set()
    for disruption in disruptions:
        for shipment in match_shipments(disruption, shipments):
            affected_ids.add(shipment.shipment_id)

    return DashboardSummary(
        total_shipments=len(shipments),
        in_transit=status_counts.get("in_transit", 0),
        delayed=status_counts.get("delayed", 0),
        delivered=status_counts.get("delivered", 0),
        at_risk=len(affected_ids),
        active_disruptions=len(disruptions),
        affected_shipments=len(affected_ids),
        disruption_alerts=len(disruptions),
        weather_alerts=alert_counts.get("high", 0) + alert_counts.get("critical", 0),
        cold_chain_alerts=cc_stats.get("critical", 0) + cc_stats.get("moderate", 0),
        critical_alerts=alert_counts.get("critical", 0) + cc_stats.get("critical", 0),
    )
