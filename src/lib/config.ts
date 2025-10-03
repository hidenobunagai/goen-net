/**
 * 環境変数バリデーション
 * 実行時に環境変数の存在と形式を検証します
 */

import { z } from "zod";

// 環境変数スキーマの定義
const envSchema = z.object({
  // Next.js & NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // アクセス制御
  ALLOWED_EMAILS: z.string().optional(),

  // Turso Database (複数の命名規則に対応)
  TURSO_DB_URL: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  TURSO_DB_AUTH_TOKEN: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  LIBSQL_AUTH_TOKEN: z.string().optional(),
  TURSO_DB_TOKEN: z.string().optional(),

  // オプション設定
  DEGRADE_TO_MEMORY: z.enum(["0", "1"]).optional(),

  // Cron設定
  CRON_SECRET: z.string().optional(),

  // メール送信（Resend）
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedConfig: Env | null = null;

/**
 * 環境変数を検証して返す
 * 検証に失敗した場合はエラーをスローする
 */
export function getConfig(): Env {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    cachedConfig = envSchema.parse(process.env);
    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err: z.ZodIssue) => `  - ${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(
        `Environment variable validation failed:\n${errorMessages}\n\n` +
          `Please check your .env.local file and ensure all required variables are set correctly.`
      );
    }
    throw error;
  }
}

/**
 * 特定の環境変数が設定されているかチェック
 */
export function hasEnv(key: keyof Env): boolean {
  const config = getConfig();
  const value = config[key];
  return value !== undefined && value !== null && value !== "";
}

/**
 * Tursoデータベースが設定されているかチェック
 */
export function isTursoDatabaseConfigured(): boolean {
  if (hasEnv("DEGRADE_TO_MEMORY") && getConfig().DEGRADE_TO_MEMORY === "1") {
    return false;
  }

  const hasUrl = hasEnv("TURSO_DB_URL") || hasEnv("TURSO_DATABASE_URL") || hasEnv("DATABASE_URL");
  const hasToken = hasEnv("TURSO_DB_AUTH_TOKEN") || hasEnv("TURSO_AUTH_TOKEN") || 
                   hasEnv("LIBSQL_AUTH_TOKEN") || hasEnv("TURSO_DB_TOKEN");

  return hasUrl && hasToken;
}

/**
 * 開発環境かどうか
 */
export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === "development";
}

/**
 * 本番環境かどうか
 */
export function isProduction(): boolean {
  return getConfig().NODE_ENV === "production";
}
