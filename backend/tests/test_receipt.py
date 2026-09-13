"""
Unit tests for Transit Receipt PDF generation.
"""

import pytest
from services.receipt_service import generate_transit_receipt_pdf


@pytest.mark.asyncio
async def test_generate_transit_receipt_valid():
    # User ID from seeded DB
    user_id = "fe19ebd4-24f2-40f8-9250-9c49cc3331c2"
    pdf_bytes = await generate_transit_receipt_pdf(user_id, "SHP-1001")
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_generate_transit_receipt_missing():
    user_id = "fe19ebd4-24f2-40f8-9250-9c49cc3331c2"
    pdf_bytes = await generate_transit_receipt_pdf(user_id, "SHP-NONEXISTENT")
    assert pdf_bytes is None
