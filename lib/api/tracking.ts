import { apiClient } from './client';
import { fetchWithCache, getCached } from './cache';
import type { ApiTrackingResponse, ApiSimulationState, ApiDashboardSummary, ApiFleetVessel } from '@/lib/types/api';

export function getCachedShipmentTracking(shipmentId: string): ApiTrackingResponse | null {
  return getCached<ApiTrackingResponse>(`tracking:${shipmentId}`);
}

export async function getShipmentTracking(shipmentId: string, forceRefresh = false): Promise<ApiTrackingResponse> {
  return fetchWithCache<ApiTrackingResponse>(
    `tracking:${shipmentId}`,
    () => apiClient<ApiTrackingResponse>(`/shipments/${shipmentId}/tracking`),
    15_000,
    forceRefresh
  );
}

export async function getFleetTracking(): Promise<ApiFleetVessel[]> {
  return apiClient<ApiFleetVessel[]>('/fleet/tracking');
}

export async function getSimulationState(): Promise<ApiSimulationState> {
  return apiClient<ApiSimulationState>('/simulation');
}

export async function getDashboardSummary(): Promise<ApiDashboardSummary> {
  return apiClient<ApiDashboardSummary>('/dashboard/summary');
}

