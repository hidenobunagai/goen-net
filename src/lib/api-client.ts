/**
 * API共通クライアント
 * 型安全なfetchラッパーと標準化されたエラーハンドリングを提供
 */

import { logger } from "./logger";

/**
 * APIエラークラス
 */
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }

  /**
   * エラーがクライアント側の問題か（4xx）
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * エラーがサーバー側の問題か（5xx）
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * 認証エラーか
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * レート制限エラーか
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }
}

/**
 * APIレスポンスの型定義
 */
export type APIResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

/**
 * fetchオプションの型
 */
export interface FetchOptions extends RequestInit {
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  retries?: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay?: number;
}

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === "AbortError") {
      throw new APIError(408, "Request timeout", "TIMEOUT");
    }
    throw error;
  }
}

/**
 * リトライ付きfetch
 */
async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { retries = 0, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions);

      // 5xxエラーの場合のみリトライ
      if (response.status >= 500 && attempt < retries) {
        logger.warn("Server error, retrying...", {
          url,
          status: response.status,
          attempt: attempt + 1,
          maxRetries: retries,
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        logger.warn("Request failed, retrying...", {
          url,
          error: (error as Error).message,
          attempt: attempt + 1,
          maxRetries: retries,
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error("Unknown error during fetch");
}

/**
 * 型安全なAPIクライアント
 */
export async function fetchAPI<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const fetchOptions: FetchOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  logger.debug("API request", { url, method: options.method || "GET" });

  try {
    const response = await fetchWithRetry(url, fetchOptions);

    // レスポンスボディの解析
    let body: unknown;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      // エラーレスポンスの処理
      const errorMessage =
        typeof body === "object" && body !== null && "message" in body
          ? String(body.message)
          : response.statusText;

      const errorCode =
        typeof body === "object" && body !== null && "code" in body ? String(body.code) : undefined;

      logger.error("API error", {
        url,
        status: response.status,
        errorCode,
        errorMessage,
      });

      throw new APIError(response.status, errorMessage, errorCode, body);
    }

    logger.debug("API response", { url, status: response.status });
    return body as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    logger.error("Unexpected API error", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new APIError(
      0,
      error instanceof Error ? error.message : "Unknown error",
      "NETWORK_ERROR"
    );
  }
}

/**
 * GETリクエスト
 */
export async function get<T>(
  url: string,
  options?: Omit<FetchOptions, "method" | "body">
): Promise<T> {
  return fetchAPI<T>(url, { ...options, method: "GET" });
}

/**
 * POSTリクエスト
 */
export async function post<T>(
  url: string,
  data?: unknown,
  options?: Omit<FetchOptions, "method" | "body">
): Promise<T> {
  return fetchAPI<T>(url, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUTリクエスト
 */
export async function put<T>(
  url: string,
  data?: unknown,
  options?: Omit<FetchOptions, "method" | "body">
): Promise<T> {
  return fetchAPI<T>(url, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCHリクエスト
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  options?: Omit<FetchOptions, "method" | "body">
): Promise<T> {
  return fetchAPI<T>(url, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETEリクエスト
 */
export async function del<T>(
  url: string,
  options?: Omit<FetchOptions, "method" | "body">
): Promise<T> {
  return fetchAPI<T>(url, { ...options, method: "DELETE" });
}
