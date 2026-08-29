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

vi.mock("@/lib/prioritization", () => ({
  getPrioritizationBoard: vi.fn(),
  savePrioritizationBoard: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/turso", () => ({
  TursoUnavailableError: class TursoUnavailableError extends Error {},
}));

import { GET, PUT } from "@/app/api/prioritization/route";
import { getPrioritizationBoard, savePrioritizationBoard } from "@/lib/prioritization";
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

    it("returns board state when authenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);

      const mockBoard = {
        columns: {
          backlog: { id: "backlog", title: "Unassigned", itemIds: ["u1"], removable: false },
        },
        columnOrder: ["backlog"],
      };

      vi.mocked(getPrioritizationBoard).mockResolvedValue(mockBoard);

      const response = await GET();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        board: mockBoard,
      });
    });
  });

  describe("PUT", () => {
    it("saves board state successfully", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);
      vi.mocked(savePrioritizationBoard).mockResolvedValue(undefined);

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
      expect(savePrioritizationBoard).toHaveBeenCalledWith(mockBoard);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });
});
