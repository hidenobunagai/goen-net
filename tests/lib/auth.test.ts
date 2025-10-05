import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("authOptions", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();

    process.env.NEXTAUTH_SECRET = "a".repeat(32);
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when ALLOWED_EMAILS is empty", async () => {
    process.env.ALLOWED_EMAILS = "";

    const { authOptions } = await import("@/lib/auth");
    const signIn = authOptions.callbacks?.signIn;

    expect(signIn).toBeDefined();

    const result = await signIn!({
      user: { email: "user@example.com" },
    } as Parameters<NonNullable<typeof signIn>>[0]);

    expect(result).toBe(false);
  });

  it("allows sign-in when email is listed in ALLOWED_EMAILS", async () => {
    process.env.ALLOWED_EMAILS = "user@example.com";

    const { authOptions } = await import("@/lib/auth");
    const signIn = authOptions.callbacks?.signIn;

    expect(signIn).toBeDefined();

    const result = await signIn!({
      user: { email: "user@example.com" },
    } as Parameters<NonNullable<typeof signIn>>[0]);

    expect(result).toBe(true);
  });
});
