import { logger } from "./logger";
import { execute, isTursoConfigured } from "./turso";

// In-memory fallback store
const globalBucket = globalThis as unknown as {
  __updatesRateLimit?: Map<string, { count: number; expiresAt: number }>;
};

if (!globalBucket.__updatesRateLimit) {
  globalBucket.__updatesRateLimit = new Map();
}

const memoryStore = globalBucket.__updatesRateLimit;

export type RateLimitOptions = {
  /** how many requests allowed within the window */
  limit: number;
  /** window size in milliseconds */
  windowMs: number;
};

/**
 * Check rate limit using persistent database storage
 * Falls back to in-memory if database is unavailable
 */
async function checkRateLimitPersistent(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<boolean> {
  const now = Date.now();
  const expiresAt = now + windowMs;
  const expiresAtUnix = Math.floor(expiresAt / 1000);
  const nowUnix = Math.floor(now / 1000);

  try {
    // Clean up expired entries first
    await execute("DELETE FROM rate_limit WHERE expires_at <= ?", [nowUnix]);

    // Try to get existing entry
    const result = await execute("SELECT count, expires_at FROM rate_limit WHERE key = ?", [key]);

    if (result.rows.length === 0) {
      // No existing entry, create new one
      await execute("INSERT INTO rate_limit (key, count, expires_at) VALUES (?, 1, ?)", [
        key,
        expiresAtUnix,
      ]);
      return true;
    }

    const row = result.rows[0] as unknown as { count: number; expires_at: number };

    if (row.count >= limit) {
      return false;
    }

    // Increment counter
    await execute(
      "UPDATE rate_limit SET count = count + 1, updated_at = unixepoch() WHERE key = ?",
      [key]
    );

    return true;
  } catch (error) {
    logger.error("Rate limit check failed, falling back to memory", {
      key,
      error,
    });
    // Fall back to memory on error
    return checkRateLimitMemory(key, { limit, windowMs });
  }
}

/**
 * In-memory rate limiter (fallback)
 */
function checkRateLimitMemory(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Check rate limit
 * Uses persistent storage if available, otherwise falls back to in-memory
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<boolean> {
  if (isTursoConfigured()) {
    return checkRateLimitPersistent(key, options);
  }
  return checkRateLimitMemory(key, options);
}
