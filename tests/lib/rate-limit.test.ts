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
    it("issues a single atomic UPSERT and allows the first request", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      vi.mocked(execute).mockResolvedValueOnce({ rows: [{ count: 1 }] } as never);

      const res = await checkRateLimit("test:db:1", { limit: 5, windowMs: 60000 });
      expect(res).toBe(true);
      expect(execute).toHaveBeenCalledTimes(1);
      const [sql, args] = vi.mocked(execute).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("ON CONFLICT(key) DO UPDATE");
      expect(sql).toContain("RETURNING count");
      expect(args[0]).toBe("test:db:1");
    });

    it("blocks when the returned count exceeds the limit", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      vi.mocked(execute).mockResolvedValueOnce({ rows: [{ count: 6 }] } as never);

      const res = await checkRateLimit("test:db:2", { limit: 5, windowMs: 60000 });
      expect(res).toBe(false);
    });

    it("allows exactly up to the limit", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      vi.mocked(execute).mockResolvedValueOnce({ rows: [{ count: 5 }] } as never);

      const res = await checkRateLimit("test:db:3", { limit: 5, windowMs: 60000 });
      expect(res).toBe(true);
    });

    it("falls back to memory when the UPSERT fails", async () => {
      vi.mocked(isTursoConfigured).mockReturnValue(true);
      vi.mocked(execute).mockRejectedValueOnce(new Error("db down"));

      const key = `test:db:fallback:${Date.now()}`;
      const res = await checkRateLimit(key, { limit: 1, windowMs: 60000 });
      expect(res).toBe(true);
    });
  });
});
