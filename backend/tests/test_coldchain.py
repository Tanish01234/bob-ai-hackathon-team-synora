import pytest
from models import SensorLog, SensorReading
from services.coldchain_service import detect_excursion, get_safe_range


def test_coldchain_normal_in_range():
    log = SensorLog(
        shipment_id="SH-COLD-01",
        cargo_type="vaccine",
        readings=[
            SensorReading(timestamp="2026-03-01T10:00:00Z", temp_c=4.0, leg="Leg 1", in_range=True),
            SensorReading(timestamp="2026-03-01T11:00:00Z", temp_c=5.2, leg="Leg 1", in_range=True),
            SensorReading(timestamp="2026-03-01T12:00:00Z", temp_c=4.8, leg="Leg 1", in_range=True),
        ],
    )
    result = detect_excursion(log)
    assert result["status"] == "normal"
    assert result["details"] is None


def test_coldchain_moderate_excursion():
    # 2 readings breached -> <= 2 hours -> moderate
    log = SensorLog(
        shipment_id="SH-COLD-02",
        cargo_type="vaccine",
        readings=[
            SensorReading(timestamp="2026-03-01T10:00:00Z", temp_c=4.0, leg="Leg 1", in_range=True),
            SensorReading(timestamp="2026-03-01T11:00:00Z", temp_c=9.1, leg="Leg 1", in_range=False),
            SensorReading(timestamp="2026-03-01T12:00:00Z", temp_c=8.7, leg="Leg 1", in_range=False),
            SensorReading(timestamp="2026-03-01T13:00:00Z", temp_c=5.0, leg="Leg 1", in_range=True),
        ],
    )
    result = detect_excursion(log)
    assert result["status"] == "moderate"
    assert result["details"] is not None
    assert result["details"].max_breach_temp == 9.1
    assert result["details"].breach_duration_hours == 2


def test_coldchain_critical_excursion():
    # 3 readings breached -> > 2 hours -> critical
    log = SensorLog(
        shipment_id="SH-COLD-03",
        cargo_type="frozen_goods",
        readings=[
            SensorReading(timestamp="2026-03-01T10:00:00Z", temp_c=-20.0, leg="Ocean", in_range=True),
            SensorReading(timestamp="2026-03-01T11:00:00Z", temp_c=-15.0, leg="Port Transfer", in_range=False),
            SensorReading(timestamp="2026-03-01T12:00:00Z", temp_c=-14.2, leg="Port Transfer", in_range=False),
            SensorReading(timestamp="2026-03-01T13:00:00Z", temp_c=-13.8, leg="Port Transfer", in_range=False),
        ],
    )
    result = detect_excursion(log)
    assert result["status"] == "critical"
    assert result["details"] is not None
    assert result["details"].max_breach_temp == -13.8
    assert result["details"].breach_duration_hours == 3


def test_safe_ranges():
    assert get_safe_range("vaccine") == {"min": 2.0, "max": 8.0}
    assert get_safe_range("frozen_goods") == {"min": None, "max": -18.0}
    assert get_safe_range("perishable") == {"min": 0.0, "max": 4.0}
    assert get_safe_range("electronics") == {}


def test_coldchain_single_spike_not_excursion():
    # Single isolated out-of-range reading is not an excursion
    log = SensorLog(
        shipment_id="SH-COLD-04",
        cargo_type="vaccine",
        readings=[
            SensorReading(timestamp="2026-03-01T10:00:00Z", temp_c=4.0, leg="Leg 1", in_range=True),
            SensorReading(timestamp="2026-03-01T11:00:00Z", temp_c=9.5, leg="Leg 1", in_range=False),
            SensorReading(timestamp="2026-03-01T12:00:00Z", temp_c=4.2, leg="Leg 1", in_range=True),
        ],
    )
    result = detect_excursion(log)
    assert result["status"] == "normal"
    assert result["details"] is None
