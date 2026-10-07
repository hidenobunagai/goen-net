import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({
  getOptionalUserSession: vi.fn(),
}));

vi.mock("@/lib/prioritization", () => {
  class PrioritizationConflictError extends Error {
    status = 409;
    constructor(
      message = "The board was changed by another member. Reload to see the latest version."
    ) {
      super(message);
      this.name = "PrioritizationConflictError";
    }
  }
  return {
    getPrioritizationBoard: vi.fn(),
    savePrioritizationBoard: vi.fn(),
    PrioritizationConflictError,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/turso", () => ({
  TursoUnavailableError: class TursoUnavailableError extends Error {},
}));

import { GET, PUT } from "@/app/api/prioritization/route";
import {
  getPrioritizationBoard,
  PrioritizationConflictError,
  savePrioritizationBoard,
} from "@/lib/prioritization";
import { getOptionalUserSession } from "@/lib/session";

describe("/api/prioritization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("returns board state and updatedAt when authenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);

      const mockBoard = {
        columns: {
          backlog: { id: "backlog", title: "Unassigned", itemIds: ["u1"], removable: false },
        },
        columnOrder: ["backlog"],
      };

      vi.mocked(getPrioritizationBoard).mockResolvedValue({
        data: mockBoard,
        updatedAt: "2026-10-07T12:00:00.000Z",
      });

      const response = await GET();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        board: mockBoard,
        updatedAt: "2026-10-07T12:00:00.000Z",
      });
    });
  });

  describe("PUT", () => {
    it("saves board state successfully when baseUpdatedAt is omitted", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);
      vi.mocked(savePrioritizationBoard).mockResolvedValue("2026-10-07T12:00:00.000Z");

      const mockBoard = {
        columns: {
          col1: { id: "col1", title: "High Priority", itemIds: ["u1"], removable: true },
        },
        columnOrder: ["col1"],
      };

      const request = new Request("https://example.com/api/prioritization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: mockBoard }),
      });

      const response = await PUT(request as never);
      expect(response.status).toBe(200);
      expect(savePrioritizationBoard).toHaveBeenCalledWith(mockBoard, null);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        updatedAt: "2026-10-07T12:00:00.000Z",
      });
    });

    it("passes baseUpdatedAt to lib and returns updatedAt on success", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);
      vi.mocked(savePrioritizationBoard).mockResolvedValue("2026-10-07T12:00:00.001Z");

      const mockBoard = {
        columns: {
          col1: { id: "col1", title: "High Priority", itemIds: ["u1"], removable: true },
        },
        columnOrder: ["col1"],
      };

      const request = new Request("https://example.com/api/prioritization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: mockBoard, baseUpdatedAt: "2026-10-07T12:00:00.000Z" }),
      });

      const response = await PUT(request as never);
      expect(response.status).toBe(200);
      expect(savePrioritizationBoard).toHaveBeenCalledWith(
        mockBoard,
        "2026-10-07T12:00:00.000Z"
      );
      await expect(response.json()).resolves.toEqual({
        ok: true,
        updatedAt: "2026-10-07T12:00:00.001Z",
      });
    });

    it("returns 409 SAVE_CONFLICT when lib throws PrioritizationConflictError", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);
      vi.mocked(savePrioritizationBoard).mockRejectedValue(new PrioritizationConflictError());

      const request = new Request("https://example.com/api/prioritization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: {}, baseUpdatedAt: "2026-10-07T11:00:00.000Z" }),
      });

      const response = await PUT(request as never);
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json).toEqual({
        ok: false,
        error: {
          code: "SAVE_CONFLICT",
          message: "The board was changed by another member. Reload to see the latest version.",
        },
      });
    });

    it("returns 400 INVALID_BODY when baseUpdatedAt is invalid", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);

      const request = new Request("https://example.com/api/prioritization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: {}, baseUpdatedAt: 12345 }),
      });

      const response = await PUT(request as never);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toEqual({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "baseUpdatedAt must be a string or null.",
        },
      });
      expect(savePrioritizationBoard).not.toHaveBeenCalled();
    });
  });
});
