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

vi.mock("@/lib/worksheets", () => ({
  getWorksheet: vi.fn(),
  upsertWorksheet: vi.fn(),
  deleteWorksheet: vi.fn(),
  isValidWorksheetRole: (role: string) => ["presenter", "coach", "observer"].includes(role),
}));

vi.mock("@/lib/turso", () => ({
  TursoUnavailableError: class TursoUnavailableError extends Error {},
}));

import { DELETE, GET, PUT } from "@/app/api/worksheets/[role]/route";
import { getOptionalUserSession } from "@/lib/session";
import { deleteWorksheet, getWorksheet, upsertWorksheet } from "@/lib/worksheets";

describe("/api/worksheets/[role]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 400 for invalid role", async () => {
      const response = await GET(
        new Request("https://example.com/api/worksheets/invalid") as never,
        {
          params: Promise.resolve({ role: "invalid" }),
        }
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      });
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue(null);

      const response = await GET(new Request("https://example.com/api/worksheets/coach") as never, {
        params: Promise.resolve({ role: "coach" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns worksheet data when authenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "coach@example.com" },
      } as never);

      vi.mocked(getWorksheet).mockResolvedValue({
        uid: "coach@example.com",
        role: "coach",
        data: { title: "Session Coaching" },
        updatedAt: "2026-08-29T10:00:00Z",
      });

      const response = await GET(new Request("https://example.com/api/worksheets/coach") as never, {
        params: Promise.resolve({ role: "coach" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        worksheet: {
          data: { title: "Session Coaching" },
          updatedAt: "2026-08-29T10:00:00Z",
          role: "coach",
        },
      });
    });
  });

  describe("PUT", () => {
    it("saves worksheet successfully", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "presenter@example.com" },
      } as never);
      vi.mocked(upsertWorksheet).mockResolvedValue(undefined);

      const request = new Request("https://example.com/api/worksheets/presenter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { issue: "Scaling challenges" } }),
      });

      const response = await PUT(request as never, {
        params: Promise.resolve({ role: "presenter" }),
      });

      expect(response.status).toBe(200);
      expect(upsertWorksheet).toHaveBeenCalledWith("presenter@example.com", "presenter", {
        issue: "Scaling challenges",
      });
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });

  describe("DELETE", () => {
    it("clears worksheet successfully", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "observer@example.com" },
      } as never);
      vi.mocked(deleteWorksheet).mockResolvedValue(undefined);

      const response = await DELETE(
        new Request("https://example.com/api/worksheets/observer") as never,
        {
          params: Promise.resolve({ role: "observer" }),
        }
      );

      expect(response.status).toBe(200);
      expect(deleteWorksheet).toHaveBeenCalledWith("observer@example.com", "observer");
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });
});
