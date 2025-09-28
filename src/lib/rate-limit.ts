const globalBucket = globalThis as unknown as {
  __updatesRateLimit?: Map<string, { count: number; expiresAt: number }>;
};

if (!globalBucket.__updatesRateLimit) {
  globalBucket.__updatesRateLimit = new Map();
}

const store = globalBucket.__updatesRateLimit;

export type RateLimitOptions = {
  /** how many requests allowed within the window */
  limit: number;
  /** window size in milliseconds */
  windowMs: number;
};

/**
 * Simple in-memory rate limiter suitable for serverless edge/runtime boot cycle.
 * Uses request key (e.g. user email or ip) combined with endpoint name.
 */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
