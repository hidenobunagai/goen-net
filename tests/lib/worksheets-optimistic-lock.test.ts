import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/turso", () => ({
  isTursoConfigured: vi.fn(() => false),
  isMemoryFallbackEnabled: vi.fn(() => true),
  execute: vi.fn(),
  TursoUnavailableError: class TursoUnavailableError extends Error {
    constructor(message = "Turso database configuration is not available.") {
      super(message);
      this.name = "TursoUnavailableError";
    }
  },
}));

import { execute, isMemoryFallbackEnabled, isTursoConfigured } from "@/lib/turso";
import {
  getWorksheet,
  resetWorksheetsCache,
  upsertWorksheet,
  WorksheetConflictError,
} from "@/lib/worksheets";

describe("upsertWorksheet optimistic locking (memory store)", () => {
  beforeEach(() => {
    resetWorksheetsCache();
    vi.mocked(isTursoConfigured).mockReturnValue(false);
    vi.mocked(isMemoryFallbackEnabled).mockReturnValue(true);
    vi.mocked(execute).mockReset();
  });

  afterEach(() => {
    resetWorksheetsCache();
  });

  it("inserts when no worksheet existed", async () => {
    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "first" }, null)
    ).resolves.toEqual(expect.any(String));

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "first" });
  });

  it("refuses to insert over an existing revision when the client sent null", async () => {
    await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "second" }, null)
    ).rejects.toBeInstanceOf(WorksheetConflictError);

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "first" });
  });

  it("allows the write when the client sends the current revision", async () => {
    const revision = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "second" }, revision)
    ).resolves.toEqual(expect.any(String));

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "second" });
  });

  it("rejects a stale revision and a replayed revision", async () => {
    const stale = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);
    await upsertWorksheet("user@example.com", "coach", { note: "second" }, stale);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "third" }, stale)
    ).rejects.toBeInstanceOf(WorksheetConflictError);
    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "replay" }, stale)
    ).rejects.toBeInstanceOf(WorksheetConflictError);

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "second" });
  });

  it("treats a cleared worksheet as absent again", async () => {
    const revision = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);
    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "second" }, revision)
    ).resolves.toEqual(expect.any(String));

    // 削除後に古い画面から保存しても、復活はさせない
    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "stale" }, revision)
    ).rejects.toBeInstanceOf(WorksheetConflictError);
  });
});

/**
 * The guarded SQL proves itself only against a real SQLite engine: a mocked
 * store can agree with the intent while the statement matches the wrong rows.
 * These cases run the same statement against a throwaway libSQL database.
 */
describe("guarded worksheets upsert (real SQLite)", () => {
  const client = createClient({ url: "file::memory:?cache=shared", authToken: "test" });

  beforeEach(async () => {
    await client.execute(`CREATE TABLE IF NOT EXISTS worksheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      role TEXT NOT NULL,
      data TEXT,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(uid, role)
    )`);
    await client.execute("DELETE FROM worksheets");
    vi.mocked(isTursoConfigured).mockReturnValue(true);
    vi.mocked(execute).mockImplementation(async (sql, args) => client.execute({ sql, args }));
  });

  afterEach(async () => {
    await client.execute("DELETE FROM worksheets");
    vi.mocked(execute).mockReset();
  });

  it("inserts, then rejects a stale write and accepts the current revision", async () => {
    const first = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "stale" }, null)
    ).rejects.toBeInstanceOf(WorksheetConflictError);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "second" }, first)
    ).resolves.toEqual(expect.any(String));

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "second" });
  });

  it("does not resurrect a deleted worksheet from a stale revision", async () => {
    const revision = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);
    await client.execute("DELETE FROM worksheets WHERE uid = ?1", ["user@example.com"]);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "after delete" }, revision)
    ).rejects.toBeInstanceOf(WorksheetConflictError);

    const rows = await client.execute("SELECT COUNT(*) AS count FROM worksheets");
    expect(Number((rows.rows[0] as unknown as { count: number }).count)).toBe(0);
  });

  it("still lets a fresh client recreate a deleted worksheet", async () => {
    await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);
    await client.execute("DELETE FROM worksheets WHERE uid = ?1", ["user@example.com"]);

    await expect(
      upsertWorksheet("user@example.com", "coach", { note: "recreated" }, null)
    ).resolves.toEqual(expect.any(String));

    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");
    expect(record?.data).toEqual({ note: "recreated" });
  });

  it("keeps the stored revision usable for the next save", async () => {
    const revision = await upsertWorksheet("user@example.com", "coach", { note: "first" }, null);
    const record = await getWorksheet<{ note: string }>("user@example.com", "coach");

    expect(record?.updatedAt).toBe(revision);
  });
});
