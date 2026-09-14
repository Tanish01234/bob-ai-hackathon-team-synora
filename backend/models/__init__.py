"""
Bob — Pydantic Schemas
Data models matching the documented API contract.
"""

from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime


# ── Core domain models ────────────────────────────────────────

class Coordinate(BaseModel):
    lat: float
    lng: float


class RouteSegment(BaseModel):
    from_waypoint: str
    to_waypoint: str
    distance_km: float
    start_coordinate: Coordinate
    end_coordinate: Coordinate


class Shipment(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    current_leg: str
    route_waypoints: List[str]
    carrier: str
    cargo_type: Literal["electronics", "vaccine", "frozen_goods", "perishable", "standard"]
    eta: str
    status: Literal["in_transit", "delayed", "delivered"]
    value_usd: int
    # ── L2 tracking fields ────────────────────────────────
    departure_time: Optional[str] = None
    cruising_speed_knots: Optional[float] = None
    route_segments: Optional[List[RouteSegment]] = None
    total_distance_km: Optional[float] = None


class Disruption(BaseModel):
    disruption_id: str
    type: Literal["port_strike", "weather_event", "geopolitical_crisis"]
    location: str
    severity: Literal["low", "medium", "high"]
    start_date: str
    expected_duration_days: int
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    active: Optional[bool] = True


class SensorReading(BaseModel):
    timestamp: str
    temp_c: float
    leg: str
    in_range: bool


class SensorLog(BaseModel):
    shipment_id: str
    cargo_type: str
    readings: List[SensorReading]


# ── Tracking models ──────────────────────────────────────────

class TrackingResponse(BaseModel):
    shipment_id: str
    simulation_time: str
    current_position: Coordinate
    current_region: str
    current_leg: str
    current_speed_knots: float
    normal_speed_knots: float
    distance_travelled_km: float
    distance_remaining_km: float
    progress_percent: float
    original_eta: str
    current_eta: str
    eta_delay_hours: Optional[float] = None
    weather_speed_modifier: Optional[float] = 1.0


# ── Weather models ───────────────────────────────────────────

class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    temperature_c: float
    wind_speed_kmh: float
    wind_gust_kmh: Optional[float] = None
    precipitation_probability: Optional[float] = None
    precipitation_mm: Optional[float] = None
    condition: str
    severity: Literal["normal", "moderate", "high", "critical"]
    humidity: Optional[float] = None
    visibility_km: Optional[float] = None
    timestamp: str


# ── Risk models ──────────────────────────────────────────────

class RiskSignals(BaseModel):
    weather: Literal["normal", "moderate", "high", "critical"] = "normal"
    disruption: Literal["normal", "low", "medium", "high"] = "normal"
    cold_chain: Literal["normal", "moderate", "critical"] = "normal"
    delay: Literal["normal", "low", "medium", "high"] = "normal"


class RiskResponse(BaseModel):
    shipment_id: str
    overall_risk: Literal["normal", "low", "medium", "high", "critical"]
    signals: RiskSignals
    reasons: List[str]
    cargo_value_usd: Optional[int] = None
    cargo_sensitivity: Optional[str] = None


# ── Alternative route models ─────────────────────────────────

class AlternativeRoute(BaseModel):
    route_id: str
    name: str
    description: str
    distance_km: float
    estimated_duration_days: float
    estimated_eta: str
    risk_level: Literal["low", "medium", "high"]
    weather_exposure: Optional[str] = None
    disruption_exposure: Optional[str] = None


# ── Alert models ─────────────────────────────────────────────

class Alert(BaseModel):
    alert_id: str
    shipment_id: str
    type: Literal["weather", "disruption", "cold_chain", "delay", "risk_change"]
    severity: Literal["low", "medium", "high", "critical"]
    title: str
    message: str
    recommended_action: Optional[str] = None
    created_at: str
    acknowledged: Optional[bool] = False


# ── AI response models ───────────────────────────────────────

class AIRecommendation(BaseModel):
    estimated_delay_days: int
    risk_level: Literal["low", "medium", "high"]
    recommended_action: Literal["reroute", "hold", "alternate_carrier", "monitor", "quarantine_and_review"]
    justification: str
    ai_provider: Literal["gemini", "groq"]


class AIShipmentAnalysis(BaseModel):
    risk_level: Literal["low", "medium", "high", "critical"]
    estimated_delay_days: Optional[int] = None
    recommended_action: Literal["reroute", "hold", "alternate_carrier", "monitor", "quarantine_and_review"]
    recommended_route_id: Optional[str] = None
    justification: str
    summary: str
    ai_provider: Literal["gemini", "groq"]


class ExcursionDetails(BaseModel):
    max_breach_temp: float
    min_breach_temp: Optional[float] = None
    breach_duration_hours: float
    abnormal_readings_count: Optional[int] = None
    leg: str
    started_at: str
    ended_at: str


class AIExplanation(BaseModel):
    summary: str
    severity_classification: Literal["critical", "moderate"]
    regulatory_note: str
    ai_provider: Literal["gemini", "groq"]


# ── Simulation state ────────────────────────────────────────

class SimulationState(BaseModel):
    is_running: bool = True
    speed_multiplier: float = 1.0
    current_time: Optional[str] = None
    started_at: Optional[str] = None
    paused_at: Optional[str] = None


# ── API response models ──────────────────────────────────────

class AffectedShipment(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    current_leg: str
    route_waypoints: List[str]
    carrier: str
    cargo_type: str
    value_usd: int
    status: str
    ai_recommendation: Optional[AIRecommendation] = None


class DisruptionMatchResponse(BaseModel):
    disruption_id: str
    affected_count: int
    affected_shipments: List[AffectedShipment]
    total_affected: Optional[int] = None
    disruption: Optional[Disruption] = None


class SensorCheckResponse(BaseModel):
    shipment_id: str
    cargo_type: str
    safe_range: dict
    excursion_status: Literal["normal", "moderate", "critical"]
    excursion_details: Optional[ExcursionDetails] = None
    ai_explanation: Optional[AIExplanation] = None
    readings: List[SensorReading]


class StatsResponse(BaseModel):
    total_shipments: int
    in_transit: Optional[int] = None
    delayed: Optional[int] = None
    delivered: Optional[int] = None
    at_risk: Optional[int] = None
    active_disruptions: Optional[int] = None
    disruption_affected: int
    weather_alerts: Optional[int] = None
    cold_chain_alerts: dict
    critical_alerts: Optional[int] = None


class DashboardSummary(BaseModel):
    total_shipments: int
    in_transit: int
    delayed: int
    delivered: int
    at_risk: int
    active_disruptions: int = 0
    affected_shipments: int = 0
    disruption_alerts: int
    weather_alerts: int
    cold_chain_alerts: int
    critical_alerts: int


# ── Admin models ─────────────────────────────────────────────

class ShipmentCreate(BaseModel):
    origin: str
    destination: str
    carrier: str
    cargo_type: Literal["electronics", "vaccine", "frozen_goods", "perishable", "standard"]
    value_usd: int
    status: Literal["in_transit", "delayed", "delivered"] = "in_transit"


class ShipmentUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    carrier: Optional[str] = None
    cargo_type: Optional[str] = None
    value_usd: Optional[int] = None
    status: Optional[str] = None


class DisruptionCreate(BaseModel):
    type: Literal["port_strike", "weather_event", "geopolitical_crisis"]
    location: str
    severity: Literal["low", "medium", "high"]
    expected_duration_days: int
    description: str


class DisruptionUpdate(BaseModel):
    type: Optional[str] = None
    location: Optional[str] = None
    severity: Optional[str] = None
    expected_duration_days: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class SimulationSpeedRequest(BaseModel):
    speed_multiplier: float


class DemoEventRequest(BaseModel):
    shipment_id: Optional[str] = None
    event_type: Optional[Literal["severe_weather", "port_strike", "cold_chain_excursion"]] = "port_strike"
    severity: Optional[Literal["medium", "high", "critical"]] = "high"
