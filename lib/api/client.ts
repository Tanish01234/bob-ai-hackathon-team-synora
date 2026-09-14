import { ensureAuthSession } from '@/lib/auth-bootstrap';

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

  // 1. Wait for auth readiness and obtain the current valid session token
  const auth = await ensureAuthSession();
  let token = auth.token;

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

  // 2. One 401 refresh/retry attempt if token was expired or invalid
  if (response.status === 401 && typeof window !== 'undefined') {
    try {
      const refreshedAuth = await ensureAuthSession({ forceRefresh: true });
      if (refreshedAuth.token && refreshedAuth.token !== token) {
        token = refreshedAuth.token;
        response = await makeRequest(token);
      }
    } catch {
      // retain original response if refresh attempt fails
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
      friendlyMessage = errorData?.detail || 'Authentication token required or expired';
    } else if (response.status === 503) {
      friendlyMessage =
        errorData?.detail || 'Bob AI intelligence provider is currently unavailable';
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[apiClient] ${response.status} from ${endpoint}:`, friendlyMessage);
    }

    throw new ApiError(friendlyMessage, response.status, errorData);
  }

  return response.json() as Promise<T>;
}
