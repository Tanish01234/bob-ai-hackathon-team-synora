import pytest
from pydantic import ValidationError
from models import (
    Shipment,
    Disruption,
    SensorReading,
    AIRecommendation,
    StatsResponse,
)


def test_valid_shipment():
    s = Shipment(
        shipment_id="SH-001",
        origin="Shanghai",
        destination="Rotterdam",
        current_leg="Malacca Strait",
        route_waypoints=["Shanghai", "Singapore", "Suez", "Rotterdam"],
        carrier="Maersk",
        cargo_type="electronics",
        eta="2026-03-25",
        status="in_transit",
        value_usd=120000,
    )
    assert s.shipment_id == "SH-001"
    assert s.cargo_type == "electronics"


def test_invalid_cargo_type():
    with pytest.raises(ValidationError):
        Shipment(
            shipment_id="SH-002",
            origin="A",
            destination="B",
            current_leg="Leg",
            route_waypoints=["A", "B"],
            carrier="Carrier",
            cargo_type="invalid_cargo",  # type: ignore
            eta="2026-03-25",
            status="in_transit",
            value_usd=1000,
        )


def test_ai_recommendation():
    rec = AIRecommendation(
        estimated_delay_days=4,
        risk_level="high",
        recommended_action="reroute",
        justification="Port congestion causing severe delays.",
        ai_provider="gemini",
    )
    assert rec.risk_level == "high"
    assert rec.recommended_action == "reroute"
