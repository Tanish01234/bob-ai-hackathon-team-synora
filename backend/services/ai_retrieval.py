"""
Bob — AI Retrieval Service
Shared data retrieval and grounding tools for Bob AI Assistant.
Extracts live database facts, simulation tracking, weather, and risks
to ensure answers are 100% grounded in current system state.
"""

from typing import Optional
from db.queries import (
    get_shipment_raw,
    get_all_shipments_raw,
    get_all_disruptions,
    get_sensor_log_for_shipment,
    count_shipments_by_status,
    get_cold_chain_stats,
    get_alert_counts,
)
from services.simulation_service import calculate_position, calculate_eta, get_simulation_time
from services.weather_service import get_weather_at_position, get_speed_modifier
from services.risk_service import calculate_risk
from services.coldchain_service import detect_excursion
from services.disruption_service import match_shipments
from services.route_service import evaluate_alternative_routes
from models import Shipment as ShipmentModel


async def get_shipment_context(user_id: str, shipment_id: str) -> Optional[dict]:
    """Retrieve complete, live intelligence context for a specific shipment."""
    ship = get_shipment_raw(user_id, shipment_id)
    if not ship:
        return None

    # Tracking & Position
    sim_time = get_simulation_time()
    tracking_calc = calculate_position(
        departure_time=ship.get("departure_time") or sim_time.isoformat(),
        route_segments=ship.get("route_segments") or [],
        total_distance_km=ship.get("total_distance_km", 0),
        cruising_speed_knots=ship.get("cruising_speed_knots", 18.0),
        sim_time=sim_time,
    )

    # Weather at current position
    lat = tracking_calc.get("current_lat", 0)
    lng = tracking_calc.get("current_lng", 0)
    weather = await get_weather_at_position(lat, lng)
    weather_modifier = get_speed_modifier(weather.severity)

    # Dynamic ETA
    effective_speed = tracking_calc.get("effective_speed_kmh", 35.0) * weather_modifier
    eta_calc = calculate_eta(
        distance_remaining_km=tracking_calc.get("distance_remaining_km", 0),
        effective_speed_kmh=effective_speed,
        sim_time=sim_time,
    )

    # Disruptions along route
    disruptions = get_all_disruptions(user_id)
    disrupt_list = []
    max_disrupt_sev = "normal"
    wp = ship.get("route_waypoints", [])
    if isinstance(wp, str):
        try:
            wp = json.loads(wp)
        except Exception:
            wp = []
    ship_model = ShipmentModel(
        shipment_id=ship.get("shipment_id", ""),
        origin=ship.get("origin", ""),
        destination=ship.get("destination", ""),
        current_leg=ship.get("current_leg", ""),
        route_waypoints=wp,
        carrier=ship.get("carrier", ""),
        cargo_type=ship.get("cargo_type", "standard"),
        eta=str(ship.get("eta", "")),
        status=ship.get("status", "in_transit"),
        value_usd=ship.get("value_usd", 0),
    )
    for d in disruptions:
        if match_shipments(d, [ship_model]):
            disrupt_list.append({"title": d.location, "type": d.type, "severity": d.severity})
            if d.severity in ("high", "critical"):
                max_disrupt_sev = "high"
            elif d.severity == "medium" and max_disrupt_sev != "high":
                max_disrupt_sev = "medium"

    # Cold chain status
    cold_chain_status = "normal"
    if ship.get("cargo_type") in ("vaccine", "frozen_goods", "perishable"):
        slog = get_sensor_log_for_shipment(user_id, shipment_id)
        if slog:
            exc = detect_excursion(slog)
            cold_chain_status = exc.get("status", "normal")

    # Unified risk
    risk = calculate_risk(
        shipment_id=shipment_id,
        cargo_type=ship.get("cargo_type", "standard"),
        cargo_value_usd=ship.get("value_usd", 0),
        weather_severity=weather.severity,
        disruption_severity=max_disrupt_sev,
        cold_chain_status=cold_chain_status,
    )

    # Alternative routes
    alt_routes = evaluate_alternative_routes(
        shipment_id=shipment_id,
        origin=ship.get("origin", ""),
        destination=ship.get("destination", ""),
        current_distance_remaining_km=tracking_calc.get("distance_remaining_km", 0),
        total_distance_km=ship.get("total_distance_km", 0),
        cruising_speed_knots=ship.get("cruising_speed_knots", 18.0),
        route_waypoints=ship.get("route_waypoints", []),
        disruption_locations=[d["title"] for d in disrupt_list],
        weather_severity=weather.severity,
    )

    return {
        "shipment_id": shipment_id,
        "status": ship.get("status"),
        "origin": ship.get("origin"),
        "destination": ship.get("destination"),
        "carrier": ship.get("carrier"),
        "cargo_type": ship.get("cargo_type"),
        "cargo_value_usd": ship.get("value_usd"),
        "current_region": tracking_calc.get("current_region") or tracking_calc.get("current_leg"),
        "current_speed_knots": round(tracking_calc.get("current_speed_knots", 18.0) * weather_modifier, 1),
        "normal_speed_knots": tracking_calc.get("current_speed_knots", 18.0),
        "distance_travelled_km": tracking_calc.get("distance_travelled_km", 0),
        "distance_remaining_km": tracking_calc.get("distance_remaining_km", 0),
        "progress_percent": tracking_calc.get("progress_percent", 0),
        "current_eta": eta_calc.get("eta"),
        "weather": {
            "condition": weather.condition,
            "temperature_c": weather.temperature_c,
            "wind_speed_kmh": weather.wind_speed_kmh,
            "severity": weather.severity,
        },
        "disruptions": disrupt_list,
        "cold_chain_status": cold_chain_status,
        "overall_risk": risk.overall_risk,
        "risk_reasons": risk.reasons,
        "alternative_routes": [
            {
                "name": a.name,
                "description": a.description,
                "distance_km": a.distance_km,
                "duration_days": a.estimated_duration_days,
                "risk_level": a.risk_level,
            }
            for a in alt_routes
        ],
    }


