import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

function runMigrate(dbPath: string, args: string[] = []): string {
  return execFileSync("bun", ["run", "scripts/migrate.ts", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, TURSO_DB_URL: `file:${dbPath}` },
    encoding: "utf8",
  });
}

describe("scripts/migrate.ts", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("bootstraps a fresh database and stays idempotent on rerun", async () => {
    const dir = mkdtempSync(join(tmpdir(), "goen-migrate-"));
    dirs.push(dir);
    const dbPath = join(dir, "fresh.db");

    const first = runMigrate(dbPath);
    expect(first).toContain("000_baseline.sql");

    const client = createClient({ url: `file:${dbPath}` });
    try {
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      );
      const names = (tables.rows ?? []).map((row) =>
        String((row as unknown as { name: unknown }).name)
      );
      for (const expected of [
        "users",
        "rate_limit",
        "next_session",
        "updates",
        "worksheets",
        "prioritization",
        "_migrations",
      ]) {
        expect(names).toContain(expected);
      }

      const second = runMigrate(dbPath);
      expect(second).toContain("Done. 0 applied.");
    } finally {
      client.close();
    }
  });

  it("migrates a legacy updates table (content/timeframe) to the new schema", async () => {
    const dir = mkdtempSync(join(tmpdir(), "goen-migrate-"));
    dirs.push(dir);
    const dbPath = join(dir, "legacy.db");

    const setup = createClient({ url: `file:${dbPath}` });
    try {
      await setup.execute(
        "CREATE TABLE updates (id INTEGER PRIMARY KEY, uid TEXT, content TEXT, timeframe TEXT, urgent TEXT, created_at TEXT, updated_at TEXT)"
      );
      await setup.execute(
        "INSERT INTO updates (uid, content, timeframe, urgent, created_at, updated_at) VALUES ('u@example.com', 'hello world', 'now', 'yes', '2026-01-01', '2026-01-02')"
      );
    } finally {
      setup.close();
    }

    const output = runMigrate(dbPath);
    expect(output).toContain("002_updates_schema.sql");

    const verify = createClient({ url: `file:${dbPath}` });
    try {
      const rows = await verify.execute(
        "SELECT id, uid, title, body, when_value, urgent FROM updates"
      );
      expect(rows.rows?.length).toBe(1);
      const row = rows.rows?.[0] as unknown as Record<string, unknown>;
      expect(String(row.body)).toBe("hello world");
      expect(Number(row.when_value)).toBe(1);
      expect(Number(row.urgent)).toBe(1);
    } finally {
      verify.close();
    }
  });
});
