import { afterEach, describe, expect, it, vi } from "vitest";

import { APIError, fetchAPI, get, post } from "@/lib/api-client";

describe("api-client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("APIError", () => {
    it("基本的なエラー情報を保持する", () => {
      const error = new APIError(404, "Not Found", "NOT_FOUND");

      expect(error.status).toBe(404);
      expect(error.message).toBe("Not Found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("APIError");
    });

    it("クライアントエラーを判定できる", () => {
      const error = new APIError(400, "Bad Request");
      expect(error.isClientError()).toBe(true);
      expect(error.isServerError()).toBe(false);
    });

    it("サーバーエラーを判定できる", () => {
      const error = new APIError(500, "Internal Server Error");
      expect(error.isServerError()).toBe(true);
      expect(error.isClientError()).toBe(false);
    });

    it("認証エラーを判定できる", () => {
      const error401 = new APIError(401, "Unauthorized");
      const error403 = new APIError(403, "Forbidden");

      expect(error401.isAuthError()).toBe(true);
      expect(error403.isAuthError()).toBe(true);
    });

    it("レート制限エラーを判定できる", () => {
      const error = new APIError(429, "Too Many Requests");
      expect(error.isRateLimitError()).toBe(true);
    });
  });

  describe("fetchAPI", () => {
    it("正常なレスポンスをパースする", async () => {
      const mockData = { id: 1, name: "Test" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
      });

      const result = await fetchAPI<typeof mockData>("/api/test");

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("4xxエラーでAPIErrorをスローする", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Resource not found", code: "NOT_FOUND" }),
      });

      await expect(fetchAPI("/api/test")).rejects.toThrow(APIError);
      await expect(fetchAPI("/api/test")).rejects.toThrow("Resource not found");
    });

    it("5xxエラーでAPIErrorをスローする", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Server error" }),
      });

      await expect(fetchAPI("/api/test")).rejects.toThrow(APIError);

      try {
        await fetchAPI("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).status).toBe(500);
      }
    });

    it("ネットワークエラーをAPIErrorに変換する", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(fetchAPI("/api/test")).rejects.toThrow(APIError);

      try {
        await fetchAPI("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe("NETWORK_ERROR");
      }
    });

    it("カスタムヘッダーを設定できる", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
      });

      await fetchAPI("/api/test", {
        headers: {
          Authorization: "Bearer token",
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token",
          }),
        })
      );
    });
  });

  describe("get", () => {
    it("GETリクエストを送信する", async () => {
      const mockData = { data: "test" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
      });

      const result = await get<typeof mockData>("/api/test");

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("post", () => {
    it("POSTリクエストを送信する", async () => {
      const mockData = { data: "test" };
      const postData = { name: "Test" };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
      });

      const result = await post<typeof mockData>("/api/test", postData);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
        })
      );
    });

    it("データなしでPOSTリクエストを送信できる", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
      });

      await post("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          body: undefined,
        })
      );
    });
  });
});
