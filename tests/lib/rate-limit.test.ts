import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/turso", () => ({
  isTursoConfigured: vi.fn(() => false), // test memory fallback first
  execute: vi.fn(),
}));

import { checkRateLimit } from "@/lib/rate-limit";
import { execute, isTursoConfigured } from "@/lib/turso";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("In-memory rate limiter", () => {
    it("allows requests under the limit", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(false);
      const key = `test:mem:${Date.now()}`;

      const res1 = await checkRateLimit(key, { limit: 2, windowMs: 1000 });
      const res2 = await checkRateLimit(key, { limit: 2, windowMs: 1000 });

      expect(res1).toBe(true);
      expect(res2).toBe(true);
    });

    it("blocks requests over the limit", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(false);
      const key = `test:mem:block:${Date.now()}`;

      await checkRateLimit(key, { limit: 2, windowMs: 1000 });
      await checkRateLimit(key, { limit: 2, windowMs: 1000 });
      const res3 = await checkRateLimit(key, { limit: 2, windowMs: 1000 });

      expect(res3).toBe(false);
    });
  });

  describe("Persistent rate limiter (Turso)", () => {
    it("handles new rate limit entry in database", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      vi.mocked(execute)
        .mockResolvedValueOnce({ rows: [] } as never) // select -> empty
        .mockResolvedValueOnce({ rows: [] } as never); // insert

      const res = await checkRateLimit("test:db:1", { limit: 5, windowMs: 60000 });
      expect(res).toBe(true);
      expect(execute).toHaveBeenCalledWith(
        "SELECT count, expires_at FROM rate_limit WHERE key = ?",
        ["test:db:1"]
      );
    });

    it("blocks when database count meets or exceeds limit", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      const futureUnix = Math.floor(Date.now() / 1000) + 100;
      vi.mocked(execute).mockResolvedValueOnce({
        rows: [{ count: 5, expires_at: futureUnix }],
      } as never);

      const res = await checkRateLimit("test:db:2", { limit: 5, windowMs: 60000 });
      expect(res).toBe(false);
    });
  });
});
