import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';

async function loadJson(path) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return null; }
}

async function getClient() {
  const db = await loadJson('turso-db.json');
  const token = await loadJson('turso-db-token.json');
  const url = db?.url || (db?.raw?.database?.Hostname ? `libsql://${db.raw.database.Hostname}` : null);
  if (!url || !token?.token) throw new Error('Missing DB url or token. Run turso:create and turso:token.');
  return createClient({ url, authToken: token.token });
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS updates (
    id TEXT PRIMARY KEY,
    by_name TEXT NOT NULL,
    category INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    uid TEXT NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    when_value INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (uid) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS update_votes (
    id TEXT PRIMARY KEY,
    update_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (update_id, uid),
    FOREIGN KEY (update_id) REFERENCES updates(id) ON DELETE CASCADE,
    FOREIGN KEY (uid) REFERENCES users(id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_update_votes_update ON update_votes(update_id)',
  'CREATE INDEX IF NOT EXISTS idx_update_votes_uid ON update_votes(uid)',
  `CREATE TABLE IF NOT EXISTS next_session (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    start_at TEXT,
    end_at TEXT,
    location TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    reminder_sent_at TEXT
  )`,
  'INSERT OR IGNORE INTO next_session (id) VALUES (1)'
];

async function main() {
  try {
    const client = await getClient();
    for (const stmt of schemaStatements) {
      await client.execute(stmt);
    }
    console.log('Migrations applied.');
  } catch (e) {
    console.error(e?.message || String(e));
    process.exit(1);
  }
}

main();
