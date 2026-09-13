"""
Bob — Stats API Routes
"""

from fastapi import APIRouter, Depends

from auth import get_current_user
from db.queries import (
    get_all_disruptions,
    get_all_shipments,
    get_cold_chain_stats,
)
from models import StatsResponse
from services.disruption_service import match_shipments

router = APIRouter(tags=["Stats"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(user_id: str = Depends(get_current_user)):
    """
    Get summary statistics for the dashboard top bar.
    All values are calculated dynamically from database state.
    """
    shipments = get_all_shipments(user_id)
    disruptions = get_all_disruptions(user_id)

    # Count disruption-affected shipments across all disruptions
    affected_ids: set[str] = set()
    for disruption in disruptions:
        for shipment in match_shipments(disruption, shipments):
            affected_ids.add(shipment.shipment_id)

    # Aggregated cold chain alerts from database
    cold_chain_counts = get_cold_chain_stats(user_id)
    critical_count = cold_chain_counts["critical"]
    moderate_count = cold_chain_counts["moderate"]

    return StatsResponse(
        total_shipments=len(shipments),
        disruption_affected=len(affected_ids),
        cold_chain_alerts={
            "critical": critical_count,
            "moderate": moderate_count,
            "total": critical_count + moderate_count,
        },
    )
