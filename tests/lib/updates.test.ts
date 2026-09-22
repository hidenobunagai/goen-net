/* eslint-disable @typescript-eslint/no-explicit-any */
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
  isTursoConfigured: vi.fn(),
  execute: vi.fn(),
  TursoUnavailableError: class TursoUnavailableError extends Error {
    constructor(message = "Turso database configuration is not available.") {
      super(message);
      this.name = "TursoUnavailableError";
    }
  },
}));

import { logger } from "@/lib/logger";
import { execute, isTursoConfigured, TursoUnavailableError } from "@/lib/turso";
import {
  CreateUpdateSchema,
  deleteUpdate,
  fetchUpdates,
  getUpdateById,
  insertUpdate,
} from "@/lib/updates";

describe("updates", () => {
  describe("CreateUpdateSchema", () => {
    it("title max 200 (exactly 200 passes, 201 fails)", () => {
      expect(CreateUpdateSchema.safeParse({ title: "a".repeat(200) }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
    });

    it("body max 10000 (10000 passes, 10001 fails)", () => {
      expect(CreateUpdateSchema.safeParse({ body: "b".repeat(10000) }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ body: "b".repeat(10001) }).success).toBe(false);
    });

    it("by max 100 (100 passes, 101 fails)", () => {
      expect(CreateUpdateSchema.safeParse({ by: "c".repeat(100) }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ by: "c".repeat(101) }).success).toBe(false);
    });

    it("category refine accepts 0/1/2, rejects 3/-1/1.5", () => {
      expect(CreateUpdateSchema.safeParse({ category: 0 }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ category: 1 }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ category: 2 }).success).toBe(true);

      expect(CreateUpdateSchema.safeParse({ category: 3 }).success).toBe(false);
      expect(CreateUpdateSchema.safeParse({ category: -1 }).success).toBe(false);
      expect(CreateUpdateSchema.safeParse({ category: 1.5 }).success).toBe(false);
    });

    it("when refine accepts -1/1, rejects 0/2", () => {
      expect(CreateUpdateSchema.safeParse({ when: -1 }).success).toBe(true);
      expect(CreateUpdateSchema.safeParse({ when: 1 }).success).toBe(true);

      expect(CreateUpdateSchema.safeParse({ when: 0 }).success).toBe(false);
      expect(CreateUpdateSchema.safeParse({ when: 2 }).success).toBe(false);
    });

    it("optional fields default absent", () => {
      const parsed = CreateUpdateSchema.parse({});
      expect(parsed).toEqual({});
      expect(parsed.by).toBeUndefined();
      expect(parsed.category).toBeUndefined();
      expect(parsed.urgent).toBeUndefined();
      expect(parsed.priority).toBeUndefined();
      expect(parsed.title).toBeUndefined();
      expect(parsed.update).toBeUndefined();
      expect(parsed.body).toBeUndefined();
      expect(parsed.when).toBeUndefined();
    });
  });

  describe("fail-loud (when isTursoConfigured() returns false)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(isTursoConfigured).mockReturnValue(false);
    });

    it("fetchUpdates throws TursoUnavailableError", async () => {
      await expect(fetchUpdates("viewer-1")).rejects.toThrow(TursoUnavailableError);
    });

    it("getUpdateById throws TursoUnavailableError", async () => {
      await expect(getUpdateById("id-1", "viewer-1")).rejects.toThrow(TursoUnavailableError);
    });

    it("insertUpdate throws TursoUnavailableError", async () => {
      await expect(
        insertUpdate({
          id: "id-1",
          by: "Author",
          category: 0,
          urgent: false,
          uid: "uid-1",
          title: "Title",
          body: "Body",
          when: 1,
        })
      ).rejects.toThrow(TursoUnavailableError);
    });

    it("deleteUpdate throws TursoUnavailableError", async () => {
      await expect(deleteUpdate("id-1", "uid-1")).rejects.toThrow(TursoUnavailableError);
    });
  });

  describe("with isTursoConfigured() true and execute mocked", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(isTursoConfigured).mockReturnValue(true);
    });

    describe("fetchUpdates", () => {
      it("maps rows (viewerIsOwner true when uid matches, category fallback to 0, when fallback -1, title fallback to body slice then 'Untitled', skips rows without id)", async () => {
        const mockRows = [
          // Row 1: viewerIsOwner true when uid matches viewerId
          {
            id: "update-1",
            by_name: "Alice",
            category: 1,
            urgent: 1,
            uid: "current-viewer",
            title: "Normal Title",
            body: "Normal Body",
            when_value: 1,
            created_at: "2026-03-01T12:00:00Z",
          },
          // Row 2: viewerIsOwner false, category fallback to 0, when fallback to -1, title fallback to body slice
          {
            id: "update-2",
            by_name: "Bob",
            category: 9, // not 1 or 2 -> fallback to 0
            urgent: 0,
            uid: "different-user",
            title: "   ", // whitespace only -> fallback to body slice
            body: "Long body text ".repeat(10),
            when_value: -1, // <= 0 -> fallback to -1
            created_at: "2026-03-02T12:00:00Z",
          },
          // Row 3: title fallback to 'Untitled' when body is also empty, when fallback to -1 when null
          {
            id: "update-3",
            by_name: null,
            category: 0,
            urgent: 0,
            uid: null,
            title: null,
            body: null,
            when_value: null,
            created_at: "2026-03-03T12:00:00Z",
          },
          // Row 4: skips rows without id (null id)
          {
            id: null,
            by_name: "Ghost",
            title: "No ID",
          },
          // Row 5: skips rows without id (empty string id)
          {
            id: "",
            by_name: "Ghost2",
            title: "Empty ID",
          },
          // Row 6: non-object row
          "not-an-object",
        ];

        vi.mocked(execute).mockResolvedValueOnce({ rows: mockRows } as any);

        const updates = await fetchUpdates("current-viewer", { limit: 10, offset: 0 });

        expect(execute).toHaveBeenCalledWith(
          "SELECT * FROM updates ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
          [10, 0]
        );
        expect(updates).toHaveLength(3);

        // Row 1 checks
        expect(updates[0]?.viewerIsOwner).toBe(true);
        expect(updates[0]?.category).toBe(1);
        expect(updates[0]?.when).toBe(1);
        expect(updates[0]?.title).toBe("Normal Title");

        // Row 2 checks
        expect(updates[1]?.viewerIsOwner).toBe(false);
        expect(updates[1]?.category).toBe(0);
        expect(updates[1]?.when).toBe(-1);
        expect(updates[1]?.title).toBe("Long body text ".repeat(10).slice(0, 80));

        // Row 3 checks
        expect(updates[2]?.viewerIsOwner).toBe(false);
        expect(updates[2]?.category).toBe(0);
        expect(updates[2]?.when).toBe(-1);
        expect(updates[2]?.title).toBe("Untitled");
        expect(updates[2]?.by).toBe("Unknown");
      });
    });

    describe("getUpdateById", () => {
      it("returns null on empty", async () => {
        vi.mocked(execute).mockResolvedValueOnce({ rows: [] } as any);

        const result = await getUpdateById("nonexistent-id", "viewer-id");

        expect(result).toBeNull();
        expect(execute).toHaveBeenCalledWith("SELECT * FROM updates WHERE id = ?1 LIMIT 1", [
          "nonexistent-id",
        ]);
      });

      it("returns UpdateRecord when found", async () => {
        vi.mocked(execute).mockResolvedValueOnce({
          rows: [
            {
              id: "update-123",
              by_name: "Alice",
              category: 2,
              urgent: 1,
              uid: "viewer-id",
              title: "My Update",
              body: "Update details",
              when_value: 1,
              created_at: "2026-03-01T00:00:00Z",
            },
          ],
        } as any);

        const result = await getUpdateById("update-123", "viewer-id");

        expect(result).toEqual({
          id: "update-123",
          by: "Alice",
          category: 2,
          urgent: true,
          uid: "viewer-id",
          title: "My Update",
          body: "Update details",
          when: 1,
          createdAt: "2026-03-01T00:00:00Z",
          viewerIsOwner: true,
        });
      });
    });

    describe("deleteUpdate", () => {
      it("returns true when rowsAffected=1", async () => {
        vi.mocked(execute).mockResolvedValueOnce({ rowsAffected: 1 } as any);

        const result = await deleteUpdate("up-1", "user-1");

        expect(result).toBe(true);
        expect(execute).toHaveBeenCalledWith("DELETE FROM updates WHERE id = ?1 AND uid = ?2", [
          "up-1",
          "user-1",
        ]);
      });

      it("returns false when rowsAffected=0", async () => {
        vi.mocked(execute).mockResolvedValueOnce({ rowsAffected: 0 } as any);

        const result = await deleteUpdate("up-1", "user-1");

        expect(result).toBe(false);
      });
    });

    describe("insertUpdate", () => {
      it("execute rejecting inside ensureUserProfile rethrows", async () => {
        const error = new Error("Database profile error");
        vi.mocked(execute).mockRejectedValueOnce(error);

        await expect(
          insertUpdate({
            id: "up-new",
            by: "Alice",
            category: 0,
            urgent: false,
            uid: "user-1",
            title: "Title",
            body: "Body",
            when: 1,
          })
        ).rejects.toThrow("Database profile error");

        expect(logger.error).toHaveBeenCalledWith(
          "[updates] Failed to ensure user profile",
          expect.objectContaining({
            error: expect.objectContaining({ message: "Database profile error" }),
          })
        );
      });

      it("inserts update successfully when execute resolves", async () => {
        vi.mocked(execute)
          .mockResolvedValueOnce({ rowsAffected: 1 } as any) // ensureUserProfile
          .mockResolvedValueOnce({ rowsAffected: 1 } as any); // insertUpdate

        await insertUpdate({
          id: "up-new",
          by: "Alice",
          category: 2,
          urgent: true,
          uid: "user-1",
          title: "New Title",
          body: "New Body",
          when: 1,
        });

        expect(execute).toHaveBeenCalledTimes(2);
      });
    });
  });
});
