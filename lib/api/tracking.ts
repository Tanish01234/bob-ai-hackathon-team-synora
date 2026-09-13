import { apiClient } from './client';
import type { ApiTrackingResponse, ApiSimulationState, ApiDashboardSummary, ApiFleetVessel } from '@/lib/types/api';

export async function getShipmentTracking(shipmentId: string): Promise<ApiTrackingResponse> {
  return apiClient<ApiTrackingResponse>(`/shipments/${shipmentId}/tracking`);
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

