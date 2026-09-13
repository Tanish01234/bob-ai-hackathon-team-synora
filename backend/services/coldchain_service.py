"""
Bob — Cold Chain Service
Rule-based excursion detection — NO AI.
"""

from datetime import datetime
from typing import Optional
from models import SensorLog, SensorReading, ExcursionDetails

SAFE_RANGES: dict[str, dict] = {
    "vaccine":      {"min": 2.0,  "max": 8.0},
    "frozen_goods": {"min": None, "max": -18.0},
    "perishable":   {"min": 0.0,  "max": 4.0},
}


def get_safe_range(cargo_type: str) -> dict:
    """Get the safe temperature range for a cargo type."""
    return SAFE_RANGES.get(cargo_type, {})


def detect_excursion(log: SensorLog) -> dict:
    """
    Deterministic rule-based excursion detection.
    NO AI is used here.

    Rules:
      - Continuous out-of-range readings form an excursion period.
      - A single isolated out-of-range reading is not classified as an excursion.
      - Out-of-range duration <= 2 hours -> moderate
      - Out-of-range duration > 2 hours -> critical
      - All readings in range -> normal

    Returns:
      {"status": "normal"|"moderate"|"critical", "details": ExcursionDetails|None}
    """
    safe = SAFE_RANGES.get(log.cargo_type)
    if not safe:
        return {"status": "normal", "details": None}

    # Group contiguous breached readings into continuous periods
    periods: list[list[SensorReading]] = []
    current_period: list[SensorReading] = []

    for reading in log.readings:
        breached = False
        if safe.get("min") is not None and reading.temp_c < safe["min"]:
            breached = True
        if safe.get("max") is not None and reading.temp_c > safe["max"]:
            breached = True

        if breached:
            current_period.append(reading)
        else:
            if current_period:
                periods.append(current_period)
                current_period = []
    if current_period:
        periods.append(current_period)

    # Filter out single isolated readings (require at least 2 consecutive out-of-range readings)
    valid_periods = [p for p in periods if len(p) >= 2]

    if not valid_periods:
        return {"status": "normal", "details": None}

    # Identify the most severe / longest excursion period
    longest_period = max(valid_periods, key=lambda p: len(p))

    start_str = longest_period[0].timestamp
    end_str = longest_period[-1].timestamp

    # Determine duration from actual timestamps where possible
    duration_hours = float(len(longest_period))
    try:
        t0 = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        diff_hours = (t1 - t0).total_seconds() / 3600.0
        # If hourly discrete timestamps (e.g. 10:00 to 11:00 = 1h elapsed between 2 points),
        # duration covering both hours is max(diff_hours, len(longest_period))
        duration_hours = max(diff_hours, float(len(longest_period)))
    except Exception:
        duration_hours = float(len(longest_period))

    severity = "critical" if duration_hours > 2.0 else "moderate"

    max_temp = max(r.temp_c for r in longest_period)
    min_temp = min(r.temp_c for r in longest_period)

    details = ExcursionDetails(
        max_breach_temp=round(max_temp, 1),
        min_breach_temp=round(min_temp, 1),
        breach_duration_hours=round(duration_hours, 1),
        abnormal_readings_count=len(longest_period),
        leg=longest_period[0].leg,
        started_at=start_str,
        ended_at=end_str,
    )

    return {"status": severity, "details": details}
