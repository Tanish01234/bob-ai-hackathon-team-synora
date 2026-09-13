"""
Bob — Disruption Matching Service
Deterministic matching — NO AI.
"""

from models import Disruption, Shipment


def match_shipments(disruption: Disruption, shipments: list[Shipment]) -> list[Shipment]:
    """
    Match disruption location against shipment routes deterministically.

    Checks if disruption.location (or primary location name) appears in:
      - any route waypoint
      - current leg
      - destination

    Returns list of affected shipments without duplicates.
    """
    affected = []
    full_loc = disruption.location.strip().lower()
    # Also extract primary place name (e.g. "Rotterdam" from "Rotterdam, NL")
    primary_loc = full_loc.split(",")[0].strip()

    for shipment in shipments:
        waypoints_lower = [w.lower() for w in shipment.route_waypoints]
        current_leg_lower = shipment.current_leg.lower()
        destination_lower = shipment.destination.lower()

        matched = False
        for loc in (full_loc, primary_loc):
            if not loc:
                continue
            if (
                any(loc in w or w in loc for w in waypoints_lower)
                or loc in current_leg_lower
                or loc in destination_lower
            ):
                matched = True
                break

        if matched:
            affected.append(shipment)

    return affected
