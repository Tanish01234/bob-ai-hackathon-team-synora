import { createClient } from '@/lib/supabase/client';

export function getApiBaseUrl(): string {
  // In the browser, always use same-origin /svc/api routing in production on Vercel
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (isLocalhost && envUrl && !envUrl.includes('/svc/api')) {
      return envUrl.replace(/\/+$/, '');
    }
    return '/svc/api';
  }

  // Server-side (SSR / Node): use internal service binding URL or dev localhost
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  ).replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  let token: string | null = null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      token = session.access_token;
      // Proactively refresh if expiring within 60 seconds
      if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            token = refreshData.session.access_token;
          }
        } catch {
          // retain existing token if refresh attempt fails
        }
      }
    }
  } catch (authErr) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[apiClient] Unable to retrieve Supabase session:', authErr);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      `Failed to connect to Bob API at ${url}: ${err?.message || 'Network error'}`,
      0,
      err
    );
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // response is not json
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[apiClient] ${response.status} from ${endpoint}:`, errorData?.detail || response.statusText);
    }

    throw new ApiError(
      errorData?.detail || `API request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json() as Promise<T>;
}
