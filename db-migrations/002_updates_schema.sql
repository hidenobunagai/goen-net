-- Migrate legacy updates table to the new application schema.
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS updates_new (
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

INSERT INTO updates_new (
  id,
  by_name,
  category,
  urgent,
  uid,
  title,
  body,
  when_value,
  created_at,
  updated_at
)
SELECT
  CAST(id AS TEXT) AS id,
  NULL AS by_name,
  0 AS category,
  CASE
    WHEN urgent IS NULL THEN 0
    WHEN typeof(urgent) = 'text' THEN CASE
      WHEN lower(trim(urgent)) IN ('1', 'true', 't', 'y', 'yes', 'on') THEN 1
      ELSE 0
    END
    ELSE CASE WHEN urgent != 0 THEN 1 ELSE 0 END
  END AS urgent,
  uid,
  NULLIF(trim(substr(content, 1, 120)), '') AS title,
  content AS body,
  CASE
    WHEN timeframe IS NULL OR trim(timeframe) = '' THEN -1
    WHEN lower(trim(timeframe)) IN ('now', 'immediate', 'today', 'current', 'soon') THEN 1
    WHEN trim(timeframe) IN ('1', 'true', 't', 'y', 'yes', 'on') THEN 1
    WHEN CAST(timeframe AS INTEGER) = 1 THEN 1
    ELSE -1
  END AS when_value,
  created_at,
  updated_at
FROM updates;

DROP TABLE updates;
ALTER TABLE updates_new RENAME TO updates;

CREATE INDEX IF NOT EXISTS idx_updates_uid ON updates(uid);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON updates(created_at DESC);

COMMIT;
