import type { InArgs } from "@libsql/client";

import { execute, isTursoConfigured } from "@/lib/turso";

let memoryPrioritizationStore: { data: unknown; updatedAt: string } | null = null;

function parseStoredData(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function getPrioritizationBoard<T = unknown>(): Promise<T | null> {
  if (!isTursoConfigured()) {
    return (memoryPrioritizationStore?.data as T) ?? null;
  }

  const result = await execute("SELECT data, updated_at FROM prioritization WHERE id = 1 LIMIT 1");

  const row = (result.rows?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) return null;

  return parseStoredData(row.data) as T | null;
}

export async function savePrioritizationBoard<T = unknown>(data: T): Promise<void> {
  if (!isTursoConfigured()) {
    memoryPrioritizationStore = {
      data: data ?? null,
      updatedAt: new Date().toISOString(),
    };
    return;
  }

  await execute(
    `INSERT INTO prioritization (id, data, created_at, updated_at)
     VALUES (1, ?1, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=datetime('now')`,
    [JSON.stringify(data ?? null)] as InArgs
  );
}

export function resetPrioritizationCache(): void {
  memoryPrioritizationStore = null;
}
