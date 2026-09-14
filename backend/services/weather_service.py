"""
Bob — Weather Service
Real external weather API integration using OpenWeatherMap.

Fetches weather at the shipment's current simulated coordinates.
Never uses AI for weather data — always real API.
"""

import asyncio
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from config import get_settings
from models import WeatherResponse


# ── In-memory cache (coordinate-rounded, TTL-based) ──────────
_weather_cache: dict[str, tuple[float, WeatherResponse]] = {}
_inflight_weather: dict[str, asyncio.Task] = {}
_http_client: Optional[httpx.AsyncClient] = None


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=4.0)
    return _http_client


def _cache_key(lat: float, lng: float) -> str:
    """Round coordinates to 1 decimal for cache grouping (approx 11km resolution)."""
    return f"{round(lat, 1)}:{round(lng, 1)}"


def get_cached_weather(lat: float, lng: float) -> Optional[WeatherResponse]:
    """
    Synchronous fast check of in-memory weather cache (<0.01ms).
    Returns cached weather if present (even slightly stale), or None.
    Allows tracking/risk endpoints to remain non-blocking.
    """
    key = _cache_key(lat, lng)
    if key in _weather_cache:
        cached_time, cached_response = _weather_cache[key]
        settings = get_settings()
        if time.time() - cached_time < settings.weather_cache_ttl:
            return cached_response
        return cached_response  # Stale cached data preferred over blocking
    return None


async def get_weather_at_position(lat: float, lng: float) -> WeatherResponse:
    """
    Fetch current weather at the given coordinates using OpenWeatherMap API.

    Uses caching and in-flight deduplication to avoid excessive or concurrent duplicate calls.
    Falls back gracefully if API is unavailable.
    """
    settings = get_settings()

    # Check cache
    key = _cache_key(lat, lng)
    if key in _weather_cache:
        cached_time, cached_response = _weather_cache[key]
        if time.time() - cached_time < settings.weather_cache_ttl:
            return cached_response

    # Deduplicate in-flight requests for identical coordinates
    if key in _inflight_weather:
        try:
            return await _inflight_weather[key]
        except Exception:
            pass

    async def _execute_fetch() -> WeatherResponse:
        try:
            weather = await _fetch_openweathermap(lat, lng, settings)
            _weather_cache[key] = (time.time(), weather)
            return weather
        except Exception as e:
            print(f"⚠️  Weather API failed for ({lat}, {lng}): {e}")

            # Return cached data if available (even if stale)
            if key in _weather_cache:
                _, stale = _weather_cache[key]
                return stale

            # Return unknown weather as fallback
            return WeatherResponse(
                latitude=lat,
                longitude=lng,
                temperature_c=0,
                wind_speed_kmh=0,
                wind_gust_kmh=0,
                precipitation_probability=0,
                precipitation_mm=0,
                condition="unknown",
                severity="normal",
                humidity=0,
                visibility_km=0,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )

    task = asyncio.create_task(_execute_fetch())
    _inflight_weather[key] = task
    try:
        return await task
    finally:
        _inflight_weather.pop(key, None)


