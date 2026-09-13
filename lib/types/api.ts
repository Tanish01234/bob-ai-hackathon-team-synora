/**
 * Backend API response types (snake_case matching FastAPI schemas)
 */

export type CargoType = "electronics" | "vaccine" | "frozen_goods" | "perishable" | "standard";
export type DisruptionType = "port_strike" | "weather_event" | "geopolitical_crisis";
export type SeverityLevel = "low" | "medium" | "high";
export type RiskLevel = "normal" | "low" | "medium" | "high" | "critical";
export type ShipmentStatus = "in_transit" | "delayed" | "delivered";
export type RecommendedAction = "reroute" | "hold" | "alternate_carrier" | "monitor" | "quarantine_and_review";
export type AIProvider = "gemini" | "groq";
export type ExcursionStatus = "normal" | "moderate" | "critical";

export interface ApiShipment {
  shipment_id: string;
  origin: string;
  destination: string;
  current_leg: string;
  route_waypoints: string[];
  carrier: string;
  cargo_type: CargoType;
  eta: string;
  status: ShipmentStatus;
  value_usd: number;
  departure_time?: string;
  cruising_speed_knots?: number;
  total_distance_km?: number;
}

export interface ApiDisruption {
  disruption_id: string;
  type: DisruptionType;
  location: string;
  severity: SeverityLevel;
  start_date: string;
  expected_duration_days: number;
  description: string;
  lat?: number;
  lng?: number;
  active?: boolean;
}

export interface ApiAIRecommendation {
  estimated_delay_days: number;
  risk_level: SeverityLevel;
  recommended_action: RecommendedAction;
  justification: string;
  ai_provider: AIProvider;
}

export interface ApiAffectedShipment {
  shipment_id: string;
  origin: string;
  destination: string;
  current_leg: string;
  route_waypoints: string[];
  carrier: string;
  cargo_type: string;
  value_usd: number;
  status: string;
  ai_recommendation?: ApiAIRecommendation | null;
}

export interface ApiDisruptionMatchResponse {
  disruption_id: string;
  affected_count: number;
  affected_shipments: ApiAffectedShipment[];
}

export interface ApiSensorReading {
  timestamp: string;
  temp_c: number;
  leg: string;
  in_range: boolean;
}

export interface ApiExcursionDetails {
  max_breach_temp: number;
  breach_duration_hours: number;
  leg: string;
  started_at: string;
  ended_at: string;
}

export interface ApiAIExplanation {
  summary: string;
  severity_classification: "critical" | "moderate";
  regulatory_note: string;
  ai_provider: AIProvider;
}

export interface ApiSensorCheckResponse {
  shipment_id: string;
  cargo_type: string;
  safe_range: {
    min?: number | null;
    max?: number | null;
  };
  excursion_status: ExcursionStatus;
  excursion_details?: ApiExcursionDetails | null;
  ai_explanation?: ApiAIExplanation | null;
  readings: ApiSensorReading[];
}

export interface ApiStatsResponse {
  total_shipments: number;
  disruption_affected: number;
  cold_chain_alerts: {
    critical: number;
    moderate: number;
  };
}

// ── L2 Tracking ──────────────────────────────────────────────

export interface ApiCoordinate {
  lat: number;
  lng: number;
}

export interface ApiRouteSegment {
  from_waypoint: string;
  to_waypoint: string;
  distance_km: number;
  start_coordinate?: ApiCoordinate;
  end_coordinate?: ApiCoordinate;
}

export interface ApiTrackingResponse {
  shipment_id: string;
  simulation_time: string;
  current_position: ApiCoordinate;
  current_region: string;
  current_leg: string;
  current_speed_knots: number;
  normal_speed_knots: number;
  distance_travelled_km: number;
  distance_remaining_km: number;
  progress_percent: number;
  original_eta: string;
  current_eta: string;
  eta_delay_hours?: number | null;
  weather_speed_modifier?: number;
  route_segments?: ApiRouteSegment[];
}

export type RouteSegment = ApiRouteSegment;
export type TrackingResponse = ApiTrackingResponse;

// ── L2 Weather ───────────────────────────────────────────────

export interface ApiWeatherResponse {
  latitude: number;
  longitude: number;
  temperature_c: number;
  wind_speed_kmh: number;
  wind_gust_kmh?: number;
  precipitation_probability?: number;
  precipitation_mm?: number;
  condition: string;
  severity: "normal" | "moderate" | "high" | "critical";
  humidity?: number;
  visibility_km?: number;
  timestamp: string;
}

// ── L2 Risk ──────────────────────────────────────────────────

export interface ApiRiskSignals {
  weather: string;
  disruption: string;
  cold_chain: string;
  delay: string;
}

export interface ApiRiskResponse {
  shipment_id: string;
  overall_risk: RiskLevel;
  signals: ApiRiskSignals;
  reasons: string[];
  cargo_value_usd?: number;
  cargo_sensitivity?: string;
}

// ── L2 Alerts ────────────────────────────────────────────────

export interface ApiAlert {
  alert_id?: string;
  shipment_id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  recommended_action?: string;
  created_at: string;
  acknowledged?: boolean;
}

// ── L2 AI Analysis ──────────────────────────────────────────

export interface ApiAlternativeRoute {
  route_id: string;
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_days: number;
  estimated_eta: string;
  risk_level: string;
  weather_exposure?: string;
  disruption_exposure?: string;
  waypoints?: ApiCoordinate[];
}

export type AlternativeRoute = ApiAlternativeRoute;

export interface ApiAIAnalysisResponse {
  shipment_id: string;
  analysis: {
    risk_level: string;
    estimated_delay_days?: number;
    recommended_action: string;
    recommended_route_id?: string;
    justification: string;
    summary: string;
    ai_provider: string;
  };
  context_summary: {
    weather: string;
    disruption: string;
    cold_chain: string;
    progress: number;
  };
  alternative_routes: ApiAlternativeRoute[];
  ai_error?: string;
}

// ── L2 Dashboard Summary ────────────────────────────────────

export interface ApiDashboardSummary {
  total_shipments: number;
  in_transit: number;
  delayed: number;
  delivered: number;
  at_risk: number;
  disruption_alerts: number;
  weather_alerts: number;
  cold_chain_alerts: number;
  critical_alerts: number;
}

// ── L2 Simulation ────────────────────────────────────────────

export interface ApiSimulationState {
  id?: string;
  is_running: boolean;
  speed_multiplier: number;
  current_time: string;
  base_time?: string;
  paused_at?: string;
}

// ── Ocean Digital Twin Fleet Telemetry ──────────────────────

export interface ApiFleetVessel {
  shipment_id: string;
  origin: string;
  destination: string;
  carrier: string;
  cargo_type: CargoType;
  status: ShipmentStatus;
  value_usd: number;
  latitude: number;
  longitude: number;
  current_speed_knots: number;
  normal_speed_knots: number;
  progress_percent: number;
  distance_travelled_km: number;
  distance_remaining_km: number;
  current_leg: string;
  route_waypoints: string[];
  eta: string;
  risk: RiskLevel;
}

export type VesselState = ApiFleetVessel;

