"""
Bob — Shipment Transit Receipt API Route
Provides downloadable audit-grade PDF transit receipt for shipments.
"""

from fastapi import APIRouter, Depends, HTTPException, Response

from auth import get_current_user
from services.receipt_service import generate_transit_receipt_pdf

router = APIRouter(tags=["Receipts"])


@router.get("/shipments/{shipment_id}/transit-receipt")
async def get_transit_receipt(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Generate and stream an audit-grade PDF Transit & Cargo Receipt for a shipment.
    Includes telemetry, route progress, cold-chain analysis, weather, and AI provenance.
    """
    pdf_bytes = await generate_transit_receipt_pdf(user_id, shipment_id)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

    headers = {
        "Content-Disposition": f'attachment; filename="transit_receipt_{shipment_id}.pdf"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
