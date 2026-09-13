"""
Bob — Tracking Service
Composes simulation position, speed, weather modifiers, and ETA into a unified tracking response.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from models import TrackingResponse, Coordinate
from services.simulation_service import (
    calculate_position,
    calculate_eta,
    get_simulation_time,
    _parse_dt,
)


KNOT_TO_KMH = 1.852


def get_shipment_tracking(
    shipment: dict,
    weather_modifier: float = 1.0,
    sim_time: Optional[datetime] = None,
) -> TrackingResponse:
    """
    Calculate full tracking state for a shipment.

    Args:
        shipment: dict with shipment data (from DB row or model)
        weather_modifier: speed modifier from weather risk (1.0 = no impact)
        sim_time: optional override for simulation time

    Returns:
        TrackingResponse with all tracking fields
    """
    if sim_time is None:
        sim_time = get_simulation_time()

    # Extract shipment data
    shipment_id = shipment.get("shipment_id", "")
    departure_time = shipment.get("departure_time", "")
    cruising_speed = shipment.get("cruising_speed_knots", 18.0)
    total_distance = shipment.get("total_distance_km", 0)

    # Parse route segments
    segments_raw = shipment.get("route_segments", "[]")
    if isinstance(segments_raw, str):
        try:
            route_segments = json.loads(segments_raw)
        except (json.JSONDecodeError, TypeError):
            route_segments = []
    else:
        route_segments = segments_raw or []

    # Calculate position
    position = calculate_position(
        departure_time=departure_time,
        route_segments=route_segments,
        total_distance_km=total_distance,
        cruising_speed_knots=cruising_speed,
        speed_modifier=weather_modifier,
        sim_time=sim_time,
    )

    # Calculate ETAs
    effective_speed_kmh = position["effective_speed_kmh"]
    normal_speed_kmh = cruising_speed * KNOT_TO_KMH

    # Current ETA (with weather modifier)
    current_eta_data = calculate_eta(
        distance_remaining_km=position["distance_remaining_km"],
        effective_speed_kmh=effective_speed_kmh,
        sim_time=sim_time,
    )

    # Original ETA (without any modifiers)
    original_eta_data = calculate_eta(
        distance_remaining_km=position["distance_remaining_km"],
        effective_speed_kmh=normal_speed_kmh,
        sim_time=sim_time,
    )

    # Calculate delay
    eta_delay_hours = None
    if current_eta_data.get("eta_hours") and original_eta_data.get("eta_hours"):
        eta_delay_hours = current_eta_data["eta_hours"] - original_eta_data["eta_hours"]
        if eta_delay_hours < 0:
            eta_delay_hours = 0

    # Use the original ETA from shipment data or calculate it
    original_eta_str = shipment.get("eta", "")
    if not original_eta_str and departure_time:
        from datetime import timedelta
        dep = _parse_dt(departure_time)
        travel_hours = total_distance / normal_speed_kmh if normal_speed_kmh > 0 else 0
        original_eta_str = (dep + timedelta(hours=travel_hours)).isoformat()

    return TrackingResponse(
        shipment_id=shipment_id,
        simulation_time=sim_time.isoformat(),
        current_position=Coordinate(
            lat=position["current_lat"],
            lng=position["current_lng"],
        ),
        current_region=position["current_region"],
        current_leg=position["current_leg"],
        current_speed_knots=position["current_speed_knots"],
        normal_speed_knots=cruising_speed,
        distance_travelled_km=position["distance_travelled_km"],
        distance_remaining_km=position["distance_remaining_km"],
        progress_percent=position["progress_percent"],
        original_eta=original_eta_str,
        current_eta=current_eta_data.get("eta", ""),
        eta_delay_hours=eta_delay_hours,
        weather_speed_modifier=weather_modifier,
    )
