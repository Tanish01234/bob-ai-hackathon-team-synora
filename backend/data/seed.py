"""
Bob — Seed Script
Idempotent synthetic data generator for Supabase.
Generates 250 diverse shipments with routes, coordinates, speeds, and cold-chain data.

Usage:
    python -m data.seed --user-id <SUPABASE_USER_UUID>
"""

import argparse
import json
import random
import sys
from datetime import datetime, timedelta

from data.constants import (
    CARRIERS,
    CARGO_MIX,
    CARGO_VALUE_RANGES,
    COLD_CHAIN_TYPES,
    COORDINATES,
    DISRUPTIONS_SEED,
    ROUTES,
    SAFE_RANGES,
    SPEED_RANGES,
)
from db import get_supabase


def _build_route_segments(route: dict) -> list[dict]:
    """Build route segments with coordinates from the route definition."""
    segments = []
    for seg in route.get("segments", []):
        from_name = seg["from"]
        to_name = seg["to"]
        from_coord = COORDINATES.get(from_name, {"lat": 0, "lng": 0})
        to_coord = COORDINATES.get(to_name, {"lat": 0, "lng": 0})
        segments.append({
            "from_waypoint": from_name,
            "to_waypoint": to_name,
            "distance_km": seg["distance_km"],
            "start_coordinate": from_coord,
            "end_coordinate": to_coord,
        })
    return segments


