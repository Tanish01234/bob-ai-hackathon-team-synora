import { apiClient } from './client';
import { fetchWithCache, getCached } from './cache';
import { getShipmentTracking } from './tracking';
import { getShipmentWeather } from './weather';
import { getShipmentRisk } from './risk';
import type { ApiShipment, ApiSensorCheckResponse } from '@/lib/types/api';

export function getCachedShipmentById(id: string): ApiShipment | null {
  return getCached<ApiShipment>(`shipment:${id}`);
}

export async function getShipments(): Promise<ApiShipment[]> {
  return apiClient<ApiShipment[]>('/shipments');
}

export async function getShipmentById(id: string, forceRefresh = false): Promise<ApiShipment> {
  return fetchWithCache<ApiShipment>(
    `shipment:${id}`,
    () => apiClient<ApiShipment>(`/shipments/${id}`),
    30_000,
    forceRefresh
  );
}

export async function getShipmentSensorCheck(id: string): Promise<ApiSensorCheckResponse> {
  return apiClient<ApiSensorCheckResponse>(`/shipments/${id}/sensor-check`);
}

/**
 * Prefetches all secondary intelligence for a shipment concurrently.
 * Safe to fire on hover or row selection; never throws unhandled errors.
 */
export function prefetchShipmentData(shipmentId: string): void {
  if (!shipmentId) return;
  Promise.allSettled([
    getShipmentTracking(shipmentId),
    getShipmentWeather(shipmentId),
    getShipmentRisk(shipmentId),
  ]).catch(() => {});
}
