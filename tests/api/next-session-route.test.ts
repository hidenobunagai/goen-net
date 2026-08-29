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

vi.mock("@/lib/turso", () => ({
  getNextSession: vi.fn(),
  upsertNextSession: vi.fn(),
  TursoUnavailableError: class TursoUnavailableError extends Error {},
}));

import { GET, POST } from "@/app/api/next-session/route";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession, upsertNextSession } from "@/lib/turso";

describe("/api/next-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("returns next session info when authenticated", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);

      vi.mocked(getNextSession).mockResolvedValue({
        startAt: "2026-09-01T10:00:00Z",
        endAt: "2026-09-01T12:00:00Z",
        location: "Tokyo, Japan",
        updatedAt: "2026-08-29T10:00:00Z",
      });

      const response = await GET();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        session: {
          startAt: "2026-09-01T10:00:00Z",
          endAt: "2026-09-01T12:00:00Z",
          location: "Tokyo, Japan",
          updatedAt: "2026-08-29T10:00:00Z",
        },
      });
    });
  });

  describe("POST", () => {
    it("validates that startAt is provided", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);

      const request = new Request("https://example.com/api/next-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: "", location: "Online" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(422);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: { code: "INVALID_START", message: "Start time is required." },
      });
    });

    it("updates next session successfully", async () => {
      vi.mocked(getOptionalUserSession).mockResolvedValue({
        user: { email: "member@example.com" },
      } as never);
      vi.mocked(upsertNextSession).mockResolvedValue(undefined);

      const request = new Request("https://example.com/api/next-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: "2026-09-01T10:00:00Z",
          endAt: "2026-09-01T12:00:00Z",
          location: "https://zoom.us/j/123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(upsertNextSession).toHaveBeenCalledWith({
        startAt: "2026-09-01T10:00:00Z",
        endAt: "2026-09-01T12:00:00Z",
        location: "https://zoom.us/j/123",
      });
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });
});
