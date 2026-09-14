/**
 * Bob — Client-side In-Memory Cache & Request Deduplicator
 *
 * Provides instant (<0.01ms) cache hits and deduplicates concurrent in-flight
 * API calls across components.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttlMs) {
    // Return stale data if available while caller can revalidate in background
    return entry.data;
  }
  return entry.data;
}

export function isCacheFresh(key: string): boolean {
  const entry = memoryCache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp <= entry.ttlMs;
}

export function setCached<T>(key: string, data: T, ttlMs: number = 30_000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttlMs,
  });
}

export function clearCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 30_000,
  forceRefresh: boolean = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = getCached<T>(key);
    if (cached !== null && isCacheFresh(key)) {
      return cached;
    }
  }

  // Deduplicate concurrent calls to the exact same key
  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      setCached(key, result, ttlMs);
      return result;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, promise);
  return promise;
}
