import { apiClient } from './client';
import type { ApiStatsResponse } from '@/lib/types/api';

export async function getStats(): Promise<ApiStatsResponse> {
  return apiClient<ApiStatsResponse>('/stats');
}
