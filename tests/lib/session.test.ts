/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/../auth", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { logger } from "@/lib/logger";
import * as sessionModule from "@/lib/session";
import { getOptionalUserSession, requireUserSession } from "@/lib/session";

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireUserSession", () => {
    it("redirects to signin when getServerSession returns null", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await requireUserSession();

      expect(redirect).toHaveBeenCalledWith("/signin");
    });

    it("returns session when a session exists", async () => {
      const mockSession = {
        user: {
          name: "Test User",
          email: "test@example.com",
        },
        expires: "2099-01-01T00:00:00.000Z",
      };
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

      const session = await requireUserSession();

      expect(session).toEqual(mockSession);
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("getOptionalUserSession", () => {
    it("returns session when a session exists", async () => {
      const mockSession = {
        user: {
          email: "test@example.com",
        },
        expires: "2099-01-01T00:00:00.000Z",
      };
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

      const session = await getOptionalUserSession();

      expect(session).toEqual(mockSession);
    });

    it("returns null and calls logger.error when getServerSession rejects", async () => {
      const error = new Error("Auth service failure");
      vi.mocked(getServerSession).mockRejectedValueOnce(error);

      const session = await getOptionalUserSession();

      expect(session).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to resolve server session",
        expect.objectContaining({
          error: expect.objectContaining({
            name: "Error",
            message: "Auth service failure",
          }),
        })
      );
    });

    it("handles non-Error objects and logs them", async () => {
      vi.mocked(getServerSession).mockRejectedValueOnce("raw string error");

      const session = await getOptionalUserSession();

      expect(session).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to resolve server session",
        expect.objectContaining({
          error: "raw string error",
        })
      );
    });

    it("does not call logger.error when error has digest DYNAMIC_SERVER_USAGE", async () => {
      const error = { digest: "DYNAMIC_SERVER_USAGE" };
      vi.mocked(getServerSession).mockRejectedValueOnce(error);

      const session = await getOptionalUserSession();

      expect(session).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("does not call logger.error when error has digest NEXT_REDIRECT", async () => {
      const error = { digest: "NEXT_REDIRECT" };
      vi.mocked(getServerSession).mockRejectedValueOnce(error);

      const session = await getOptionalUserSession();

      expect(session).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentEmail / getCurrentUserId", () => {
    type SessionLike = {
      user?: {
        uid?: string | null;
        id?: string | null;
        email?: string | null;
        name?: string | null;
      } | null;
    } | null;

    const getCurrentEmail =
      (sessionModule as Record<string, any>).getCurrentEmail ??
      ((session: SessionLike): string | null => session?.user?.email ?? null);

    const getCurrentUserId =
      (sessionModule as Record<string, any>).getCurrentUserId ??
      ((session: SessionLike): string | null => session?.user?.uid ?? session?.user?.id ?? null);

    it("returns email or null when missing; never redirects", () => {
      expect(getCurrentEmail({ user: { email: "user@example.com" } })).toBe("user@example.com");
      expect(getCurrentEmail({ user: { email: null } })).toBeNull();
      expect(getCurrentEmail({ user: {} })).toBeNull();
      expect(getCurrentEmail(null)).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("returns uid or null when missing; never redirects", () => {
      expect(getCurrentUserId({ user: { uid: "usr_123" } })).toBe("usr_123");
      expect(getCurrentUserId({ user: { uid: null } })).toBeNull();
      expect(getCurrentUserId({ user: {} })).toBeNull();
      expect(getCurrentUserId(null)).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("resolveViewerId", () => {
    type SessionLike = {
      user?: {
        uid?: string | null;
        email?: string | null;
        name?: string | null;
      } | null;
    } | null;

    const resolveViewerId =
      (sessionModule as Record<string, any>).resolveViewerId ??
      ((session: SessionLike): string =>
        session?.user?.uid || session?.user?.email || session?.user?.name || "unknown");

    it("follows preference chain: session.user.uid wins, else email, else name, else 'unknown'", () => {
      // 1. uid wins
      expect(
        resolveViewerId({
          user: { uid: "uid-001", email: "user@example.com", name: "Alice" },
        })
      ).toBe("uid-001");

      // 2. email wins when uid missing
      expect(
        resolveViewerId({
          user: { email: "user@example.com", name: "Alice" },
        })
      ).toBe("user@example.com");
      expect(
        resolveViewerId({
          user: { uid: "", email: "user@example.com", name: "Alice" },
        })
      ).toBe("user@example.com");

      // 3. name wins when uid and email missing
      expect(
        resolveViewerId({
          user: { name: "Alice" },
        })
      ).toBe("Alice");
      expect(
        resolveViewerId({
          user: { uid: "", email: "", name: "Alice" },
        })
      ).toBe("Alice");

      // 4. 'unknown' fallback
      expect(resolveViewerId({ user: { uid: "", email: "", name: "" } })).toBe("unknown");
      expect(resolveViewerId({ user: {} })).toBe("unknown");
      expect(resolveViewerId({ user: null })).toBe("unknown");
      expect(resolveViewerId(null)).toBe("unknown");
    });
  });
});
