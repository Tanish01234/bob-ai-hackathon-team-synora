"""
Bob — Simulation Service
Manages the simulation clock and calculates vessel positions.

The simulation clock runs at a configurable speed multiplier:
  - 1x  = real-time
  - 10x = 10 seconds = 100 simulated seconds
  - etc.

Position is calculated deterministically from:
  simulation_time + departure_time + route_segments + vessel_speed
"""

import json
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from db import get_supabase
from data.constants import COORDINATES


# ── Simulation Clock ─────────────────────────────────────────

_simulation_state_cache: Optional[tuple[float, dict]] = None
SIMULATION_STATE_TTL = 5.0  # seconds


def invalidate_simulation_cache() -> None:
    """Invalidate cached simulation state."""
    global _simulation_state_cache
    _simulation_state_cache = None


def get_simulation_state() -> dict:
    """
    Read the current simulation state from the database (cached for 5s).
    Returns dict with is_running, speed_multiplier, current simulation time.
    """
    global _simulation_state_cache
    now_ts = time.time()
    if _simulation_state_cache is not None:
        cached_ts, cached_row = _simulation_state_cache
        if now_ts - cached_ts < SIMULATION_STATE_TTL:
            sim_time = _calculate_sim_time(cached_row)
            return {
                "id": cached_row["id"],
                "is_running": cached_row.get("is_running", True),
                "speed_multiplier": cached_row.get("speed_multiplier", 1.0),
                "current_time": sim_time.isoformat(),
                "base_time": cached_row.get("base_time"),
                "wall_time_at_base": cached_row.get("wall_time_at_base"),
                "paused_at": cached_row.get("paused_at"),
            }

    sb = get_supabase()
    try:
        result = sb.table("simulation_state").select("*").limit(1).execute()
        if result.data:
            row = result.data[0]
            _simulation_state_cache = (now_ts, row)
            sim_time = _calculate_sim_time(row)
            return {
                "id": row["id"],
                "is_running": row.get("is_running", True),
                "speed_multiplier": row.get("speed_multiplier", 1.0),
                "current_time": sim_time.isoformat(),
                "base_time": row.get("base_time"),
                "wall_time_at_base": row.get("wall_time_at_base"),
                "paused_at": row.get("paused_at"),
            }
    except Exception as e:
        print(f"⚠️  Could not read simulation state: {e}")

    # Fallback: return real time at 1x
    return {
        "id": None,
        "is_running": True,
        "speed_multiplier": 1.0,
        "current_time": datetime.now(timezone.utc).isoformat(),
        "base_time": None,
        "wall_time_at_base": None,
        "paused_at": None,
    }


def get_simulation_time() -> datetime:
    """Get the current simulation time as a datetime object."""
    state = get_simulation_state()
    time_str = state["current_time"]
    if isinstance(time_str, str):
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    return datetime.now(timezone.utc)


def _calculate_sim_time(row: dict) -> datetime:
    """
    Calculate the current simulation time from the database state.

    sim_time = base_time + (wall_now - wall_time_at_base) * speed_multiplier

    If paused, sim_time = base_time + (paused_at - wall_time_at_base) * speed_multiplier
    """
    base_time_str = row.get("base_time")
    wall_at_base_str = row.get("wall_time_at_base")
    speed = row.get("speed_multiplier", 1.0)
    is_running = row.get("is_running", True)
    paused_at_str = row.get("paused_at")

    if not base_time_str or not wall_at_base_str:
        return datetime.now(timezone.utc)

    base_time = _parse_dt(base_time_str)
    wall_at_base = _parse_dt(wall_at_base_str)

    if is_running:
        wall_now = datetime.now(timezone.utc)
    else:
        # If paused, use paused_at as the "current" wall time
        wall_now = _parse_dt(paused_at_str) if paused_at_str else datetime.now(timezone.utc)

    elapsed_real = (wall_now - wall_at_base).total_seconds()
    elapsed_sim = elapsed_real * speed

    return base_time + timedelta(seconds=elapsed_sim)


