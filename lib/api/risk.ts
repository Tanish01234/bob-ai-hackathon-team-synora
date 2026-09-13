import { apiClient } from './client';
import type { ApiRiskResponse, ApiAlert } from '@/lib/types/api';

export async function getShipmentRisk(shipmentId: string): Promise<ApiRiskResponse> {
  return apiClient<ApiRiskResponse>(`/shipments/${shipmentId}/risk`);
}

export async function getShipmentAlerts(shipmentId: string): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>(`/shipments/${shipmentId}/alerts`);
}

export async function getAllAlerts(): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>('/alerts');
}
