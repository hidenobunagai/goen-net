import type { InArgs, ResultSet } from "@libsql/client";
import { Client, createClient } from "@libsql/client";

import { getConfig } from "./config";

const config = getConfig();

const TURSO_URL_KEYS = ["TURSO_DB_URL", "TURSO_DATABASE_URL", "DATABASE_URL"] as const;
const TURSO_TOKEN_KEYS = [
  "TURSO_DB_AUTH_TOKEN",
  "TURSO_AUTH_TOKEN",
  "LIBSQL_AUTH_TOKEN",
  "TURSO_DB_TOKEN",
] as const;
const degradeToMemory = config.DEGRADE_TO_MEMORY === "1";

type TursoConfig = {
  url: string;
  authToken: string;
};

let cachedClient: Client | null = null;
let resolvedConfig: TursoConfig | null | undefined;

export class TursoUnavailableError extends Error {
  constructor(message = "Turso database configuration is not available.") {
    super(message);
    this.name = "TursoUnavailableError";
  }
}

function assertServerEnvironment() {
  if (typeof window !== "undefined") {
    throw new Error("Turso client can only be used on the server.");
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".turso.io")) {
      return `libsql://${parsed.hostname}`;
    }
  } catch {
    // fall through and return original url
  }
  return url;
}

function pickEnv(keys: readonly string[]): { key: string; value: string } | null {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw && raw.trim()) {
      return { key, value: raw.trim() };
    }
  }
  return null;
}

function resolveConfig(): TursoConfig | null {
  if (resolvedConfig !== undefined) {
    return resolvedConfig;
  }

  const urlEntry = pickEnv(TURSO_URL_KEYS);
  const tokenEntry = pickEnv(TURSO_TOKEN_KEYS);

  if (!urlEntry || !tokenEntry) {
    resolvedConfig = null;
    return resolvedConfig;
  }

  const normalizedUrl = normalizeUrl(urlEntry.value);
  if (!process.env.TURSO_DB_URL) {
    process.env.TURSO_DB_URL = normalizedUrl;
  }
  if (!process.env.TURSO_DB_AUTH_TOKEN) {
    process.env.TURSO_DB_AUTH_TOKEN = tokenEntry.value;
  }

  resolvedConfig = {
    url: normalizedUrl,
    authToken: tokenEntry.value,
  };
  return resolvedConfig;
}

export function isTursoConfigured(): boolean {
  return !degradeToMemory && resolveConfig() !== null;
}

export function getTursoClient(): Client {
  assertServerEnvironment();

  if (degradeToMemory) {
    throw new TursoUnavailableError("In-memory fallback is enabled.");
  }

  const config = resolveConfig();
  if (!config) {
    throw new TursoUnavailableError();
  }

  if (!cachedClient) {
    cachedClient = createClient(config);
  }

  return cachedClient;
}

export async function execute(sql: string, args?: InArgs): Promise<ResultSet> {
  const client = getTursoClient();
  return client.execute({ sql, args });
}

export type NextSessionRecord = {
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  updatedAt: string | null;
};

function normalizeRow(row: Record<string, unknown> | undefined): NextSessionRecord | null {
  if (!row) {
    return null;
  }

  const getString = (key: string): string | null => {
    const value = row[key];
    if (value == null) return null;
    if (typeof value === "string") return value;
    return String(value);
  };

  return {
    startAt: getString("start_at"),
    endAt: getString("end_at"),
    location: getString("location"),
    updatedAt: getString("updated_at"),
  };
}

export async function getNextSession(): Promise<NextSessionRecord | null> {
  if (!isTursoConfigured()) {
    throw new TursoUnavailableError();
  }

  const result = await execute(
    "SELECT start_at, end_at, location, updated_at FROM next_session WHERE id = 1 LIMIT 1"
  );
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return normalizeRow(row ?? undefined);
}

export type UpsertNextSessionInput = {
  startAt: string | null;
  endAt: string | null;
  location: string | null;
};

export async function upsertNextSession({
  startAt,
  endAt,
  location,
}: UpsertNextSessionInput): Promise<void> {
  if (!isTursoConfigured()) {
    throw new TursoUnavailableError();
  }

  await execute(
    `INSERT INTO next_session (id, start_at, end_at, location, updated_at)
       VALUES (1, ?1, ?2, ?3, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         start_at = excluded.start_at,
         end_at = excluded.end_at,
         location = excluded.location,
         updated_at = datetime('now')`,
    [startAt, endAt, location]
  );
}
