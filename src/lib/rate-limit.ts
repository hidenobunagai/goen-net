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
    // 確率的（5%の確率）に期限切れレコードを非同期クリーンアップ
    if (Math.random() < 0.05) {
      void execute("DELETE FROM rate_limit WHERE expires_at <= ?", [nowUnix]).catch((err) => {
        logger.warn("Rate limit background cleanup failed", { error: err });
      });
    }

    // 現在のエントリを取得
    const result = await execute("SELECT count, expires_at FROM rate_limit WHERE key = ?", [key]);

    if (result.rows.length === 0) {
      // 新規エントリ作成
      await execute(
        "INSERT INTO rate_limit (key, count, expires_at, created_at, updated_at) VALUES (?, 1, ?, unixepoch(), unixepoch())",
        [key, expiresAtUnix]
      );
      return true;
    }

    const row = result.rows[0] as unknown as { count: number; expires_at: number };

    // 既存エントリが期限切れの場合はリセット
    if (row.expires_at <= nowUnix) {
      await execute(
        "UPDATE rate_limit SET count = 1, expires_at = ?, updated_at = unixepoch() WHERE key = ?",
        [expiresAtUnix, key]
      );
      return true;
    }

    // 制限値に達している場合
    if (row.count >= limit) {
      return false;
    }

    // カウンターを加算
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
