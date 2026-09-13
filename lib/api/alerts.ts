import { apiClient } from './client';

export interface ApiAlert {
  alert_id?: string;
  id?: string;
  shipment_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  message: string;
  created_at: string;
  resolved?: boolean;
}

export async function getAlerts(): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>('/alerts');
}

export async function getShipmentAlerts(shipmentId: string): Promise<ApiAlert[]> {
  return apiClient<ApiAlert[]>(`/shipments/${shipmentId}/alerts`);
}
