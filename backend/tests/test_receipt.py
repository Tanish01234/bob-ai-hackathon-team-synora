"""
Unit tests for Transit Receipt PDF generation.
Deterministic isolation using mocks for shipment telemetry and weather.
"""

import pytest
from unittest.mock import patch, AsyncMock
from models import WeatherResponse
from services.receipt_service import generate_transit_receipt_pdf

SAMPLE_SHIPMENT = {
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

MOCK_WEATHER = WeatherResponse(
    latitude=4.21,
    longitude=100.55,
    temperature_c=24.5,
    wind_speed_kmh=15.0,
    condition="Clear",
    severity="normal",
    timestamp="2026-03-14T12:00:00Z",
)


@pytest.mark.asyncio
async def test_generate_transit_receipt_valid():
    user_id = "00000000-0000-0000-0000-000000000001"
    with patch("services.receipt_service.get_shipment_raw", return_value=SAMPLE_SHIPMENT), \
         patch("services.receipt_service.get_weather_at_position", new_callable=AsyncMock, return_value=MOCK_WEATHER), \
         patch("services.receipt_service.get_sensor_log_for_shipment", return_value=None), \
         patch("services.receipt_service.get_all_disruptions", return_value=[]):
        pdf_bytes = await generate_transit_receipt_pdf(user_id, "SHP-1001")
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_generate_transit_receipt_missing():
    user_id = "00000000-0000-0000-0000-000000000001"
    with patch("services.receipt_service.get_shipment_raw", return_value=None):
        pdf_bytes = await generate_transit_receipt_pdf(user_id, "SHP-NONEXISTENT")
        assert pdf_bytes is None