async def _fetch_openweathermap(lat: float, lng: float, settings) -> WeatherResponse:
    """
    Call OpenWeatherMap Current Weather API.

    Endpoint: /weather?lat={lat}&lon={lng}&appid={key}&units=metric
    """
    if not settings.weather_api_key:
        raise ValueError("WEATHER_API_KEY not configured")

    base_url = settings.weather_api_base_url.rstrip("/")
    url = f"{base_url}/weather"
    params = {
        "lat": lat,
        "lon": lng,
        "appid": settings.weather_api_key,
        "units": "metric",  # Celsius, m/s
    }

    client = await _get_http_client()
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    # Parse OpenWeatherMap response
    main = data.get("main", {})
    wind = data.get("wind", {})
    weather_arr = data.get("weather", [{}])
    weather_desc = weather_arr[0] if weather_arr else {}
    rain = data.get("rain", {})
    clouds = data.get("clouds", {})
    visibility = data.get("visibility", 10000)  # meters

    # Convert wind speed from m/s to km/h
    wind_speed_ms = wind.get("speed", 0)
    wind_gust_ms = wind.get("gust", wind_speed_ms)
    wind_speed_kmh = wind_speed_ms * 3.6
    wind_gust_kmh = wind_gust_ms * 3.6

    # Map condition
    condition_id = weather_desc.get("id", 800)
    condition_main = weather_desc.get("main", "Clear").lower()
    condition = _map_condition(condition_id, condition_main)

    # Precipitation (rain volume in last 1h or 3h)
    precip_mm = rain.get("1h", rain.get("3h", 0))
    # Estimate precipitation probability from cloud cover and conditions
    cloud_pct = clouds.get("all", 0)
    precip_prob = min(100, cloud_pct + (30 if precip_mm > 0 else 0))

    # Determine severity using deterministic thresholds
    severity = _classify_weather_severity(wind_speed_kmh, wind_gust_kmh, precip_prob, precip_mm)

    return WeatherResponse(
        latitude=round(lat, 4),
        longitude=round(lng, 4),
        temperature_c=round(main.get("temp", 0), 1),
        wind_speed_kmh=round(wind_speed_kmh, 1),
        wind_gust_kmh=round(wind_gust_kmh, 1),
        precipitation_probability=round(precip_prob, 0),
        precipitation_mm=round(precip_mm, 1),
        condition=condition,
        severity=severity,
        humidity=main.get("humidity", 0),
        visibility_km=round(visibility / 1000, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _map_condition(condition_id: int, condition_main: str) -> str:
    """Map OpenWeatherMap condition codes to simplified categories."""
    if condition_id >= 200 and condition_id < 300:
        return "thunderstorm"
    elif condition_id >= 300 and condition_id < 400:
        return "drizzle"
    elif condition_id >= 500 and condition_id < 600:
        if condition_id >= 502:
            return "heavy_rain"
        return "rain"
    elif condition_id >= 600 and condition_id < 700:
        return "snow"
    elif condition_id >= 700 and condition_id < 800:
        if condition_id == 781:
            return "tornado"
        elif condition_id in (711, 721, 741):
            return "fog"
        return "haze"
    elif condition_id == 800:
        return "clear"
    elif condition_id > 800:
        return "cloudy"
    return condition_main


def _classify_weather_severity(
    wind_kmh: float,
    gust_kmh: float,
    precip_prob: float,
    precip_mm: float,
) -> str:
    """
    Deterministic weather severity classification.
    Rules detect severity — AI does NOT determine this.
    """
    settings = get_settings()
    thresholds = settings.WEATHER_THRESHOLDS

    # Critical conditions
    if (
        wind_kmh >= thresholds["wind_critical"]
        or gust_kmh >= thresholds["gust_critical"]
    ):
        return "critical"

    # High conditions
    if (
        wind_kmh >= thresholds["wind_high"]
        or gust_kmh >= thresholds["gust_high"]
        or (wind_kmh >= thresholds["wind_moderate"] and precip_prob >= thresholds["precip_high"])
    ):
        return "high"

    # Moderate conditions
    if (
        wind_kmh >= thresholds["wind_moderate"]
        or gust_kmh >= thresholds["gust_moderate"]
        or precip_prob >= thresholds["precip_moderate"]
        or precip_mm >= 5.0
    ):
        return "moderate"

    return "normal"


def get_speed_modifier(severity: str) -> float:
    """
    Get speed modifier based on weather severity.
    Deterministic — no AI involved.
    """
    settings = get_settings()
    return settings.SPEED_MODIFIERS.get(severity, 1.0)


def clear_weather_cache():
    """Clear the in-memory weather cache."""
    global _weather_cache
    _weather_cache = {}
