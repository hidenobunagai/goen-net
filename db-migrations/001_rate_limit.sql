-- Rate limiting table
-- Stores rate limit counters per key (user/endpoint combination)

CREATE TABLE IF NOT EXISTS rate_limit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires_at ON rate_limit(expires_at);

-- Cleanup query (run periodically via cron or before checks)
-- DELETE FROM rate_limit WHERE expires_at <= unixepoch();
