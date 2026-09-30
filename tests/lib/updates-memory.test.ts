import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

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
  execute,
  isMemoryFallbackEnabled,
  isTursoConfigured,
  TursoUnavailableError,
} from "@/lib/turso";
import {
  deleteUpdate,
  fetchUpdates,
  getUpdateById,
  insertUpdate,
  resetUpdatesCache,
} from "@/lib/updates";

describe("updates (in-memory fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTursoConfigured).mockReturnValue(false);
    vi.mocked(isMemoryFallbackEnabled).mockReturnValue(true);
    resetUpdatesCache();
  });

  it("insert -> fetchUpdates round trip: record comes back with correct fields and ownership", async () => {
    await insertUpdate({
      id: "update-1",
      by: "Alice",
      category: 1,
      urgent: true,
      uid: "user-alice",
      title: "Quarterly Planning",
      body: "Drafting the roadmap for next quarter",
      when: 1,
    });

    const ownerUpdates = await fetchUpdates("user-alice");
    expect(ownerUpdates).toHaveLength(1);
    const update = ownerUpdates[0];
    expect(update.id).toBe("update-1");
    expect(update.by).toBe("Alice");
    expect(update.category).toBe(1);
    expect(update.urgent).toBe(true);
    expect(update.uid).toBe("user-alice");
    expect(update.title).toBe("Quarterly Planning");
    expect(update.body).toBe("Drafting the roadmap for next quarter");
    expect(update.when).toBe(1);
    expect(update.viewerIsOwner).toBe(true);

    const otherUpdates = await fetchUpdates("user-bob");
    expect(otherUpdates).toHaveLength(1);
    expect(otherUpdates[0].viewerIsOwner).toBe(false);
  });

  it("newest-first ordering with limit/offset", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
      await insertUpdate({
        id: "up-old",
        by: "User",
        category: 0,
        urgent: false,
        uid: "uid-1",
        title: "Old update",
        body: "Old body",
        when: -1,
      });

      vi.setSystemTime(new Date("2026-03-01T11:00:00Z"));
      await insertUpdate({
        id: "up-mid",
        by: "User",
        category: 0,
        urgent: false,
        uid: "uid-1",
        title: "Mid update",
        body: "Mid body",
        when: -1,
      });

      vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
      await insertUpdate({
        id: "up-new",
        by: "User",
        category: 0,
        urgent: false,
        uid: "uid-1",
        title: "New update",
        body: "New body",
        when: -1,
      });

      // Default: newest first
      const all = await fetchUpdates("uid-1");
      expect(all.map((u) => u.id)).toEqual(["up-new", "up-mid", "up-old"]);

      // With limit
      const limited = await fetchUpdates("uid-1", { limit: 2 });
      expect(limited.map((u) => u.id)).toEqual(["up-new", "up-mid"]);

      // With limit and offset
      const offsetLimited = await fetchUpdates("uid-1", { limit: 1, offset: 1 });
      expect(offsetLimited.map((u) => u.id)).toEqual(["up-mid"]);

      // With offset only
      const offsetOnly = await fetchUpdates("uid-1", { offset: 2 });
      expect(offsetOnly.map((u) => u.id)).toEqual(["up-old"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("getUpdateById returns the record, and null for an unknown id", async () => {
    await insertUpdate({
      id: "up-target",
      by: "Charlie",
      category: 2,
      urgent: false,
      uid: "uid-charlie",
      title: "Charlie's Update",
      body: "Details of Charlie's update",
      when: 1,
    });

    const found = await getUpdateById("up-target", "uid-charlie");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("up-target");
    expect(found?.title).toBe("Charlie's Update");
    expect(found?.viewerIsOwner).toBe(true);

    const notFound = await getUpdateById("unknown-id", "uid-charlie");
    expect(notFound).toBeNull();
  });

  it("deleteUpdate: own uid deletes and returns true; a different uid returns false and leaves the record; a second delete of the same id returns false", async () => {
    await insertUpdate({
      id: "up-del",
      by: "Dave",
      category: 0,
      urgent: false,
      uid: "owner-uid",
      title: "To Be Deleted",
      body: "Some body",
      when: -1,
    });

    // A different uid returns false and leaves the record
    const wrongUidResult = await deleteUpdate("up-del", "different-uid");
    expect(wrongUidResult).toBe(false);
    const stillThere = await getUpdateById("up-del", "owner-uid");
    expect(stillThere).not.toBeNull();

    // Own uid deletes and returns true
    const ownUidResult = await deleteUpdate("up-del", "owner-uid");
    expect(ownUidResult).toBe(true);
    const gone = await getUpdateById("up-del", "owner-uid");
    expect(gone).toBeNull();

    // A second delete of the same id returns false
    const secondDeleteResult = await deleteUpdate("up-del", "owner-uid");
    expect(secondDeleteResult).toBe(false);
  });

  it("execute is never called on any memory path", async () => {
    await insertUpdate({
      id: "up-mem",
      by: "Eve",
      category: 0,
      urgent: false,
      uid: "uid-eve",
      title: "Memory Only",
      body: "No DB execution",
      when: 1,
    });

    await fetchUpdates("uid-eve");
    await getUpdateById("up-mem", "uid-eve");
    await deleteUpdate("up-mem", "uid-eve");

    expect(execute).not.toHaveBeenCalled();
  });

  it("shares the store across module instances (globalThis: next dev compiles the server action and the route handler separately)", async () => {
    await insertUpdate({
      id: "up-shared",
      by: "Frank",
      category: 0,
      urgent: false,
      uid: "uid-frank",
      title: "Visible from any bundle",
      body: "Written by one module instance",
      when: -1,
    });

    // モジュールを再評価して別インスタンス（= 別バンドル相当）を取得する。
    // ストアが globalThis ではなくモジュールスコープだと、ここで空になる。
    vi.resetModules();
    const reimported = await import("@/lib/updates");

    const seen = await reimported.fetchUpdates("uid-frank");
    expect(seen.map((update) => update.id)).toEqual(["up-shared"]);
    expect(await reimported.deleteUpdate("up-shared", "uid-frank")).toBe(true);
  });

  it("when isTursoConfigured() is false and isMemoryFallbackEnabled() is false, fetchUpdates rejects with TursoUnavailableError", async () => {
    vi.mocked(isTursoConfigured).mockReturnValue(false);
    vi.mocked(isMemoryFallbackEnabled).mockReturnValue(false);

    await expect(fetchUpdates("viewer-1")).rejects.toThrow(TursoUnavailableError);
  });
});
