import { describe, expect, it, beforeEach, afterEach } from "vitest";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    // キャッシュをクリア（モジュールを再読み込み）
    delete require.cache[require.resolve("@/lib/config")];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getConfig", () => {
    it("必須の環境変数が設定されている場合は正常に動作する", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { getConfig } = await import("@/lib/config");
      const config = getConfig();

      expect(config.NEXTAUTH_SECRET).toBe("a".repeat(32));
      expect(config.GOOGLE_CLIENT_ID).toBe("test-client-id");
      expect(config.GOOGLE_CLIENT_SECRET).toBe("test-client-secret");
    });

    it("NEXTAUTH_SECRETが32文字未満の場合はエラーをスローする", async () => {
      process.env.NEXTAUTH_SECRET = "short";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { getConfig } = await import("@/lib/config");

      expect(() => getConfig()).toThrow(/NEXTAUTH_SECRET must be at least 32 characters/);
    });

    it("GOOGLE_CLIENT_IDが未設定の場合はエラーをスローする", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      delete process.env.GOOGLE_CLIENT_ID;

      const { getConfig } = await import("@/lib/config");

      expect(() => getConfig()).toThrow(/GOOGLE_CLIENT_ID/);
    });

    it("GOOGLE_CLIENT_SECRETが未設定の場合はエラーをスローする", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      delete process.env.GOOGLE_CLIENT_SECRET;

      const { getConfig } = await import("@/lib/config");

      expect(() => getConfig()).toThrow(/GOOGLE_CLIENT_SECRET/);
    });

    it("オプションの環境変数は未設定でも動作する", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { getConfig } = await import("@/lib/config");
      const config = getConfig();

      expect(config.ALLOWED_EMAILS).toBeUndefined();
      expect(config.RESEND_API_KEY).toBeUndefined();
    });
  });

  describe("hasEnv", () => {
    it("環境変数が設定されている場合はtrueを返す", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.RESEND_API_KEY = "test-api-key";

      const { hasEnv } = await import("@/lib/config");

      expect(hasEnv("RESEND_API_KEY")).toBe(true);
    });

    it("環境変数が未設定の場合はfalseを返す", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { hasEnv } = await import("@/lib/config");

      expect(hasEnv("RESEND_API_KEY")).toBe(false);
    });
  });

  describe("isTursoDatabaseConfigured", () => {
    it("Turso URLとトークンが設定されている場合はtrueを返す", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.TURSO_DB_URL = "libsql://test.turso.io";
      process.env.TURSO_DB_AUTH_TOKEN = "test-token";

      const { isTursoDatabaseConfigured } = await import("@/lib/config");

      expect(isTursoDatabaseConfigured()).toBe(true);
    });

    it("Turso URLが未設定の場合はfalseを返す", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.TURSO_DB_AUTH_TOKEN = "test-token";

      const { isTursoDatabaseConfigured } = await import("@/lib/config");

      expect(isTursoDatabaseConfigured()).toBe(false);
    });

    it("DEGRADE_TO_MEMORYが1の場合はfalseを返す", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
      process.env.TURSO_DB_URL = "libsql://test.turso.io";
      process.env.TURSO_DB_AUTH_TOKEN = "test-token";
      process.env.DEGRADE_TO_MEMORY = "1";

      const { isTursoDatabaseConfigured } = await import("@/lib/config");

      expect(isTursoDatabaseConfigured()).toBe(false);
    });
  });

  describe("isDevelopment", () => {
    it("NODE_ENVがdevelopmentの場合はtrueを返す", async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { isDevelopment } = await import("@/lib/config");

      expect(isDevelopment()).toBe(true);
    });

    it("NODE_ENVがproductionの場合はfalseを返す", async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { isDevelopment } = await import("@/lib/config");

      expect(isDevelopment()).toBe(false);
    });
  });

  describe("isProduction", () => {
    it("NODE_ENVがproductionの場合はtrueを返す", async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { isProduction } = await import("@/lib/config");

      expect(isProduction()).toBe(true);
    });

    it("NODE_ENVがdevelopmentの場合はfalseを返す", async () => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const { isProduction } = await import("@/lib/config");

      expect(isProduction()).toBe(false);
    });
  });
});
