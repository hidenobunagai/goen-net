import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/updates", () => ({
  getUpdateById: vi.fn(),
  deleteUpdate: vi.fn(),
}));

process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret";

const { getServerSession } = await import("next-auth");
const { getUpdateById, deleteUpdate } = await import("@/lib/updates");
const { GET, DELETE } = await import("@/app/api/updates/[id]/route");

describe("/api/updates/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
      const response = await GET(
        new NextRequest("http://localhost/api/updates/1"),
        { params: { id: "1" } }
      );
      const json = await response.json();
      expect(response.status).toBe(401);
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 400 when user has no email", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
      const response = await GET(
        new NextRequest("http://localhost/api/updates/1"),
        { params: { id: "1" } }
      );
      const json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMAIL");
    });

    it("returns 404 when update not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "user@example.com" },
      } as never);
      vi.mocked(getUpdateById).mockResolvedValueOnce(null);
      const response = await GET(
        new NextRequest("http://localhost/api/updates/1"),
        { params: { id: "1" } }
      );
      const json = await response.json();
      expect(response.status).toBe(404);
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("returns update details", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "user@example.com" },
      } as never);
      vi.mocked(getUpdateById).mockResolvedValueOnce({ id: "1" } as never);
      const response = await GET(
        new NextRequest("http://localhost/api/updates/1"),
        { params: { id: "1" } }
      );
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.update.id).toBe("1");
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
      const response = await DELETE(
        new NextRequest("http://localhost/api/updates/1", { method: "DELETE" }),
        {
          params: { id: "1" },
        }
      );
      const json = await response.json();
      expect(response.status).toBe(401);
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 400 when user has no email", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
      const response = await DELETE(
        new NextRequest("http://localhost/api/updates/1", { method: "DELETE" }),
        {
          params: { id: "1" },
        }
      );
      const json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.code).toBe("NO_EMAIL");
    });

    it("returns 403 when deleteUpdate returns false", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "user@example.com" },
      } as never);
      vi.mocked(deleteUpdate).mockResolvedValueOnce(false);
      const response = await DELETE(
        new NextRequest("http://localhost/api/updates/1", { method: "DELETE" }),
        {
          params: { id: "1" },
        }
      );
      const json = await response.json();
      expect(response.status).toBe(403);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns ok when deletion succeeds", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "user@example.com" },
      } as never);
      vi.mocked(deleteUpdate).mockResolvedValueOnce(true);
      const response = await DELETE(
        new NextRequest("http://localhost/api/updates/1", { method: "DELETE" }),
        {
          params: { id: "1" },
        }
      );
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });
});
