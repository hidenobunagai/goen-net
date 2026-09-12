-- Baseline schema snapshot (mirrors db-schema.sql with IF NOT EXISTS).
-- Fresh databases: run this file (or db-schema.sql) first, then db-migrations/*.
-- Legacy databases: run db-migrations/* in filename order via `bun run db:migrate`.
-- WARNING: db-migrations/002_updates_schema.sql is destructive (DROP TABLE updates).
-- Back up production data before migrating.
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires_at ON rate_limit(expires_at);

CREATE TABLE IF NOT EXISTS next_session (
  id INTEGER PRIMARY KEY DEFAULT 1,
  start_at TEXT,
  end_at TEXT,
  location TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  by_name TEXT,
  category INTEGER NOT NULL DEFAULT 0,
  urgent INTEGER NOT NULL DEFAULT 0,
  uid TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  when_value INTEGER NOT NULL DEFAULT -1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_updates_uid ON updates(uid);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON updates(created_at DESC);

CREATE TABLE IF NOT EXISTS worksheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  role TEXT NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(uid, role)
);

CREATE INDEX IF NOT EXISTS idx_worksheets_uid_role ON worksheets(uid, role);

CREATE TABLE IF NOT EXISTS prioritization (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
