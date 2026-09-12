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
 * Check rate limit using persistent database storage.
 * Single-query UPSERT with RETURNING makes the read-modify-write atomic,
 * so concurrent requests cannot slip through the limit.
 * Expired-entry cleanup is intentionally NOT done inline here —
 * run DELETE FROM rate_limit WHERE expires_at <= unixepoch() via a scheduled job instead.
 * Falls back to in-memory if the database query itself fails.
 */
async function checkRateLimitPersistent(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<boolean> {
  const nowUnix = Math.floor(Date.now() / 1000);
  const expiresAtUnix = nowUnix + Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const result = await execute(
      `INSERT INTO rate_limit (key, count, expires_at, created_at, updated_at)
       VALUES (?, 1, ?, unixepoch(), unixepoch())
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limit.expires_at <= unixepoch() THEN 1 ELSE rate_limit.count + 1 END,
         expires_at = CASE WHEN rate_limit.expires_at <= unixepoch() THEN excluded.expires_at ELSE rate_limit.expires_at END,
         updated_at = unixepoch()
       RETURNING count`,
      [key, expiresAtUnix]
    );

    const row = result.rows?.[0] as unknown as { count?: unknown } | undefined;
    const count = typeof row?.count === "number" ? row.count : Number(row?.count ?? Number.NaN);
    if (Number.isNaN(count)) {
      logger.error("Rate limit check returned unexpected shape, falling back to memory", { key });
      return checkRateLimitMemory(key, { limit, windowMs });
    }

    return count <= limit;
  } catch (error) {
    logger.error("Rate limit check failed, falling back to memory", {
      key,
      error,
    });
    // エラー時はインメモリにフォールバック
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
