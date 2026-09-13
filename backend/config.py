"""
Bob — Backend Configuration
Loads environment variables using pydantic-settings.
"""

import os
from functools import lru_cache

from dotenv import load_dotenv

# Load .env and .env.local from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env.local"))


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        self.supabase_url: str = os.getenv("SUPABASE_URL", "")
        self.supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")

        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.groq_api_key: str = os.getenv("GROQ_API_KEY", "")

        self.frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

        # ── Weather API (OpenWeatherMap) ──────────────────────
        self.weather_api_key: str = os.getenv("WEATHER_API_KEY", "")
        self.weather_api_base_url: str = os.getenv(
            "WEATHER_API_BASE_URL",
            "https://api.openweathermap.org/data/2.5",
        )
        # Weather cache TTL in seconds (avoid repeated calls)
        self.weather_cache_ttl: int = int(os.getenv("WEATHER_CACHE_TTL", "300"))

    # ── Weather risk thresholds (km/h) ────────────────────────
    WEATHER_THRESHOLDS = {
        "wind_moderate": 30,    # km/h
        "wind_high": 50,        # km/h
        "wind_critical": 75,    # km/h
        "gust_moderate": 45,    # km/h
        "gust_high": 65,        # km/h
        "gust_critical": 90,    # km/h
        "precip_moderate": 40,  # probability %
        "precip_high": 70,      # probability %
    }

    # ── Speed modifiers per weather risk level ────────────────
    SPEED_MODIFIERS = {
        "normal": 1.0,
        "moderate": 0.85,
        "high": 0.70,
        "critical": 0.55,
    }

    # ── Simulation defaults ───────────────────────────────────
    SIMULATION_SPEED_MULTIPLIER = float(os.getenv("SIMULATION_SPEED_MULTIPLIER", "1.0"))


@lru_cache()
def get_settings() -> Settings:
    return Settings()
