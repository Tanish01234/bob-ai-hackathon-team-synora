"""
Bob — Weather API Routes
Real external weather data at shipment's current position.
"""

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from db.queries import get_shipment_raw
from models import WeatherResponse
from services.tracking_service import get_shipment_tracking
from services.weather_service import get_weather_at_position

router = APIRouter(tags=["Weather"])


@router.get("/shipments/{shipment_id}/weather", response_model=WeatherResponse)
async def get_shipment_weather(shipment_id: str, user_id: str = Depends(get_current_user)):
    """
    Get real weather at the shipment's current simulated position.
    Uses OpenWeatherMap API with the shipment's current lat/lng from simulation.
    """
    shipment = get_shipment_raw(user_id, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Get current simulated position
    tracking = get_shipment_tracking(shipment)
    lat = tracking.current_position.lat
    lng = tracking.current_position.lng

    if lat == 0 and lng == 0:
        raise HTTPException(
            status_code=422,
            detail="Unable to determine shipment position for weather lookup"
        )

    # Fetch real weather
    weather = await get_weather_at_position(lat, lng)
    return weather
