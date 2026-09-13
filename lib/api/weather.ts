import { apiClient } from './client';
import type { ApiWeatherResponse } from '@/lib/types/api';

export async function getShipmentWeather(shipmentId: string): Promise<ApiWeatherResponse> {
  return apiClient<ApiWeatherResponse>(`/shipments/${shipmentId}/weather`);
}