def main():
    parser = argparse.ArgumentParser(description="Seed Bob demo data into Supabase")
    parser.add_argument("--user-id", required=True, help="Supabase user UUID to own the demo data")
    parser.add_argument("--count", type=int, default=250, help="Number of shipments to generate")
    parser.add_argument("--force", action="store_true", help="Delete existing data and re-seed")
    args = parser.parse_args()

    user_id = args.user_id
    count = args.count

    print(f"🌱 Seeding data for user: {user_id}")
    sb = get_supabase()

    # ── Idempotency check ─────────────────────────────────────
    existing = sb.table("shipments").select("id", count="exact").eq("user_id", user_id).execute()
    if existing.count and existing.count > 0:
        if args.force:
            print(f"🗑️  Force mode: deleting {existing.count} existing shipments...")
            sb.table("sensor_readings").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            sb.table("sensor_logs").delete().eq("user_id", user_id).execute()
            sb.table("shipments").delete().eq("user_id", user_id).execute()
            sb.table("disruptions").delete().eq("user_id", user_id).execute()
            # Clean up L2 tables
            try:
                sb.table("alerts").delete().eq("user_id", user_id).execute()
                sb.table("ai_assessments").delete().eq("user_id", user_id).execute()
                sb.table("weather_snapshots").delete().eq("user_id", user_id).execute()
                sb.table("risk_events").delete().eq("user_id", user_id).execute()
            except Exception:
                pass  # Tables may not exist yet
            print("  ✅ Existing data deleted.")
        else:
            print(f"⚠️  User already has {existing.count} shipments. Skipping seed to avoid duplicates.")
            print("   To re-seed, use --force flag or delete existing data first.")
            sys.exit(0)

    # ── Seed disruptions ──────────────────────────────────────
    print("📡 Seeding disruptions...")
    disruptions_data = []
    for d in DISRUPTIONS_SEED:
        disruptions_data.append({
            "user_id": user_id,
            "disruption_id": d["disruption_id"],
            "type": d["type"],
            "location": d["location"],
            "severity": d["severity"],
            "start_date": d["start_date"],
            "expected_duration_days": d["expected_duration_days"],
            "description": d["description"],
            "lat": d.get("lat"),
            "lng": d.get("lng"),
            "active": True,
        })
    sb.table("disruptions").insert(disruptions_data).execute()
    print(f"  ✅ {len(disruptions_data)} disruptions")

    # ── Seed simulation state ─────────────────────────────────
    print("⏱️  Seeding simulation state...")
    try:
        sim_check = sb.table("simulation_state").select("id", count="exact").execute()
        if not sim_check.count or sim_check.count == 0:
            sb.table("simulation_state").insert({
                "is_running": True,
                "speed_multiplier": 1.0,
                "base_time": datetime(2026, 9, 13, 8, 0, 0).isoformat() + "Z",
                "wall_time_at_base": datetime.utcnow().isoformat() + "Z",
            }).execute()
            print("  ✅ Simulation state initialized")
        else:
            print("  ⏭️  Simulation state already exists")
    except Exception as e:
        print(f"  ⚠️  Could not seed simulation state (table may not exist): {e}")

    # ── Seed shipments ────────────────────────────────────────
    print("🚢 Seeding shipments...")
    random.seed(42)  # Deterministic for reproducibility
    base_date = datetime(2026, 9, 13, 8, 0, 0)

    # Status distribution: 70% in_transit, 18% delayed, 12% delivered
    status_pool = ["in_transit"] * 70 + ["delayed"] * 18 + ["delivered"] * 12
    shipments_data = []

    for i in range(1, count + 1):
        route = random.choice(ROUTES)
        cargo = random.choice(CARGO_MIX)
        status = random.choice(status_pool)

        # Determine current leg based on status
        segments = route.get("segments", [])
        num_legs = len(segments)
        if status == "delivered":
            leg_index = num_legs - 1  # Last leg
        elif status == "delayed":
            leg_index = random.randint(0, max(0, num_legs - 1))
        else:
            leg_index = random.randint(0, max(0, num_legs - 1))

        current_seg = segments[leg_index] if segments else {}
        current_leg_name = f"{current_seg.get('from', 'Origin')}–{current_seg.get('to', 'Destination')}"

        # Departure time: stagger over past 1–14 days
        departure_offset_hours = random.randint(24, 14 * 24)
        departure_time = base_date - timedelta(hours=departure_offset_hours)

        # Vessel speed: randomize within realistic range
        cruising_speed = round(random.uniform(SPEED_RANGES["min_knots"], SPEED_RANGES["max_knots"]), 1)

        # Cargo value: based on cargo type ranges
        value_range = CARGO_VALUE_RANGES.get(cargo, (35_000, 500_000))
        value_usd = random.randint(value_range[0], value_range[1])
        # Round to nearest $5000 for realism
        value_usd = round(value_usd / 5000) * 5000

        # ETA: calculate from distance and speed
        total_dist = route.get("total_distance_km", 15000)
        speed_kmh = cruising_speed * 1.852
        travel_hours = total_dist / speed_kmh if speed_kmh > 0 else 500
        eta_dt = departure_time + timedelta(hours=travel_hours)
        eta = eta_dt.strftime("%Y-%m-%d")

        # Build route segments with coordinates
        route_segments = _build_route_segments(route)

        shipments_data.append({
            "user_id": user_id,
            "shipment_id": f"SHP-{1000 + i}",
            "origin": route["origin"],
            "destination": route["destination"],
            "current_leg": current_leg_name,
            "route_waypoints": json.dumps(route["waypoints"]),
            "carrier": random.choice(CARRIERS),
            "cargo_type": cargo,
            "eta": eta,
            "status": status,
            "value_usd": value_usd,
            "departure_time": departure_time.isoformat() + "Z",
            "cruising_speed_knots": cruising_speed,
            "route_segments": json.dumps(route_segments),
            "total_distance_km": total_dist,
            "route_id": route.get("id", ""),
        })

    # Insert in batches of 50 to avoid payload limits
    for batch_start in range(0, len(shipments_data), 50):
        batch = shipments_data[batch_start: batch_start + 50]
        sb.table("shipments").insert(batch).execute()
    print(f"  ✅ {len(shipments_data)} shipments")

    # ── Get inserted shipment UUIDs for sensor logs ───────────
    all_ships = sb.table("shipments").select(
        "id, shipment_id, cargo_type, origin, route_waypoints"
    ).eq("user_id", user_id).execute()
    ship_map = {row["shipment_id"]: row for row in all_ships.data}

    # ── Seed sensor logs & readings ───────────────────────────
    print("🌡️  Seeding sensor data...")
    cold_chain_ships = [
        row for row in all_ships.data
        if row["cargo_type"] in COLD_CHAIN_TYPES
    ]
    random.shuffle(cold_chain_ships)

    # Create a realistic mix of excursion scenarios
    num_critical = min(8, len(cold_chain_ships))
    num_moderate = min(12, len(cold_chain_ships) - num_critical)
    critical_ships = set(s["shipment_id"] for s in cold_chain_ships[:num_critical])
    moderate_ships = set(s["shipment_id"] for s in cold_chain_ships[num_critical:num_critical + num_moderate])

    sensor_count = 0
    reading_count = 0

    for ship_row in cold_chain_ships:
        cargo_type = ship_row["cargo_type"]
        safe = SAFE_RANGES[cargo_type]
        ship_uuid = ship_row["id"]
        ship_sid = ship_row["shipment_id"]

        # Parse waypoints for leg names
        waypoints_raw = ship_row.get("route_waypoints", "[]")
        if isinstance(waypoints_raw, str):
            waypoints = json.loads(waypoints_raw)
        else:
            waypoints = waypoints_raw or []

        legs = []
        for j in range(len(waypoints) - 1):
            legs.append(f"{waypoints[j]}–{waypoints[j + 1]}")
        if not legs:
            legs = ["Leg-1", "Leg-2"]

        # Insert sensor log
        log_result = sb.table("sensor_logs").insert({
            "user_id": user_id,
            "shipment_id": ship_uuid,
            "cargo_type": cargo_type,
        }).execute()
        log_id = log_result.data[0]["id"]
        sensor_count += 1

        # Generate 24 hourly readings
        base_time = datetime(2026, 9, 13, 0, 0, 0)
        readings_batch = []

        for hour in range(24):
            timestamp = (base_time + timedelta(hours=hour)).isoformat() + "Z"
            leg = legs[min(hour // max(1, 24 // len(legs)), len(legs) - 1)]

            if ship_sid in critical_ships and 10 <= hour <= 16:
                temp = _breached_temp(safe, severity="high")
            elif ship_sid in moderate_ships and 10 <= hour <= 11:
                temp = _breached_temp(safe, severity="medium")
            else:
                temp = _normal_temp(safe)

            in_range = _is_in_range(temp, safe)
            readings_batch.append({
                "sensor_log_id": log_id,
                "timestamp": timestamp,
                "temp_c": round(temp, 1),
                "leg": leg,
                "in_range": in_range,
            })

        sb.table("sensor_readings").insert(readings_batch).execute()
        reading_count += len(readings_batch)

    print(f"  ✅ {sensor_count} sensor logs, {reading_count} readings")
    print(f"  📊 {len(critical_ships)} critical excursions, {len(moderate_ships)} moderate excursions")
    print(f"\n🎉 Seed complete! {count} shipments, {len(disruptions_data)} disruptions, {sensor_count} sensor logs.")


# ── Temperature helpers ───────────────────────────────────────

def _normal_temp(safe: dict) -> float:
    if safe["min"] is None:
        return random.uniform(-22.0, -19.0)
    mid = (safe["min"] + safe["max"]) / 2
    spread = (safe["max"] - safe["min"]) * 0.3
    return random.uniform(mid - spread, mid + spread)


def _breached_temp(safe: dict, severity: str) -> float:
    breach = random.uniform(2.0, 5.0) if severity == "high" else random.uniform(0.5, 2.0)
    if safe["min"] is None:
        return (safe["max"] or -18.0) + breach
    return safe["max"] + breach


def _is_in_range(temp: float, safe: dict) -> bool:
    if safe["min"] is not None and temp < safe["min"]:
        return False
    if safe["max"] is not None and temp > safe["max"]:
        return False
    return True


if __name__ == "__main__":
    main()
