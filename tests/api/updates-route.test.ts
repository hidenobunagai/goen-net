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

vi.mock("@/lib/updates", () => ({
  fetchUpdates: vi.fn(),
}));

vi.mock("@/lib/turso", () => ({
  TursoUnavailableError: class TursoUnavailableError extends Error {},
}));

import { GET } from "@/app/api/updates/route";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import type { UpdateRecord } from "@/lib/updates";
import { fetchUpdates } from "@/lib/updates";

describe("GET /api/updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns updates for the signed-in user and clamps the limit", async () => {
    vi.mocked(getOptionalUserSession).mockResolvedValue({
      user: { email: "member@example.com" },
    } as never);

    const updates: UpdateRecord[] = [
      {
        id: "update-1",
        by: "Member",
        category: 0,
        urgent: false,
        uid: "member@example.com",
        title: "Update title",
        body: "Update body",
        when: -1,
        createdAt: "2026-03-23T00:00:00.000Z",
        viewerIsOwner: true,
      },
    ];

    vi.mocked(fetchUpdates).mockResolvedValue(updates);

    const response = await GET(new Request("https://example.com/api/updates?limit=999") as never);

    expect(response.status).toBe(200);
    expect(fetchUpdates).toHaveBeenCalledWith("member@example.com", { limit: 200 });
    await expect(response.json()).resolves.toEqual({ ok: true, updates });
  });

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(getOptionalUserSession).mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/updates") as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required." },
    });
  });

  it("returns 503 when the database is unavailable", async () => {
    vi.mocked(getOptionalUserSession).mockResolvedValue({
      user: { email: "member@example.com" },
    } as never);
    vi.mocked(fetchUpdates).mockRejectedValue(new TursoUnavailableError("db unavailable"));

    const response = await GET(new Request("https://example.com/api/updates") as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The updates cannot be loaded because the database is unavailable right now.",
      },
    });
  });
});
