import { apiClient } from './client';
import { fetchWithCache, getCached } from './cache';
import type { ApiWeatherResponse } from '@/lib/types/api';

export function getCachedShipmentWeather(shipmentId: string): ApiWeatherResponse | null {
  return getCached<ApiWeatherResponse>(`weather:${shipmentId}`);
}

export async function getShipmentWeather(shipmentId: string, forceRefresh = false): Promise<ApiWeatherResponse> {
  return fetchWithCache<ApiWeatherResponse>(
    `weather:${shipmentId}`,
    () => apiClient<ApiWeatherResponse>(`/shipments/${shipmentId}/weather`),
    60_000,
    forceRefresh
  );
}
