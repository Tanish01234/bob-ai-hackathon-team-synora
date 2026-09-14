import { getApiBaseUrl, API_BASE_URL } from './client';
import { createClient } from '@/lib/supabase/client';

export async function downloadTransitReceipt(shipmentId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  let token: string | null = null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {
    // ignore
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/shipments/${shipmentId}/transit-receipt`;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`Failed to download transit receipt (${resp.status}): ${resp.statusText}`);
  }

  const blob = await resp.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `transit_receipt_${shipmentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
}
