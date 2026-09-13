import type { WeatherZone, DisruptionZone, ZoomPreset } from './types';

export const MARITIME_WEATHER_ZONES: WeatherZone[] = [
  {
    id: 'wz-arabian-storm',
    name: 'Arabian Sea Monsoon Storm Cell',
    lat: 14.5,
    lng: 63.8,
    radius_km: 450,
    condition: 'storm',
    severity: 'critical',
    wind_speed_kmh: 78,
    wind_gust_kmh: 104,
    temperature_c: 28.5,
    speed_reduction_pct: 35,
    estimated_delay_hours: 24,
    wave_height_m: 6.2,
    description: 'Severe cyclonic storm system causing severe sea swells and navigation rerouting.',
  },
  {
    id: 'wz-bay-bengal-rain',
    name: 'Bay of Bengal Depressions',
    lat: 11.2,
    lng: 85.6,
    radius_km: 380,
    condition: 'rain',
    severity: 'high',
    wind_speed_kmh: 52,
    wind_gust_kmh: 68,
    temperature_c: 27.2,
    speed_reduction_pct: 18,
    estimated_delay_hours: 12,
    wave_height_m: 3.8,
    description: 'Heavy precipitation corridor with moderate surface chop and reduced visibility.',
  },
  {
    id: 'wz-english-channel-fog',
    name: 'English Channel Maritime Fog Zone',
    lat: 50.1,
    lng: -0.8,
    radius_km: 220,
    condition: 'fog',
    severity: 'moderate',
    wind_speed_kmh: 14,
    wind_gust_kmh: 22,
    temperature_c: 13.0,
    speed_reduction_pct: 15,
    estimated_delay_hours: 6,
    wave_height_m: 1.2,
    description: 'Dense sea fog reducing optical visibility below 500m; vessels operating on fog radar protocols.',
  },
  {
    id: 'wz-south-china-clear',
    name: 'South China Sea Corridor',
    lat: 16.8,
    lng: 114.2,
    radius_km: 500,
    condition: 'clear',
    severity: 'normal',
    wind_speed_kmh: 18,
    wind_gust_kmh: 25,
    temperature_c: 30.1,
    speed_reduction_pct: 0,
    estimated_delay_hours: 0,
    wave_height_m: 1.0,
    description: 'Calm waters and optimal visibility along standard eastbound sea lane.',
  },
  {
    id: 'wz-mediterranean-calm',
    name: 'Eastern Mediterranean Passage',
    lat: 34.2,
    lng: 26.5,
    radius_km: 360,
    condition: 'clear',
    severity: 'normal',
    wind_speed_kmh: 22,
    wind_gust_kmh: 30,
    temperature_c: 24.5,
    speed_reduction_pct: 0,
    estimated_delay_hours: 0,
    wave_height_m: 1.4,
    description: 'Normal sea state with clear horizon and favorable tailwinds.',
  },
  {
    id: 'wz-malacca-rain',
    name: 'Strait of Malacca Monsoon Front',
    lat: 2.8,
    lng: 101.4,
    radius_km: 260,
    condition: 'rain',
    severity: 'moderate',
    wind_speed_kmh: 38,
    wind_gust_kmh: 48,
    temperature_c: 29.0,
    speed_reduction_pct: 10,
    estimated_delay_hours: 4,
    wave_height_m: 2.1,
    description: 'Scattered squalls and localized rain bands across active transit lane.',
  },
];

export const MARITIME_DISRUPTIONS: DisruptionZone[] = [
  {
    id: 'DIS-ROTTERDAM',
    name: 'Port of Rotterdam Strike',
    location: 'Rotterdam, NL',
    lat: 51.9244,
    lng: 4.4777,
    radius_km: 180,
    type: 'port_strike',
    severity: 'high',
    affected_count: 93,
    impact_summary: 'Automated container terminals halted due to dock union collective action.',
    delay_days: 5,
    active: true,
  },
  {
    id: 'DIS-SUEZ',
    name: 'Suez Canal Restriction',
    location: 'Suez Canal, EG',
    lat: 30.5852,
    lng: 32.2654,
    radius_km: 160,
    type: 'canal_restriction',
    severity: 'critical',
    affected_count: 42,
    impact_summary: 'Southbound convoy throughput throttled due to channel maintenance & security protocols.',
    delay_days: 4,
    active: true,
  },
  {
    id: 'DIS-SINGAPORE',
    name: 'Singapore Port Berth Congestion',
    location: 'Singapore, SG',
    lat: 1.29027,
    lng: 103.851959,
    radius_km: 140,
    type: 'port_strike',
    severity: 'medium',
    affected_count: 58,
    impact_summary: 'Anchorage turnaround times extended by 36-48 hours amid peak transshipment volume.',
    delay_days: 2,
    active: true,
  },
  {
    id: 'DIS-RED-SEA',
    name: 'Bab-el-Mandeb Geopolitical Security Zone',
    location: 'Bab-el-Mandeb Strait',
    lat: 12.5833,
    lng: 43.3333,
    radius_km: 280,
    type: 'geopolitical_crisis',
    severity: 'critical',
    affected_count: 65,
    impact_summary: 'Heightened maritime security advisory; mandatory convoy escorts or Cape reroutes.',
    delay_days: 7,
    active: true,
  },
];

export const ZOOM_LEVEL_MAP: Record<ZoomPreset, number> = {
  60: 3,   // Global fleet overview
  80: 4,   // Regional network
  100: 5,  // Shipment routes & transit hubs
  120: 7,  // Selected shipment corridor
  150: 9,  // Detailed vessel & berth approach
};

export const RISK_COLOR_HEX: Record<string, string> = {
  normal: '#10B981',   // Green
  low: '#10B981',      // Green
  moderate: '#F59E0B', // Yellow / Amber
  medium: '#F59E0B',   // Yellow / Amber
  high: '#F97316',     // Orange
  critical: '#EF4444', // Red
};

