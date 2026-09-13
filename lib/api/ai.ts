import { apiClient } from './client';
import type { ApiAIAnalysisResponse } from '@/lib/types/api';

export interface AIChatSource {
  type: string;
  id?: string;
  name?: string;
  location?: string;
}

export interface AIChatResponse {
  answer: string;
  sources: AIChatSource[];
  risk_level?: string | null;
  recommended_action?: string | null;
  data_snapshot_at: string;
  off_topic: boolean;
}

export async function getShipmentAIAnalysis(shipmentId: string): Promise<ApiAIAnalysisResponse> {
  return apiClient<ApiAIAnalysisResponse>(`/shipments/${shipmentId}/ai-analysis`, {
    method: 'POST',
  });
}

export async function chatWithBob(
  message: string,
  shipmentId?: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AIChatResponse> {
  return apiClient<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      shipment_id: shipmentId || null,
      history: history || null,
    }),
  });
}
