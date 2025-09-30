import { beforeEach, describe, expect, it, vi } from "vitest";

const randomUUIDMock = vi.fn(() => "test-id");

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: randomUUIDMock,
  default: { randomUUID: randomUUIDMock },
}));

vi.mock("@/lib/updates", () => ({
  fetchUpdates: vi.fn(),
  getUpdateById: vi.fn(),
  insertUpdate: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  requireJson: vi.fn(),
  JsonBodyError: class JsonBodyError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => true),
}));

process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret";

const { getServerSession } = await import("next-auth");
const { fetchUpdates, getUpdateById, insertUpdate } = await import(
  "@/lib/updates"
);
const { requireJson, JsonBodyError } = await import("@/lib/utils");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { GET, POST } = await import("@/app/api/updates/route");

describe("/api/updates route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated GET", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    const request = new Request("http://localhost/api/updates");

    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("applies rate limit on GET", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(checkRateLimit).mockReturnValueOnce(false);
    const request = new Request("http://localhost/api/updates");

    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMIT");
  });

  it("returns updates on GET", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(checkRateLimit).mockReturnValueOnce(true);
    vi.mocked(fetchUpdates).mockResolvedValueOnce([
      {
        id: "1",
        by: "Alice",
        category: 0,
        urgent: false,
        uid: "user@example.com",
        title: "Update",
        body: "Body",
        when: -1,
        createdAt: new Date().toISOString(),
        viewerIsOwner: true,
      },
    ]);

    const request = new Request("http://localhost/api/updates");
    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body.updates)).toBe(true);
    expect(body.updates).toHaveLength(1);
  });

  it("rejects POST without JSON body", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(requireJson).mockRejectedValueOnce(
      new JsonBodyError("invalid", 400)
    );
    const request = new Request("http://localhost/api/updates", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("rejects POST without body text", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com", name: "User" },
    } as never);
    vi.mocked(requireJson).mockResolvedValueOnce({ update: "" });

    const request = new Request("http://localhost/api/updates", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("enforces POST rate limit", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com", name: "User" },
    } as never);
    vi.mocked(requireJson).mockResolvedValueOnce({
      title: "Update title",
      update: "text",
      when: 1,
      category: 0,
      urgent: false,
    });
    vi.mocked(checkRateLimit).mockReturnValueOnce(false);

    const request = new Request("http://localhost/api/updates", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMIT");
  });

  it("creates update on POST and returns record", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com", name: "User" },
    } as never);
    vi.mocked(requireJson).mockResolvedValueOnce({
      title: "Update title",
      update: "text",
      when: 1,
      category: 0,
      urgent: false,
    });
    vi.mocked(checkRateLimit).mockReturnValueOnce(true);
    vi.mocked(insertUpdate).mockResolvedValueOnce();
    const mockRecord = {
      id: "new-id",
      by: "User",
      category: 0,
      urgent: false,
      uid: "user@example.com",
      title: "Update title",
      body: "text",
      when: 1 as const,
      createdAt: new Date().toISOString(),
      viewerIsOwner: true,
    };
    vi.mocked(getUpdateById).mockResolvedValueOnce(mockRecord as never);

    const request = new Request("http://localhost/api/updates", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toBeDefined();
    expect(body.update).toEqual(mockRecord);
    expect(insertUpdate).toHaveBeenCalled();
    expect(getUpdateById).toHaveBeenCalledWith(body.id, "user@example.com");
  });

  it("falls back when created record cannot be loaded", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "user@example.com", name: "User" },
    } as never);
    vi.mocked(requireJson).mockResolvedValueOnce({
      title: "Fallback title",
      update: "text",
      when: -1,
      category: 1,
      urgent: true,
    });
    vi.mocked(checkRateLimit).mockReturnValueOnce(true);
    vi.mocked(insertUpdate).mockResolvedValueOnce();
    vi.mocked(getUpdateById).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/updates", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.update).toMatchObject({
      id: body.id,
      by: "User",
      category: 1,
      urgent: true,
      uid: "user@example.com",
      title: "Fallback title",
      body: "text",
      when: -1,
      viewerIsOwner: true,
    });
    expect(typeof body.update.createdAt).toBe("string");
  });
});
