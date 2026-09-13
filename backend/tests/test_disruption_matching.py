import pytest
from models import Disruption, Shipment
from services.disruption_service import match_shipments


def test_match_shipments_by_waypoint():
    disruption = Disruption(
        disruption_id="DIS-001",
        type="port_strike",
        location="Rotterdam",
        severity="high",
        start_date="2026-03-01",
        expected_duration_days=5,
        description="Port strike at Rotterdam",
    )

    shipment1 = Shipment(
        shipment_id="SH-001",
        origin="Shanghai",
        destination="Hamburg",
        current_leg="Singapore to Suez",
        route_waypoints=["Shanghai", "Singapore", "Rotterdam", "Hamburg"],
        carrier="Maersk",
        cargo_type="electronics",
        eta="2026-03-10",
        status="in_transit",
        value_usd=150000,
    )

    shipment2 = Shipment(
        shipment_id="SH-002",
        origin="Yokohama",
        destination="Los Angeles",
        current_leg="Transpacific",
        route_waypoints=["Yokohama", "Los Angeles"],
        carrier="ONE",
        cargo_type="perishable",
        eta="2026-03-08",
        status="in_transit",
        value_usd=45000,
    )

    affected = match_shipments(disruption, [shipment1, shipment2])
    assert len(affected) == 1
    assert affected[0].shipment_id == "SH-001"


def test_match_shipments_by_current_leg():
    disruption = Disruption(
        disruption_id="DIS-002",
        type="geopolitical_crisis",
        location="Red Sea",
        severity="high",
        start_date="2026-03-02",
        expected_duration_days=14,
        description="Red Sea tensions",
    )

    shipment = Shipment(
        shipment_id="SH-003",
        origin="Mumbai",
        destination="Rotterdam",
        current_leg="Red Sea Transit",
        route_waypoints=["Mumbai", "Jeddah", "Suez", "Rotterdam"],
        carrier="MSC",
        cargo_type="standard",
        eta="2026-03-15",
        status="in_transit",
        value_usd=80000,
    )

    affected = match_shipments(disruption, [shipment])
    assert len(affected) == 1
    assert affected[0].shipment_id == "SH-003"


def test_match_shipments_no_match():
    disruption = Disruption(
        disruption_id="DIS-003",
        type="weather_event",
        location="Panama Canal",
        severity="medium",
        start_date="2026-03-01",
        expected_duration_days=3,
        description="Drought restrictions",
    )

    shipment = Shipment(
        shipment_id="SH-004",
        origin="Shenzhen",
        destination="Felixstowe",
        current_leg="Malacca Strait",
        route_waypoints=["Shenzhen", "Singapore", "Suez", "Felixstowe"],
        carrier="Evergreen",
        cargo_type="electronics",
        eta="2026-03-20",
        status="in_transit",
        value_usd=200000,
    )

    affected = match_shipments(disruption, [shipment])
    assert len(affected) == 0
