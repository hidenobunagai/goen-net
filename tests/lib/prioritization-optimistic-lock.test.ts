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

import {
  getPrioritizationBoard,
  PrioritizationConflictError,
  resetPrioritizationCache,
  savePrioritizationBoard,
} from "@/lib/prioritization";
import { execute, isMemoryFallbackEnabled, isTursoConfigured } from "@/lib/turso";

describe("savePrioritizationBoard optimistic locking (memory store)", () => {
  beforeEach(() => {
    resetPrioritizationCache();
    vi.mocked(isTursoConfigured).mockReturnValue(false);
    vi.mocked(isMemoryFallbackEnabled).mockReturnValue(true);
    vi.mocked(execute).mockReset();
  });

  afterEach(() => {
    resetPrioritizationCache();
  });

  it("inserts when no board existed and returns a revision", async () => {
    const revision = await savePrioritizationBoard({ columns: {}, columnOrder: [] }, null);
    expect(typeof revision).toBe("string");

    const record = await getPrioritizationBoard<{ columns: object; columnOrder: string[] }>();
    expect(record.data).toEqual({ columns: {}, columnOrder: [] });
    expect(record.updatedAt).toBe(revision);
  });

  it("succeeds on continuous saves when passing the returned revision as base", async () => {
    const rev1 = await savePrioritizationBoard({ step: 1 }, null);
    const rev2 = await savePrioritizationBoard({ step: 2 }, rev1);
    expect(typeof rev2).toBe("string");
    expect(rev2).not.toBe(rev1);

    const record = await getPrioritizationBoard<{ step: number }>();
    expect(record.data).toEqual({ step: 2 });
    expect(record.updatedAt).toBe(rev2);
  });

  it("refuses to overwrite an existing revision when client sends null or stale base, preserving data", async () => {
    const rev1 = await savePrioritizationBoard({ step: 1 }, null);

    // Save with null base when data already exists
    await expect(savePrioritizationBoard({ step: 2 }, null)).rejects.toBeInstanceOf(
      PrioritizationConflictError
    );

    // Data remains step: 1
    const recordAfterNull = await getPrioritizationBoard<{ step: number }>();
    expect(recordAfterNull.data).toEqual({ step: 1 });
    expect(recordAfterNull.updatedAt).toBe(rev1);

    // Advance to rev2
    const rev2 = await savePrioritizationBoard({ step: 2 }, rev1);

    // Save with stale rev1
    await expect(savePrioritizationBoard({ step: 3 }, rev1)).rejects.toBeInstanceOf(
      PrioritizationConflictError
    );

    const recordAfterStale = await getPrioritizationBoard<{ step: number }>();
    expect(recordAfterStale.data).toEqual({ step: 2 });
    expect(recordAfterStale.updatedAt).toBe(rev2);
  });

  it("rejects when no board exists but client sends non-null base", async () => {
    await expect(
      savePrioritizationBoard({ step: 1 }, "2026-10-07T12:00:00.000Z")
    ).rejects.toBeInstanceOf(PrioritizationConflictError);

    const record = await getPrioritizationBoard();
    expect(record.data).toBeNull();
    expect(record.updatedAt).toBeNull();
  });

  it("strictly increases revision even when saving twice in the same millisecond", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-07T12:00:00.000Z"));
      const rev1 = await savePrioritizationBoard({ count: 1 }, null);
      const rev2 = await savePrioritizationBoard({ count: 2 }, rev1);

      expect(Date.parse(rev2)).toBeGreaterThan(Date.parse(rev1));
      expect(rev2).toBe("2026-10-07T12:00:00.001Z");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("guarded prioritization upsert (real SQLite)", () => {
  const client = createClient({ url: "file::memory:?cache=shared", authToken: "test" });

  beforeEach(async () => {
    await client.execute(`CREATE TABLE IF NOT EXISTS prioritization (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    await client.execute("DELETE FROM prioritization");
    vi.mocked(isTursoConfigured).mockReturnValue(true);
    vi.mocked(execute).mockImplementation(async (sql, args) => client.execute({ sql, args }));
  });

  afterEach(async () => {
    await client.execute("DELETE FROM prioritization");
    vi.mocked(execute).mockReset();
  });

  it("inserts, then rejects a stale write and accepts the current revision", async () => {
    const rev1 = await savePrioritizationBoard({ title: "first" }, null);

    // Stale write with null base -> rowsAffected will be 0, throws PrioritizationConflictError
    await expect(savePrioritizationBoard({ title: "stale" }, null)).rejects.toBeInstanceOf(
      PrioritizationConflictError
    );

    // Write with current revision succeeds
    const rev2 = await savePrioritizationBoard({ title: "second" }, rev1);
    expect(typeof rev2).toBe("string");

    const record = await getPrioritizationBoard<{ title: string }>();
    expect(record.data).toEqual({ title: "second" });
    expect(record.updatedAt).toBe(rev2);
  });

  it("rejects when no row exists and baseUpdatedAt is non-null (rowsAffected is 0)", async () => {
    await expect(
      savePrioritizationBoard({ title: "non-existent" }, "2026-10-07T12:00:00.000Z")
    ).rejects.toBeInstanceOf(PrioritizationConflictError);

    const rows = await client.execute("SELECT COUNT(*) AS count FROM prioritization");
    expect(Number((rows.rows[0] as unknown as { count: number }).count)).toBe(0);
  });
});
