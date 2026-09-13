import type {
  ApiDisruption,
  ApiAffectedShipment,
  ApiShipment,
  ApiSensorCheckResponse,
  ApiStatsResponse,
} from '@/lib/types/api';
import type {
  Disruption,
  Shipment,
  SensorData,
  Reading,
  Cargo,
  Severity,
} from '@/lib/bob-data';

export interface DashboardStats {
  total: number;
  affected: number;
  critical: number;
  moderate: number;
}

const DISRUPTION_TYPE_LABELS: Record<string, string> = {
  port_strike: 'Port Strike',
  weather_event: 'Weather Event',
  geopolitical_crisis: 'Geopolitical Crisis',
};

export function formatDisruptionStartDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function mapDisruption(api: ApiDisruption, affectedCount?: number): Disruption {
  const typeLabel = DISRUPTION_TYPE_LABELS[api.type] || api.type.replace(/_/g, ' ');
  return {
    id: api.disruption_id,
    type: typeLabel as any,
    location: api.location,
    severity: api.severity as Severity,
    duration: `${api.expected_duration_days} days`,
    affected: affectedCount ?? 0,
    description: api.description,
    start: formatDisruptionStartDate(api.start_date),
  };
}

export function mapShipment(
  api: ApiAffectedShipment | ApiShipment,
  fallbackRisk: Severity = 'medium'
): Shipment {
  const waypoints = api.route_waypoints || [api.origin, api.destination];
  
  // Determine numerical currentLeg from waypoints
  let legIndex = 0;
  if (api.current_leg) {
    const idx = waypoints.findIndex(
      (w) => api.current_leg.toLowerCase().includes(w.toLowerCase())
    );
    legIndex = idx >= 0 ? idx : 1;
  }

  const aiRec = 'ai_recommendation' in api ? api.ai_recommendation : null;

  return {
    id: api.shipment_id,
    origin: api.origin,
    destination: api.destination,
    carrier: api.carrier,
    cargo: api.cargo_type as Cargo,
    value: api.value_usd,
    status: (api.status === 'delayed' || api.status === 'delivered' ? api.status : 'in_transit'),
    waypoints,
    currentLeg: Math.min(legIndex, Math.max(0, waypoints.length - 1)),
    risk: (aiRec?.risk_level || fallbackRisk) as Severity,
    action: (aiRec?.recommended_action || 'reroute') as 'reroute' | 'hold' | 'alternate_carrier',
    delay: aiRec?.estimated_delay_days ?? 3,
    justification:
      aiRec?.justification ||
      'Automated risk assessment: Recommended mitigation action based on active disruption proximity.',
  };
}

export function mapSensorCheck(api: ApiSensorCheckResponse): SensorData {
  const readings: Reading[] = (api.readings || []).map((r) => {
    let timeStr = r.timestamp;
    try {
      const d = new Date(r.timestamp);
      if (!isNaN(d.getTime())) {
        timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    } catch {
      // keep raw string
    }

    return {
      time: timeStr,
      temp: r.temp_c,
      leg: r.leg,
      inRange: r.in_range,
    };
  });

  const providerLabel =
    api.ai_explanation?.ai_provider === 'gemini'
      ? 'Gemini'
      : api.ai_explanation?.ai_provider === 'groq'
      ? 'Groq'
      : null;

  return {
    cargoType: api.cargo_type as Cargo,
    safeMin: api.safe_range?.min ?? null,
    safeMax: api.safe_range?.max ?? 0,
    excursionStatus: api.excursion_status,
    readings,
    aiSummary: api.ai_explanation?.summary || null,
    regulatoryNote: api.ai_explanation?.regulatory_note || null,
    aiProvider: providerLabel,
  };
}

export function mapStats(api: ApiStatsResponse): DashboardStats {
  return {
    total: api.total_shipments,
    affected: api.disruption_affected,
    critical: api.cold_chain_alerts?.critical ?? 0,
    moderate: api.cold_chain_alerts?.moderate ?? 0,
  };
}
