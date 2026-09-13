import { apiClient } from './client';
import type { ApiDisruption, ApiDisruptionMatchResponse } from '@/lib/types/api';

export async function getDisruptions(): Promise<ApiDisruption[]> {
  return apiClient<ApiDisruption[]>('/disruptions');
}

export async function getDisruptionById(id: string): Promise<ApiDisruption> {
  return apiClient<ApiDisruption>(`/disruptions/${id}`);
}

export async function matchDisruption(id: string): Promise<ApiDisruptionMatchResponse> {
  return apiClient<ApiDisruptionMatchResponse>(`/disruptions/${id}/match`, {
    method: 'POST',
  });
}
