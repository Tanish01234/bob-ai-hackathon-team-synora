"""
Bob — Database Queries
All Supabase queries parameterized by user_id for RLS compliance.
"""

import json
from db import get_supabase
from models import Shipment, Disruption, SensorLog, SensorReading, Coordinate, RouteSegment


# ── Shipments ─────────────────────────────────────────────────

def get_all_shipments(user_id: str) -> list[Shipment]:
    """Get all shipments for a user."""
    sb = get_supabase()
    result = sb.table("shipments").select("*").eq("user_id", user_id).execute()
    return [_row_to_shipment(row) for row in result.data]


def get_all_shipments_raw(user_id: str) -> list[dict]:
    """Get all shipments as raw dicts (for tracking/risk calculations)."""
    sb = get_supabase()
    result = sb.table("shipments").select("*").eq("user_id", user_id).execute()
    return result.data or []


def get_shipment_by_id(user_id: str, shipment_id: str) -> Shipment | None:
    """Get a single shipment by its display ID."""
    sb = get_supabase()
    result = (
        sb.table("shipments")
        .select("*")
        .eq("user_id", user_id)
        .eq("shipment_id", shipment_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_shipment(result.data[0])


def get_shipment_raw(user_id: str, shipment_id: str) -> dict | None:
    """Get a single shipment as raw dict (for tracking calculations)."""
    sb = get_supabase()
    result = (
        sb.table("shipments")
        .select("*")
        .eq("user_id", user_id)
        .eq("shipment_id", shipment_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


# ── Disruptions ───────────────────────────────────────────────

def get_all_disruptions(user_id: str) -> list[Disruption]:
    """Get all disruptions for a user."""
    sb = get_supabase()
    result = sb.table("disruptions").select("*").eq("user_id", user_id).execute()
    return [_row_to_disruption(row) for row in result.data]


def get_disruption_by_id(user_id: str, disruption_id: str) -> Disruption | None:
    """Get a single disruption by its display ID."""
    sb = get_supabase()
    result = (
        sb.table("disruptions")
        .select("*")
        .eq("user_id", user_id)
        .eq("disruption_id", disruption_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return _row_to_disruption(result.data[0])


# ── Sensor Logs & Readings ───────────────────────────────────

def get_sensor_log_for_shipment(user_id: str, shipment_id: str) -> SensorLog | None:
    """Get sensor log + readings for a shipment (by display shipment_id)."""
    sb = get_supabase()

    # First get the shipment's internal UUID
    ship_result = (
        sb.table("shipments")
        .select("id")
        .eq("user_id", user_id)
        .eq("shipment_id", shipment_id)
        .limit(1)
        .execute()
    )
    if not ship_result.data:
        return None

    ship_uuid = ship_result.data[0]["id"]

    # Get the sensor log
    log_result = (
        sb.table("sensor_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("shipment_id", ship_uuid)
        .limit(1)
        .execute()
    )
    if not log_result.data:
        return None

    log_row = log_result.data[0]

    # Get readings ordered by timestamp
    readings_result = (
        sb.table("sensor_readings")
        .select("*")
        .eq("sensor_log_id", log_row["id"])
        .order("timestamp")
        .execute()
    )

    readings = [
        SensorReading(
            timestamp=r["timestamp"],
            temp_c=float(r["temp_c"]),
            leg=r["leg"],
            in_range=r["in_range"],
        )
        for r in readings_result.data
    ]

    return SensorLog(
        shipment_id=shipment_id,
        cargo_type=log_row["cargo_type"],
        readings=readings,
    )


# ── Stats helpers ─────────────────────────────────────────────

def count_shipments(user_id: str) -> int:
    """Count total shipments for a user."""
    sb = get_supabase()
    result = sb.table("shipments").select("id", count="exact").eq("user_id", user_id).execute()
    return result.count or 0


def count_shipments_by_status(user_id: str) -> dict:
    """Count shipments grouped by status."""
    sb = get_supabase()
    result = sb.table("shipments").select("status").eq("user_id", user_id).execute()
    counts = {"in_transit": 0, "delayed": 0, "delivered": 0}
    for row in result.data or []:
        status = row.get("status", "in_transit")
        counts[status] = counts.get(status, 0) + 1
    return counts


def get_cold_chain_stats(user_id: str) -> dict:
    """Get aggregated cold chain alert counts for a user in an optimized query."""
    sb = get_supabase()
    logs_res = (
        sb.table("sensor_logs")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    if not logs_res.data:
        return {"critical": 0, "moderate": 0}

    log_ids = [row["id"] for row in logs_res.data]
    if not log_ids:
        return {"critical": 0, "moderate": 0}

    out_of_range_res = (
        sb.table("sensor_readings")
        .select("sensor_log_id")
        .in_("sensor_log_id", log_ids)
        .eq("in_range", False)
        .execute()
    )

    counts: dict[str, int] = {}
    for r in out_of_range_res.data:
        lid = r["sensor_log_id"]
        counts[lid] = counts.get(lid, 0) + 1

    critical_count = sum(1 for c in counts.values() if c > 2)
    moderate_count = sum(1 for c in counts.values() if 0 < c <= 2)

    return {"critical": critical_count, "moderate": moderate_count}


def get_alert_counts(user_id: str) -> dict:
    """Get alert counts by severity."""
    sb = get_supabase()
    try:
        result = sb.table("alerts").select("severity").eq("user_id", user_id).execute()
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for row in result.data or []:
            sev = row.get("severity", "medium")
            counts[sev] = counts.get(sev, 0) + 1
        return counts
    except Exception:
        return {"critical": 0, "high": 0, "medium": 0, "low": 0}


# ── Row mappers ───────────────────────────────────────────────

def _row_to_shipment(row: dict) -> Shipment:
    """Map a database row to a Shipment model."""
    waypoints = row.get("route_waypoints", [])
    if isinstance(waypoints, str):
        waypoints = json.loads(waypoints)

    # Parse route segments
    segments_raw = row.get("route_segments")
    route_segments = None
    if segments_raw:
        if isinstance(segments_raw, str):
            try:
                segments_raw = json.loads(segments_raw)
            except (json.JSONDecodeError, TypeError):
                segments_raw = []
        if isinstance(segments_raw, list):
            route_segments = []
            for seg in segments_raw:
                start_coord = seg.get("start_coordinate", {})
                end_coord = seg.get("end_coordinate", {})
                route_segments.append(RouteSegment(
                    from_waypoint=seg.get("from_waypoint", ""),
                    to_waypoint=seg.get("to_waypoint", ""),
                    distance_km=seg.get("distance_km", 0),
                    start_coordinate=Coordinate(
                        lat=start_coord.get("lat", 0),
                        lng=start_coord.get("lng", 0),
                    ),
                    end_coordinate=Coordinate(
                        lat=end_coord.get("lat", 0),
                        lng=end_coord.get("lng", 0),
                    ),
                ))

    return Shipment(
        shipment_id=row["shipment_id"],
        origin=row["origin"],
        destination=row["destination"],
        current_leg=row.get("current_leg", ""),
        route_waypoints=waypoints,
        carrier=row.get("carrier", ""),
        cargo_type=row["cargo_type"],
        eta=str(row.get("eta", "")),
        status=row["status"],
        value_usd=row.get("value_usd", 0),
        departure_time=str(row.get("departure_time", "")) if row.get("departure_time") else None,
        cruising_speed_knots=row.get("cruising_speed_knots"),
        route_segments=route_segments,
        total_distance_km=row.get("total_distance_km"),
    )


def _row_to_disruption(row: dict) -> Disruption:
    """Map a database row to a Disruption model."""
    return Disruption(
        disruption_id=row["disruption_id"],
        type=row["type"],
        location=row["location"],
        severity=row["severity"],
        start_date=str(row.get("start_date", "")),
        expected_duration_days=row.get("expected_duration_days", 1),
        description=row.get("description", ""),
        lat=row.get("lat"),
        lng=row.get("lng"),
        active=row.get("active", True),
    )
