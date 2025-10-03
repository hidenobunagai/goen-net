-- Goen Net Database Schema

-- Next session information
CREATE TABLE IF NOT EXISTS next_session (
  id INTEGER PRIMARY KEY DEFAULT 1,
  start_at TEXT,
  end_at TEXT,
  location TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- User updates
CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  content TEXT NOT NULL,
  timeframe TEXT,
  urgent BOOLEAN DEFAULT 0,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_updates_uid ON updates(uid);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON updates(created_at DESC);

-- Worksheets for presenter, coach, and observer roles
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
