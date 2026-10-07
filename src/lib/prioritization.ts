import type { InArgs } from "@libsql/client";

import {
  execute,
  isMemoryFallbackEnabled,
  isTursoConfigured,
  TursoUnavailableError,
} from "@/lib/turso";
import { jsonByteLength, nextRevision, PayloadTooLargeError } from "@/lib/utils";

export const MAX_PRIORITIZATION_BOARD_BYTES = 100 * 1024;

export type PrioritizationRecord<T = unknown> = {
  data: T | null;
  updatedAt: string | null;
};

type MemoryPrioritizationRecord = {
  data: unknown;
  updatedAt: string;
};

/** Raised when a save is based on a revision that is no longer the stored one. */
export class PrioritizationConflictError extends Error {
  status = 409;

  constructor(
    message = "The board was changed by another member. Reload to see the latest version."
  ) {
    super(message);
    this.name = "PrioritizationConflictError";
  }
}

let memoryPrioritizationStore: MemoryPrioritizationRecord | null = null;

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

export async function getPrioritizationBoard<T = unknown>(): Promise<PrioritizationRecord<T>> {
  if (!isTursoConfigured()) {
    if (!isMemoryFallbackEnabled()) {
      throw new TursoUnavailableError();
    }
    if (!memoryPrioritizationStore) {
      return { data: null, updatedAt: null };
    }
    return {
      data: (memoryPrioritizationStore.data as T | null) ?? null,
      updatedAt: memoryPrioritizationStore.updatedAt,
    };
  }

  const result = await execute("SELECT data, updated_at FROM prioritization WHERE id = 1 LIMIT 1");

  const row = (result.rows?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    return { data: null, updatedAt: null };
  }

  const data = parseStoredData(row.data) as T | null;
  const updatedAt =
    typeof row.updated_at === "string"
      ? row.updated_at
      : row.updated_at != null
        ? String(row.updated_at)
        : null;

  return { data, updatedAt };
}

export async function savePrioritizationBoard<T = unknown>(
  data: T,
  baseUpdatedAt: string | null = null
): Promise<string> {
  const size = jsonByteLength(data);
  if (size > MAX_PRIORITIZATION_BOARD_BYTES) {
    throw new PayloadTooLargeError(
      `Prioritization board is too large (${size} bytes). Maximum is ${MAX_PRIORITIZATION_BOARD_BYTES} bytes.`
    );
  }

  if (!isTursoConfigured()) {
    if (!isMemoryFallbackEnabled()) {
      throw new TursoUnavailableError();
    }
    const existing = memoryPrioritizationStore;
    if (existing ? existing.updatedAt !== baseUpdatedAt : baseUpdatedAt !== null) {
      throw new PrioritizationConflictError();
    }
    const updatedAt = nextRevision(baseUpdatedAt);
    memoryPrioritizationStore = {
      data: (data ?? null) as T | null,
      updatedAt,
    };
    return updatedAt;
  }

  const updatedAt = nextRevision(baseUpdatedAt);
  const result = await execute(
    `INSERT INTO prioritization (id, data, created_at, updated_at)
     SELECT 1, ?1, ?2, ?2
     WHERE ?3 IS NULL OR EXISTS (SELECT 1 FROM prioritization WHERE id = 1)
     ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
     WHERE prioritization.updated_at = ?3`,
    [JSON.stringify(data ?? null), updatedAt, baseUpdatedAt] as InArgs
  );

  if (result.rowsAffected !== 1) {
    throw new PrioritizationConflictError();
  }

  return updatedAt;
}

export function resetPrioritizationCache(): void {
  memoryPrioritizationStore = null;
}
