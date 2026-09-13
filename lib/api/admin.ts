import { apiClient } from './client';
import type { ApiSimulationState } from '@/lib/types/api';

export async function getAdminOverview(): Promise<any> {
  return apiClient('/admin/overview');
}

export async function getAdminShipments(params?: { status?: string; cargo_type?: string; search?: string }): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.cargo_type) query.set('cargo_type', params.cargo_type);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return apiClient(`/admin/shipments${qs ? `?${qs}` : ''}`);
}

export async function createShipment(data: any): Promise<any> {
  return apiClient('/admin/shipments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateShipment(shipmentId: string, data: any): Promise<any> {
  return apiClient(`/admin/shipments/${shipmentId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteShipment(shipmentId: string): Promise<any> {
  return apiClient(`/admin/shipments/${shipmentId}`, { method: 'DELETE' });
}

export async function createDisruption(data: any): Promise<any> {
  return apiClient('/admin/disruptions', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDisruption(disruptionId: string, data: any): Promise<any> {
  return apiClient(`/admin/disruptions/${disruptionId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function getSimulation(): Promise<ApiSimulationState> {
  return apiClient<ApiSimulationState>('/admin/simulation');
}

export async function pauseSimulation(): Promise<ApiSimulationState> {
  return apiClient<ApiSimulationState>('/admin/simulation/pause', { method: 'POST' });
}

export async function resumeSimulation(): Promise<ApiSimulationState> {
  return apiClient<ApiSimulationState>('/admin/simulation/resume', { method: 'POST' });
}

export async function setSimulationSpeed(speed: number): Promise<ApiSimulationState> {
  return apiClient<ApiSimulationState>('/admin/simulation/speed', {
    method: 'POST',
    body: JSON.stringify({ speed_multiplier: speed }),
  });
}

export async function resetSimulation(): Promise<any> {
  return apiClient('/admin/simulation/reset', { method: 'POST' });
}

export async function triggerWeatherEvent(shipmentId?: string, severity?: string): Promise<any> {
  return apiClient('/admin/simulation/weather-event', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId, event_type: 'severe_weather', severity: severity || 'high' }),
  });
}

export async function triggerColdChainEvent(shipmentId?: string): Promise<any> {
  return apiClient('/admin/simulation/cold-chain-event', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId, event_type: 'cold_chain_excursion' }),
  });
}

export async function triggerPortStrike(port?: string, shipmentId?: string): Promise<any> {
  return apiClient('/admin/simulation/port-strike', {
    method: 'POST',
    body: JSON.stringify({ port: port || 'Port of Singapore', shipment_id: shipmentId, event_type: 'port_strike' }),
  });
}

export async function getAdminDisruptions(): Promise<any[]> {
  return apiClient('/admin/disruptions');
}

export async function toggleDisruption(disruptionId: string, active?: boolean): Promise<any> {
  return apiClient(`/admin/disruptions/${disruptionId}/toggle`, {
    method: 'POST',
    body: JSON.stringify(active !== undefined ? { active } : {}),
  });
}

export async function getAdminAIActivity(limit = 20): Promise<any[]> {
  return apiClient(`/admin/ai-activity?limit=${limit}`);
}

export async function getAdminShipment(shipmentId: string): Promise<any> {
  return apiClient(`/admin/shipments/${shipmentId}`);
}
