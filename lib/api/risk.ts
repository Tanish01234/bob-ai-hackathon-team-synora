import { apiClient } from './client';
import { fetchWithCache, getCached } from './cache';
import type { ApiRiskResponse, ApiAlert } from '@/lib/types/api';

export function getCachedShipmentRisk(shipmentId: string): ApiRiskResponse | null {
  return getCached<ApiRiskResponse>(`risk:${shipmentId}`);
}

export async function getShipmentRisk(shipmentId: string, forceRefresh = false): Promise<ApiRiskResponse> {
  return fetchWithCache<ApiRiskResponse>(
    `risk:${shipmentId}`,
    () => apiClient<ApiRiskResponse>(`/shipments/${shipmentId}/risk`),
    30_000,
    forceRefresh
  );
}

export async function getShipmentAlerts(shipmentId: string): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>(`/shipments/${shipmentId}/alerts`);
}

export async function getAllAlerts(): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>('/alerts');
}
