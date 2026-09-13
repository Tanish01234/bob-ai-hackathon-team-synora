"""Tests for weather classification, risk engine, and alert engine."""
import pytest
from services.weather_service import _classify_weather_severity, get_speed_modifier
from services.risk_service import calculate_risk
from services.alert_service import check_and_generate_alerts


def test_classify_weather_severity():
    # Normal conditions: wind 15 km/h, gust 20, precip_prob 10, precip_mm 0
    sev_normal = _classify_weather_severity(wind_kmh=15, gust_kmh=20, precip_prob=10, precip_mm=0)
    assert sev_normal == "normal"

    # Moderate conditions: wind 45 or moderate precip
    sev_mod = _classify_weather_severity(wind_kmh=45, gust_kmh=50, precip_prob=30, precip_mm=2.0)
    assert sev_mod == "moderate"

    # High conditions: wind 65 km/h
    sev_high = _classify_weather_severity(wind_kmh=65, gust_kmh=75, precip_prob=50, precip_mm=5.0)
    assert sev_high == "high"

    # Critical conditions: wind > 85 km/h
    sev_crit = _classify_weather_severity(wind_kmh=90, gust_kmh=110, precip_prob=90, precip_mm=25.0)
    assert sev_crit == "critical"


def test_weather_speed_modifier():
    assert get_speed_modifier("normal") == 1.0
    assert get_speed_modifier("moderate") == 0.85
    assert get_speed_modifier("high") == 0.70
    assert get_speed_modifier("critical") == 0.55


def test_calculate_risk_low():
    risk = calculate_risk(
        shipment_id="ship-test-1",
        cargo_type="Electronics",
        cargo_value_usd=50000,
        weather_severity="normal",
        disruption_severity="normal",
        cold_chain_status="normal",
        eta_delay_hours=0.0,
    )
    assert risk.overall_risk in ["low", "normal"]
    assert risk.signals.weather == "normal"


def test_calculate_risk_critical():
    risk = calculate_risk(
        shipment_id="ship-test-2",
        cargo_type="Pharmaceuticals",
        cargo_value_usd=2500000,
        weather_severity="critical",
        disruption_severity="high",
        cold_chain_status="critical",
        eta_delay_hours=48.0,
    )
    assert risk.overall_risk == "critical"
    assert len(risk.reasons) >= 3


def test_check_and_generate_alerts_returns_list():
    alerts = check_and_generate_alerts(
        user_id="00000000-0000-0000-0000-000000000000",
        shipment_id="ship-test-3",
        weather_severity="normal",
        disruption_severity="normal",
        cold_chain_status="normal",
    )
    assert isinstance(alerts, list)
    assert len(alerts) == 0
