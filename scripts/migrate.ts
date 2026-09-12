#!/usr/bin/env bun
/**
 * Minimal migration runner for Turso (libSQL).
 *
 * - Applies db-migrations/*.sql in filename order.
 * - Tracks applied files in _migrations(name TEXT PRIMARY KEY).
 * - Supports --dry-run (no writes) for CI validation.
 * - Honors file:... URLs (local sqlite) and libsql:// URLs.
 *
 * Usage:
 *   bun run db:migrate            # apply pending migrations
 *   bun run db:migrate:dry-run    # validate without writing
 *
 * Env:
 *   TURSO_DB_URL | TURSO_DATABASE_URL | DATABASE_URL
 *   TURSO_DB_AUTH_TOKEN | TURSO_AUTH_TOKEN | LIBSQL_AUTH_TOKEN | TURSO_DB_TOKEN
 *   MIGRATIONS_DIR (default: db-migrations)
 *   DATABASE_URL may also point at a local file via file:/absolute/path.db
 *
 * Note: 002_updates_schema.sql is a legacy migration for databases that still
 * have the OLD updates table (content/timeframe columns). It is destructive
 * (DROP TABLE updates), so:
 *  - back up the database before running against production data;
 *  - on fresh databases (no legacy updates table) the runner refuses to apply it
 *    via the "-- requires-legacy-table: <table>" header instead of failing midway.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { createClient } from "@libsql/client";

const URL_KEYS = ["TURSO_DB_URL", "TURSO_DATABASE_URL", "DATABASE_URL"] as const;
const TOKEN_KEYS = [
  "TURSO_DB_AUTH_TOKEN",
  "TURSO_AUTH_TOKEN",
  "LIBSQL_AUTH_TOKEN",
  "TURSO_DB_TOKEN",
] as const;

function pickEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw && raw.trim()) return raw.trim();
  }
  return null;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".turso.io")) {
      return `libsql://${parsed.hostname}`;
    }
  } catch {
    // fall through
  }
  return url;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const dir = resolve(process.cwd(), process.env.MIGRATIONS_DIR ?? "db-migrations");
  const url = pickEnv(URL_KEYS);
  if (!url) {
    console.error(
      "No database URL found. Set TURSO_DB_URL (or TURSO_DATABASE_URL / DATABASE_URL)."
    );
    process.exit(1);
  }
  const normalized = normalizeUrl(url);
  const isLocalFile = normalized.startsWith("file:");
  const authToken = pickEnv(TOKEN_KEYS);
  if (!isLocalFile && !authToken) {
    console.error("No auth token found. Set TURSO_DB_AUTH_TOKEN (or equivalent).");
    process.exit(1);
  }

  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (error) {
    console.error(`Cannot read migrations dir: ${dir}`, error);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`No migrations found in ${dir}.`);
    return;
  }

  const client = createClient(
    isLocalFile ? { url: normalized } : { url: normalized, authToken: authToken as string }
  );

  if (!dryRun) {
    await client.execute(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))"
    );
  }
  const applied = new Set<string>();
  if (!dryRun) {
    const rows = await client.execute("SELECT name FROM _migrations");
    for (const row of rows.rows ?? []) {
      if (typeof row.name === "string") applied.add(row.name);
    }
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Migrations dir: ${dir}`);
  let pending = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip ${file} (already applied)`);
      continue;
    }
    pending += 1;
    const raw = readFileSync(join(dir, file), "utf8");
    // Opt-in precondition: "-- requires-legacy-table: updates" lets legacy-only
    // migrations declare the table they migrate FROM. Fresh databases that never
    // had that table skip the file instead of failing midway (and the skip is
    // recorded so reruns stay idempotent).
    const requiredTable = raw.match(/--\s*requires-legacy-table:\s*(\S+)/i)?.[1];
    if (requiredTable && !dryRun) {
      const existing = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        [requiredTable]
      );
      const hasTable = (existing.rows?.length ?? 0) > 0;
      if (!hasTable) {
        console.log(`  skip ${file} (legacy table "${requiredTable}" not present)`);
        await client.execute("INSERT INTO _migrations (name) VALUES (?)", [file]);
        continue;
      }
      // If the table exists but already matches the NEW schema, the migration
      // was effectively applied out-of-band — record and skip instead of
      // dropping user data.
      const cols = await client.execute(`PRAGMA table_info(${requiredTable})`);
      const colNames = new Set(
        (cols.rows ?? []).map((row) => String((row as { name?: unknown }).name ?? ""))
      );
      if (requiredTable === "updates" && colNames.has("body") && colNames.has("when_value")) {
        console.log(`  skip ${file} (updates already uses the new schema)`);
        await client.execute("INSERT INTO _migrations (name) VALUES (?)", [file]);
        continue;
      }
    }
    if (requiredTable && dryRun) {
      console.log(`  would check ${file} (requires legacy table "${requiredTable}")`);
      continue;
    }
    const sql = raw;
    // COMMENT-only fragments (e.g. trailing "-- comment") produce empty statements
    // that some libsql drivers reject, so count only executable statements.
    const statements = sql
      .split(";")
      .map((s) => s.replace(/--[^\n]*/g, "").trim())
      .filter(Boolean);
    console.log(`  ${dryRun ? "would apply" : "apply"} ${file} (${statements.length} statements)`);
    if (dryRun) continue;
    // executeMultiple handles multi-statement scripts (incl. BEGIN/COMMIT blocks)
    // atomically per file; fall back to sequential execute for drivers without it.
    const maybeBatch = client as unknown as {
      executeMultiple?: (sql: string) => Promise<void>;
    };
    if (typeof maybeBatch.executeMultiple === "function") {
      await maybeBatch.executeMultiple(statements.join(";\n") + ";");
    } else {
      for (const statement of statements) {
        await client.execute(statement);
      }
    }
    await client.execute("INSERT INTO _migrations (name) VALUES (?)", [file]);
  }

  console.log(dryRun ? `Dry run complete. ${pending} pending.` : `Done. ${pending} applied.`);
  client.close();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
