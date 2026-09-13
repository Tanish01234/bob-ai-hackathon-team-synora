import type { CargoType, RiskLevel, ShipmentStatus, ApiAlternativeRoute, RouteSegment } from '@/lib/types/api';

export interface VesselState {
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

export interface WeatherZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  condition: 'clear' | 'rain' | 'storm' | 'fog';
  severity: 'normal' | 'moderate' | 'high' | 'critical';
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  temperature_c: number;
  speed_reduction_pct: number;
  estimated_delay_hours: number;
  wave_height_m: number;
  description: string;
}

export interface DisruptionZone {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  radius_km: number;
  type: 'port_strike' | 'weather_event' | 'geopolitical_crisis' | 'canal_restriction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_count: number;
  impact_summary: string;
  delay_days: number;
  active: boolean;
}

export interface MapLayersConfig {
  weather: boolean;
  disruptions: boolean;
  routes: boolean;
  labels: boolean;
}

export type ZoomPreset = 60 | 80 | 100 | 120 | 150;