def pause_simulation() -> dict:
    """Pause the simulation clock."""
    sb = get_supabase()
    state = get_simulation_state()
    if not state["is_running"]:
        return state  # Already paused

    sim_time = get_simulation_time()
    now = datetime.now(timezone.utc)

    sb.table("simulation_state").update({
        "is_running": False,
        "paused_at": now.isoformat(),
        "base_time": sim_time.isoformat(),
        "wall_time_at_base": now.isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", state["id"]).execute()

    invalidate_simulation_cache()
    return get_simulation_state()


def resume_simulation() -> dict:
    """Resume the simulation clock from where it was paused."""
    sb = get_supabase()
    state = get_simulation_state()
    if state["is_running"]:
        return state  # Already running

    sim_time = get_simulation_time()
    now = datetime.now(timezone.utc)

    sb.table("simulation_state").update({
        "is_running": True,
        "paused_at": None,
        "base_time": sim_time.isoformat(),
        "wall_time_at_base": now.isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", state["id"]).execute()

    invalidate_simulation_cache()
    return get_simulation_state()


def set_simulation_speed(multiplier: float) -> dict:
    """Set simulation speed multiplier. Anchors current sim time."""
    sb = get_supabase()
    state = get_simulation_state()
    sim_time = get_simulation_time()
    now = datetime.now(timezone.utc)

    sb.table("simulation_state").update({
        "speed_multiplier": multiplier,
        "base_time": sim_time.isoformat(),
        "wall_time_at_base": now.isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", state["id"]).execute()

    invalidate_simulation_cache()
    return get_simulation_state()


def reset_simulation() -> dict:
    """Reset simulation to initial state."""
    sb = get_supabase()
    state = get_simulation_state()
    now = datetime.now(timezone.utc)
    # Reset to Sep 13, 2026 08:00 UTC
    base = datetime(2026, 9, 13, 8, 0, 0, tzinfo=timezone.utc)

    sb.table("simulation_state").update({
        "is_running": True,
        "speed_multiplier": 1.0,
        "base_time": base.isoformat(),
        "wall_time_at_base": now.isoformat(),
        "paused_at": None,
        "updated_at": now.isoformat(),
    }).eq("id", state["id"]).execute()

    invalidate_simulation_cache()
    return get_simulation_state()


# ── Position Calculation ─────────────────────────────────────

def calculate_position(
    departure_time: str,
    route_segments: list[dict],
    total_distance_km: float,
    cruising_speed_knots: float,
    speed_modifier: float = 1.0,
    sim_time: Optional[datetime] = None,
) -> dict:
    """
    Calculate the current position of a vessel given the simulation time.

    Returns dict with:
      current_lat, current_lng, current_leg, current_region,
      distance_travelled_km, distance_remaining_km, progress_percent,
      current_speed_knots, effective_speed_kmh
    """
    if sim_time is None:
        sim_time = get_simulation_time()

    if isinstance(route_segments, str):
        try:
            route_segments = json.loads(route_segments)
        except Exception:
            route_segments = []
    if isinstance(route_segments, list):
        parsed_segs = []
        for s in route_segments:
            if isinstance(s, str):
                try:
                    parsed_segs.append(json.loads(s))
                except Exception:
                    continue
            elif isinstance(s, dict):
                parsed_segs.append(s)
        route_segments = parsed_segs
    else:
        route_segments = []

    departure = _parse_dt(departure_time)

    # Elapsed time in hours
    elapsed_seconds = max(0, (sim_time - departure).total_seconds())
    elapsed_hours = elapsed_seconds / 3600.0

    # Effective speed
    effective_speed_knots = cruising_speed_knots * speed_modifier
    effective_speed_kmh = effective_speed_knots * 1.852

    # Distance travelled
    distance_travelled = effective_speed_kmh * elapsed_hours
    distance_travelled = min(distance_travelled, total_distance_km)

    # Distance remaining
    distance_remaining = max(0, total_distance_km - distance_travelled)

    # Progress
    progress = (distance_travelled / total_distance_km * 100) if total_distance_km > 0 else 0
    progress = min(100.0, progress)

    # Find current segment
    current_lat = 0.0
    current_lng = 0.0
    current_leg = ""
    current_region = ""

    if not route_segments:
        return {
            "current_lat": current_lat,
            "current_lng": current_lng,
            "current_leg": current_leg,
            "current_region": current_region,
            "distance_travelled_km": round(distance_travelled, 1),
            "distance_remaining_km": round(distance_remaining, 1),
            "progress_percent": round(progress, 1),
            "current_speed_knots": round(effective_speed_knots, 1),
            "effective_speed_kmh": round(effective_speed_kmh, 1),
            "elapsed_hours": round(elapsed_hours, 1),
        }

    accumulated = 0.0
    for seg in route_segments:
        seg_dist = seg.get("distance_km", 0)
        seg_start = accumulated
        seg_end = accumulated + seg_dist

        if distance_travelled <= seg_end or seg == route_segments[-1]:
            # We're in this segment
            current_leg = f"{seg.get('from_waypoint', '')}–{seg.get('to_waypoint', '')}"
            current_region = _get_region_name(seg, distance_travelled - seg_start, seg_dist)

            # Interpolate position
            frac = (distance_travelled - seg_start) / seg_dist if seg_dist > 0 else 0
            frac = max(0, min(1, frac))

            start_coord = seg.get("start_coordinate", {})
            end_coord = seg.get("end_coordinate", {})
            s_lat = start_coord.get("lat", 0)
            s_lng = start_coord.get("lng", 0)
            e_lat = end_coord.get("lat", 0)
            e_lng = end_coord.get("lng", 0)

            current_lat = s_lat + (e_lat - s_lat) * frac
            current_lng = s_lng + (e_lng - s_lng) * frac
            break

        accumulated += seg_dist

    return {
        "current_lat": round(current_lat, 4),
        "current_lng": round(current_lng, 4),
        "current_leg": current_leg,
        "current_region": current_region,
        "distance_travelled_km": round(distance_travelled, 1),
        "distance_remaining_km": round(distance_remaining, 1),
        "progress_percent": round(progress, 1),
        "current_speed_knots": round(effective_speed_knots, 1),
        "effective_speed_kmh": round(effective_speed_kmh, 1),
        "elapsed_hours": round(elapsed_hours, 1),
    }


def calculate_eta(
    distance_remaining_km: float,
    effective_speed_kmh: float,
    sim_time: Optional[datetime] = None,
) -> dict:
    """Calculate ETA from remaining distance and effective speed."""
    if sim_time is None:
        sim_time = get_simulation_time()

    if effective_speed_kmh <= 0:
        return {
            "eta": "Unknown",
            "eta_hours": None,
            "eta_delay_hours": None,
        }

    remaining_hours = distance_remaining_km / effective_speed_kmh
    eta = sim_time + timedelta(hours=remaining_hours)

    return {
        "eta": eta.isoformat(),
        "eta_hours": round(remaining_hours, 1),
    }


# ── Helpers ──────────────────────────────────────────────────

def _parse_dt(dt_str) -> datetime:
    """Parse a datetime string to a timezone-aware datetime."""
    if isinstance(dt_str, datetime):
        if dt_str.tzinfo is None:
            return dt_str.replace(tzinfo=timezone.utc)
        return dt_str
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def _get_region_name(segment: dict, dist_into_seg: float, seg_dist: float) -> str:
    """Determine a human-readable region name from segment context."""
    from_wp = segment.get("from_waypoint", "")
    to_wp = segment.get("to_waypoint", "")

    # If midway, return a sea/ocean region name if we know one
    frac = dist_into_seg / seg_dist if seg_dist > 0 else 0

    if frac < 0.15:
        return f"Near {from_wp}"
    elif frac > 0.85:
        return f"Approaching {to_wp}"
    else:
        # Check if segment passes through known water bodies
        water_bodies = [
            "Arabian Sea", "Indian Ocean", "Pacific Ocean", "North Atlantic",
            "South Atlantic", "Mediterranean", "Red Sea", "North Sea",
            "Bay of Bengal", "South China Sea", "East China Sea",
        ]
        for body in water_bodies:
            if body.lower() in from_wp.lower() or body.lower() in to_wp.lower():
                return body
        return f"{from_wp}–{to_wp} corridor"
