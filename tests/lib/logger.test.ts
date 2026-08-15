import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logger", () => {
  const originalEnv = process.env;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // コンソールメソッドをスパイ
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // モジュールキャッシュをクリア（環境変数依存の初期化を毎テスト再実行させる）
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("開発環境", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    });

    it("debugメッセージを出力する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.debug("test message", { context: "test" });

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const call = consoleDebugSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("debug");
      expect(parsed.message).toBe("test message");
      expect(parsed.context).toBe("test");
      expect(parsed.timestamp).toBeDefined();
    });

    it("infoメッセージを出力する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("test info", { userId: "123" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const call = consoleInfoSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("test info");
      expect(parsed.userId).toBe("123");
    });

    it("warnメッセージを出力する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.warn("test warning", { reason: "test" });

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const call = consoleWarnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("warn");
      expect(parsed.message).toBe("test warning");
      expect(parsed.reason).toBe("test");
    });

    it("errorメッセージを出力する", async () => {
      const { logger } = await import("@/lib/logger");
      const testError = new Error("test error");
      logger.error("error occurred", { error: testError });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const call = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("error occurred");
      expect(parsed.error).toBeDefined();
    });
  });

  describe("本番環境", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    });

    it("debugメッセージは出力しない", async () => {
      const { logger } = await import("@/lib/logger");
      logger.debug("test message");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("infoメッセージは出力しない", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("test info");

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("warnメッセージは出力する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.warn("test warning");

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const call = consoleWarnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("warn");
      expect(parsed.message).toBe("test warning");
    });

    it("errorメッセージは出力する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.error("error occurred");

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const call = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("error occurred");
    });
  });

  describe("コンテキスト情報", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    });

    it("複数のコンテキスト値を含められる", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("test", {
        userId: "123",
        action: "login",
        ip: "127.0.0.1",
      });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const call = consoleInfoSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.userId).toBe("123");
      expect(parsed.action).toBe("login");
      expect(parsed.ip).toBe("127.0.0.1");
    });

    it("コンテキストなしでも動作する", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("test message");

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const call = consoleInfoSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);

      expect(parsed.message).toBe("test message");
      expect(parsed.level).toBe("info");
    });
  });
});
