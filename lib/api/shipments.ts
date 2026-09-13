import { apiClient } from './client';
import type { ApiShipment, ApiSensorCheckResponse } from '@/lib/types/api';

export async function getShipments(): Promise<ApiShipment[]> {
  return apiClient<ApiShipment[]>('/shipments');
}

export async function getShipmentById(id: string): Promise<ApiShipment> {
  return apiClient<ApiShipment>(`/shipments/${id}`);
}

export async function getShipmentSensorCheck(id: string): Promise<ApiSensorCheckResponse> {
  return apiClient<ApiSensorCheckResponse>(`/shipments/${id}/sensor-check`);
}
