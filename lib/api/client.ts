import { ensureAuthSession } from '@/lib/auth-bootstrap';
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
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 1. Obtain current valid session token directly at request time
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token || null;

    // If no token from session, ensure auth bootstrap has evaluated
    if (!token) {
      const auth = await ensureAuthSession();
      token = auth.token;
    }
  }

  const buildHeaders = (bearerToken?: string | null): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (bearerToken) {
      h['Authorization'] = `Bearer ${bearerToken}`;
    }
    return h;
  };

  const makeRequest = async (bearerToken?: string | null): Promise<Response> => {
    return fetch(url, {
      ...options,
      headers: buildHeaders(bearerToken),
    });
  };

  let response: Response;
  try {
    response = await makeRequest(token);
  } catch (err: any) {
    throw new ApiError(
      `Failed to connect to Bob API at ${url}: ${err?.message || 'Network error'}`,
      0,
      err
    );
  }

  // 2. Safe 401 flow: retry ONCE if session can be refreshed
  if (response.status === 401 && typeof window !== 'undefined') {
    try {
      const supabase = createClient();
      const { data: refreshData } = await supabase.auth.refreshSession();
      const refreshedToken = refreshData?.session?.access_token;
      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
        response = await makeRequest(token);
      }
    } catch {
      // Retain original 401 response if refresh fails
    }
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // response is not JSON
    }

    let friendlyMessage =
      errorData?.detail || `API request failed with status ${response.status}`;

    if (response.status === 401) {
      friendlyMessage =
        errorData?.detail || 'Authentication session required or expired. Please sign in again.';
    } else if (response.status === 503) {
      friendlyMessage =
        errorData?.detail ||
        'Bob AI intelligence provider is currently unavailable. Live telemetry remains active.';
    } else if (response.status === 400) {
      friendlyMessage = errorData?.detail || 'Invalid request parameters.';
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[apiClient] ${response.status} from ${endpoint}:`, friendlyMessage);
    }

    throw new ApiError(friendlyMessage, response.status, errorData);
  }

  return response.json() as Promise<T>;
}
