"""
Bob — Route Service
Alternative route evaluation for at-risk shipments.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from data.constants import ALTERNATIVE_ROUTES, COORDINATES, KNOT_TO_KMH
from models import AlternativeRoute
from services.simulation_service import get_simulation_time


def evaluate_alternative_routes(
    shipment_id: str,
    origin: str,
    destination: str,
    current_distance_remaining_km: float,
    total_distance_km: float,
    cruising_speed_knots: float,
    route_waypoints: list[str],
    disruption_locations: list[str] = None,
    weather_severity: str = "normal",
    sim_time: Optional[datetime] = None,
) -> list[AlternativeRoute]:
    """
    Generate and evaluate candidate alternative routes for an at-risk shipment.

    For the prototype, candidate routes are synthetic based on templates.
    The engine calculates distance/ETA/risk for each.
    """
    if sim_time is None:
        sim_time = get_simulation_time()
    if disruption_locations is None:
        disruption_locations = []

    alternatives = []
    speed_kmh = cruising_speed_knots * KNOT_TO_KMH
    wp_lower = [w.lower() for w in route_waypoints]

    # Check which alternative templates apply
    for alt_id, alt_template in ALTERNATIVE_ROUTES.items():
        applies = False

        if alt_id == "suez_to_cape":
            # Applies when Suez Canal or Red Sea is on route and disrupted
            if any("suez" in w for w in wp_lower) or any("red sea" in w for w in wp_lower):
                if any("suez" in d.lower() or "red sea" in d.lower() for d in disruption_locations):
                    applies = True
                elif weather_severity in ("high", "critical"):
                    applies = True

        elif alt_id == "panama_alt":
            if any("panama" in w for w in wp_lower):
                if any("panama" in d.lower() for d in disruption_locations):
                    applies = True

        elif alt_id == "colombo_bypass":
            if any("singapore" in w for w in wp_lower):
                if any("singapore" in d.lower() for d in disruption_locations):
                    applies = True

        elif alt_id == "antwerp_diversion":
            if "rotterdam" in destination.lower():
                if any("rotterdam" in d.lower() for d in disruption_locations):
                    applies = True

        elif alt_id == "bremerhaven_diversion":
            if "hamburg" in destination.lower():
                if any("hamburg" in d.lower() for d in disruption_locations):
                    applies = True

        elif alt_id == "long_beach_diversion":
            if "los angeles" in destination.lower():
                if any("los angeles" in d.lower() for d in disruption_locations):
                    applies = True

        if not applies:
            continue

        # Calculate alternative route metrics
        alt_distance = current_distance_remaining_km + alt_template["extra_distance_km"]
        travel_hours = alt_distance / speed_kmh if speed_kmh > 0 else 999
        alt_eta = sim_time + timedelta(hours=travel_hours)

        # Assess risk for alternative (lower than original since it avoids disruption)
        if alt_template["extra_distance_km"] > 5000:
            risk_level = "medium"
            weather_exposure = "Extended open-ocean transit increases weather exposure"
        elif alt_template["extra_distance_km"] > 500:
            risk_level = "low"
            weather_exposure = "Moderate deviation from original route"
        else:
            risk_level = "low"
            weather_exposure = "Minimal route change"

        disruption_exposure = "Avoids active disruption zone"

        alternatives.append(AlternativeRoute(
            route_id=alt_id.upper(),
            name=alt_template["name"],
            description=alt_template["description"],
            distance_km=round(alt_distance, 0),
            estimated_duration_days=round(travel_hours / 24, 1),
            estimated_eta=alt_eta.strftime("%Y-%m-%d"),
            risk_level=risk_level,
            weather_exposure=weather_exposure,
            disruption_exposure=disruption_exposure,
        ))

    # Always include a "maintain current route" option for comparison
    if alternatives:
        current_hours = current_distance_remaining_km / speed_kmh if speed_kmh > 0 else 999
        current_eta = sim_time + timedelta(hours=current_hours)
        alternatives.insert(0, AlternativeRoute(
            route_id="CURRENT",
            name="Current Route",
            description="Maintain current route and schedule",
            distance_km=round(current_distance_remaining_km, 0),
            estimated_duration_days=round(current_hours / 24, 1),
            estimated_eta=current_eta.strftime("%Y-%m-%d"),
            risk_level="high",
            weather_exposure="Passes through active risk zone",
            disruption_exposure="Exposed to active disruption",
        ))

    return alternatives