def get_fleet_summary(user_id: str) -> dict:
    """Get aggregated fleet statistics and high-level situation."""
    ships = get_all_shipments_raw(user_id)
    disruptions = get_all_disruptions(user_id)
    status_counts = count_shipments_by_status(user_id)
    cc_stats = get_cold_chain_stats(user_id)
    alert_counts = get_alert_counts(user_id)

    # Affected shipments
    ship_models = []
    for s in ships:
        wp = s.get("route_waypoints", [])
        if isinstance(wp, str):
            try:
                wp = json.loads(wp)
            except Exception:
                wp = []
        ship_models.append(
            ShipmentModel(
                shipment_id=s.get("shipment_id", ""),
                origin=s.get("origin", ""),
                destination=s.get("destination", ""),
                current_leg=s.get("current_leg", ""),
                route_waypoints=wp,
                carrier=s.get("carrier", ""),
                cargo_type=s.get("cargo_type", "standard"),
                eta=str(s.get("eta", "")),
                status=s.get("status", "in_transit"),
                value_usd=s.get("value_usd", 0),
            )
        )
    affected_set = set()
    for d in disruptions:
        for m in match_shipments(d, ship_models):
            affected_set.add(m.shipment_id)

    return {
        "total_shipments": len(ships),
        "in_transit": status_counts.get("in_transit", 0),
        "delayed": status_counts.get("delayed", 0),
        "delivered": status_counts.get("delivered", 0),
        "active_disruptions": len(disruptions),
        "affected_shipments": len(affected_set),
        "critical_alerts": alert_counts.get("critical", 0) + cc_stats.get("critical", 0),
        "cold_chain_critical": cc_stats.get("critical", 0),
        "cold_chain_moderate": cc_stats.get("moderate", 0),
    }


def get_high_risk_shipments(user_id: str, limit: int = 5) -> list[dict]:
    """Retrieve top high-risk / delayed shipments."""
    ships = get_all_shipments_raw(user_id)
    delayed = [s for s in ships if s.get("status") == "delayed"]
    # Sort by value
    delayed.sort(key=lambda x: x.get("value_usd", 0), reverse=True)
    return [
        {
            "shipment_id": s.get("shipment_id"),
            "origin": s.get("origin"),
            "destination": s.get("destination"),
            "cargo_type": s.get("cargo_type"),
            "value_usd": s.get("value_usd"),
            "status": s.get("status"),
        }
        for s in delayed[:limit]
    ]
