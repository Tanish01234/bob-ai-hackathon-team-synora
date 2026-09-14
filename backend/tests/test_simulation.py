"""Tests for simulation service (clock, position interpolation, ETA)."""
import pytest
from datetime import datetime, timezone, timedelta
from services.simulation_service import (
    get_simulation_state,
    get_simulation_time,
    set_simulation_speed,
    pause_simulation,
    resume_simulation,
    reset_simulation,
    calculate_position,
    calculate_eta,
)


def test_simulation_clock_controls():
    # Verify reading simulation state and time
    state = get_simulation_state()
    assert "is_running" in state
    assert "speed_multiplier" in state
    assert "current_time" in state

    sim_time = get_simulation_time()
    assert isinstance(sim_time, datetime)


def test_calculate_position_departure():
    now = datetime.now(timezone.utc)
    segments = [
        {
            "from_waypoint": "Port A",
            "start_coordinate": {"lat": 10.0, "lng": 100.0},
            "to_waypoint": "Port B",
            "end_coordinate": {"lat": 20.0, "lng": 110.0},
            "distance_km": 1500.0,
        }
    ]
    pos = calculate_position(
        departure_time=now.isoformat(),
        route_segments=segments,
        total_distance_km=1500.0,
        cruising_speed_knots=20.0,
        speed_modifier=1.0,
        sim_time=now,
    )
    assert pos["progress_percent"] == 0.0
    assert pos["current_lat"] == 10.0
    assert pos["current_lng"] == 100.0
    assert pos["distance_travelled_km"] == 0.0
    assert pos["distance_remaining_km"] == 1500.0


def test_calculate_position_completed():
    now = datetime.now(timezone.utc)
    # Departed 100 hours ago for a short 100km route
    dep = now - timedelta(hours=100)
    segments = [
        {
            "from_waypoint": "Port A",
            "start_coordinate": {"lat": 10.0, "lng": 100.0},
            "to_waypoint": "Port B",
            "end_coordinate": {"lat": 20.0, "lng": 110.0},
            "distance_km": 100.0,
        }
    ]
    pos = calculate_position(
        departure_time=dep.isoformat(),
        route_segments=segments,
        total_distance_km=100.0,
        cruising_speed_knots=20.0,
        speed_modifier=1.0,
        sim_time=now,
    )
    assert pos["progress_percent"] == 100.0
    assert pos["current_lat"] == 20.0
    assert pos["current_lng"] == 110.0
    assert pos["distance_travelled_km"] == 100.0
    assert pos["distance_remaining_km"] == 0.0


def test_calculate_position_midway():
    now = datetime.now(timezone.utc)
    # Total distance: 1000 km. Speed: 20 knots * 1.852 = 37.04 km/h.
    # 500 km takes 500 / 37.04 = 13.4989 hours
    dep = now - timedelta(hours=13.4989)
    segments = [
        {
            "from_waypoint": "Port A",
            "start_coordinate": {"lat": 0.0, "lng": 0.0},
            "to_waypoint": "Port B",
            "end_coordinate": {"lat": 10.0, "lng": 0.0},
            "distance_km": 1000.0,
        }
    ]
    pos = calculate_position(
        departure_time=dep.isoformat(),
        route_segments=segments,
        total_distance_km=1000.0,
        cruising_speed_knots=20.0,
        speed_modifier=1.0,
        sim_time=now,
    )
    assert 48.0 < pos["progress_percent"] < 52.0
    assert 4.8 < pos["current_lat"] < 5.2
    assert pos["current_lng"] == 0.0


def test_calculate_eta():
    now = datetime.now(timezone.utc)
    # 370.4 km at 37.04 km/h takes 10 hours
    eta_res = calculate_eta(distance_remaining_km=370.4, effective_speed_kmh=37.04, sim_time=now)
    assert eta_res["eta_hours"] == 10.0
    assert eta_res["eta"] is not None


def test_fleet_tracking_batch():
    from unittest.mock import patch
    from main import app
    from auth import get_current_user
    from fastapi.testclient import TestClient

    app.dependency_overrides[get_current_user] = lambda: "fe19ebd4-24f2-40f8-9250-9c49cc3331c2"
    client = TestClient(app)

    mock_shipment = {
        "shipment_id": "SHP-1001",
        "origin": "Singapore (SGSIN)",
        "destination": "Rotterdam (NLRTM)",
        "carrier": "Maersk",
        "cargo_type": "standard",
        "value_usd": 125000,
        "total_distance_km": 15000,
        "cruising_speed_knots": 18.0,
        "departure_time": "2026-03-01T00:00:00Z",
        "eta": "2026-03-25T12:00:00Z",
        "status": "in_transit",
        "current_leg": "Malacca Strait",
        "route_waypoints": ["Singapore", "Malacca Strait", "Rotterdam"],
        "route_segments": [
            {
                "from_waypoint": "Singapore",
                "to_waypoint": "Malacca Strait",
                "end_coordinate": {"lat": 4.21, "lng": 100.55},
                "distance_km": 500,
            },
            {
                "from_waypoint": "Malacca Strait",
                "to_waypoint": "Rotterdam",
                "end_coordinate": {"lat": 51.95, "lng": 4.14},
                "distance_km": 14500,
            },
        ],
    }

    try:
        with patch("db.queries.get_all_shipments_raw", return_value=[mock_shipment]), \
             patch("db.queries.get_all_disruptions", return_value=[]):
            resp = client.get("/fleet/tracking")
            assert resp.status_code == 200
            data = resp.json()
            assert isinstance(data, list)
            assert len(data) > 0
            first = data[0]
            assert "shipment_id" in first
            assert "latitude" in first
            assert "longitude" in first
            assert "current_speed_knots" in first
            assert "progress_percent" in first
            assert "risk" in first
    finally:
        app.dependency_overrides.pop(get_current_user, None)


