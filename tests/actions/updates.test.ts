/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

// const randomUUIDMock = vi.fn(() => "test-id");

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: () => "test-id",
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({
  requireUserSession: vi.fn(),
}));

vi.mock("@/lib/turso", () => ({
  TursoUnavailableError: class TursoUnavailableError extends Error {},
  isTursoConfigured: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/updates", () => ({
  CreateUpdateSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
  insertUpdate: vi.fn(),
  deleteUpdate: vi.fn(),
  deleteAllUpdates: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import {
  createUpdateAction,
  deleteAllUpdatesAction,
  deleteUpdateAction,
} from "@/app/(protected)/updates/actions";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUserSession } from "@/lib/session";
import { CreateUpdateSchema, deleteAllUpdates, deleteUpdate, insertUpdate } from "@/lib/updates";

describe("Updates Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUpdateAction", () => {
    it("returns error when unauthenticated", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({ user: null } as any);

      const formData = { get: () => null } as unknown as FormData;
      const result = await createUpdateAction({ ok: true }, formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Authentication required.");
    });

    it("returns error when rate limit exceeded", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({
        user: { email: "test@example.com" },
      } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce(false);

      const formData = { get: () => null } as unknown as FormData;
      const result = await createUpdateAction({ ok: true }, formData);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Too many updates");
    });

    it("returns error when validation fails", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({
        user: { email: "test@example.com" },
      } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce(true);
      vi.mocked(CreateUpdateSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: "Validation error" }] },
      } as any);

      const formData = {
        get: (key: string) => (key === "category" ? "0" : null),
      } as unknown as FormData;
      const result = await createUpdateAction({ ok: true }, formData);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Validation error");
    });

    it("creates update successfully", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({
        user: { email: "test@example.com", name: "Test User" },
      } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce(true);
      vi.mocked(CreateUpdateSchema.safeParse).mockReturnValueOnce({
        success: true,
        data: {
          title: "Test Title",
          body: "Test Body",
          category: 0,
          urgent: false,
          when: 1,
        },
      } as any);

      const formData = {
        get: (key: string) => {
          if (key === "category") return "0";
          if (key === "when") return "1";
          return "test";
        },
      } as unknown as FormData;

      const result = await createUpdateAction({ ok: true }, formData);

      expect(result.ok).toBe(true);
      expect(insertUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Title",
          body: "Test Body",
          uid: "test@example.com",
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/updates");
    });
  });

  describe("deleteUpdateAction", () => {
    it("returns error when unauthenticated", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({ user: null } as any);

      const result = await deleteUpdateAction("id");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Authentication required.");
    });

    it("deletes update successfully", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({
        user: { email: "test@example.com" },
      } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce(true);

      const result = await deleteUpdateAction("id");

      expect(result.ok).toBe(true);
      expect(deleteUpdate).toHaveBeenCalledWith("id", "test@example.com");
      expect(revalidatePath).toHaveBeenCalledWith("/updates");
    });
  });

  describe("deleteAllUpdatesAction", () => {
    it("returns error when unauthenticated", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({ user: null } as any);

      const result = await deleteAllUpdatesAction();

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Authentication required.");
    });

    it("deletes all updates successfully", async () => {
      vi.mocked(requireUserSession).mockResolvedValueOnce({
        user: { email: "test@example.com" },
      } as any);

      const result = await deleteAllUpdatesAction();

      expect(result.ok).toBe(true);
      expect(deleteAllUpdates).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/updates");
    });
  });
});
