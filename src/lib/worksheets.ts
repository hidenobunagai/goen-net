import type { InArgs } from "@libsql/client";

import {
  execute,
  isMemoryFallbackEnabled,
  isTursoConfigured,
  TursoUnavailableError,
} from "@/lib/turso";
import { jsonByteLength, PayloadTooLargeError } from "@/lib/utils";

export const WORKSHEET_ROLES = ["presenter", "coach", "observer"] as const;

export const MAX_WORKSHEET_BYTES = 100 * 1024;

export type WorksheetRole = (typeof WORKSHEET_ROLES)[number];

export type WorksheetRecord<T = unknown> = {
  uid: string;
  role: WorksheetRole;
  data: T | null;
  updatedAt: string | null;
};

type MemoryWorksheetRecord = {
  data: unknown;
  updatedAt: string;
};

/** Raised when a save is based on a revision that is no longer the stored one. */
export class WorksheetConflictError extends Error {
  status = 409;

  constructor(
    message = "This worksheet was changed in another session. Reload to see the latest version."
  ) {
    super(message);
    this.name = "WorksheetConflictError";
  }
}

const memoryWorksheetStore = new Map<string, MemoryWorksheetRecord>();

/**
 * The revision to store for this write. Kept strictly greater than the base it
 * replaces: millisecond timestamps repeat within the same millisecond, and two
 * revisions that compare equal would let a stale save through the guard.
 */
function nextWorksheetRevision(baseUpdatedAt: string | null): string {
  const now = Date.now();
  const base = baseUpdatedAt ? Date.parse(baseUpdatedAt) : Number.NaN;
  const next = Number.isNaN(base) ? now : Math.max(now, base + 1);
  return new Date(next).toISOString();
}

function getMemoryKey(uid: string, role: WorksheetRole): string {
  return `${uid}::${role}`;
}

function getMemoryWorksheet<T = unknown>(
  uid: string,
  role: WorksheetRole
): WorksheetRecord<T> | null {
  const record = memoryWorksheetStore.get(getMemoryKey(uid, role));
  if (!record) return null;
  return {
    uid,
    role,
    data: (record.data as T | null) ?? null,
    updatedAt: record.updatedAt,
  };
}

function upsertMemoryWorksheet<T = unknown>(
  uid: string,
  role: WorksheetRole,
  data: T,
  baseUpdatedAt: string | null
): string {
  const key = getMemoryKey(uid, role);
  const existing = memoryWorksheetStore.get(key);
  if (existing ? existing.updatedAt !== baseUpdatedAt : baseUpdatedAt !== null) {
    throw new WorksheetConflictError();
  }
  const updatedAt = nextWorksheetRevision(baseUpdatedAt);
  memoryWorksheetStore.set(key, { data: (data ?? null) as T | null, updatedAt });
  return updatedAt;
}

function deleteMemoryWorksheet(uid: string, role: WorksheetRole): void {
  memoryWorksheetStore.delete(getMemoryKey(uid, role));
}

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

export async function getWorksheet<T = unknown>(
  uid: string,
  role: WorksheetRole
): Promise<WorksheetRecord<T> | null> {
  if (!isTursoConfigured()) {
    if (!isMemoryFallbackEnabled()) {
      throw new TursoUnavailableError();
    }
    return getMemoryWorksheet<T>(uid, role);
  }

  const result = await execute(
    `SELECT uid, role, data, updated_at FROM worksheets WHERE uid = ?1 AND role = ?2 LIMIT 1`,
    [uid, role] as InArgs
  );

  const row = (result.rows?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) return null;

  const data = parseStoredData(row.data) as T | null;
  const updatedAt =
    typeof row.updated_at === "string"
      ? row.updated_at
      : row.updated_at != null
        ? String(row.updated_at)
        : null;

  return {
    uid,
    role: row.role as WorksheetRole,
    data,
    updatedAt,
  };
}

/**
 * Writes the worksheet, refusing to clobber a revision the caller did not read.
 * `baseUpdatedAt` is the `updatedAt` returned by the GET the form was based on;
 * `null` means "no worksheet existed yet". Returns the revision written.
 */
export async function upsertWorksheet<T = unknown>(
  uid: string,
  role: WorksheetRole,
  data: T,
  baseUpdatedAt: string | null = null
): Promise<string> {
  const size = jsonByteLength(data);
  if (size > MAX_WORKSHEET_BYTES) {
    throw new PayloadTooLargeError(
      `Worksheet data is too large (${size} bytes). Maximum is ${MAX_WORKSHEET_BYTES} bytes.`
    );
  }

  if (!isTursoConfigured()) {
    if (!isMemoryFallbackEnabled()) {
      throw new TursoUnavailableError();
    }
    return upsertMemoryWorksheet(uid, role, data, baseUpdatedAt);
  }

  // Two guards, both meaning "the caller read the latest revision": the row may
  // only be inserted while none exists (?5 IS NULL), and the DO UPDATE only
  // matches the revision the caller actually read.
  const updatedAt = nextWorksheetRevision(baseUpdatedAt);
  const result = await execute(
    `INSERT INTO worksheets (uid, role, data, created_at, updated_at)
     SELECT ?1, ?2, ?3, ?4, ?4
     WHERE ?5 IS NULL OR EXISTS (SELECT 1 FROM worksheets WHERE uid = ?1 AND role = ?2)
     ON CONFLICT(uid, role) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
     WHERE worksheets.updated_at = ?5`,
    [uid, role, JSON.stringify(data ?? null), updatedAt, baseUpdatedAt] as InArgs
  );

  if (result.rowsAffected !== 1) {
    throw new WorksheetConflictError();
  }

  return updatedAt;
}

export async function deleteWorksheet(uid: string, role: WorksheetRole): Promise<void> {
  if (!isTursoConfigured()) {
    if (!isMemoryFallbackEnabled()) {
      throw new TursoUnavailableError();
    }
    deleteMemoryWorksheet(uid, role);
    return;
  }

  await execute("DELETE FROM worksheets WHERE uid = ?1 AND role = ?2", [uid, role] as InArgs);
}

export function isValidWorksheetRole(value: string): value is WorksheetRole {
  return (WORKSHEET_ROLES as readonly string[]).includes(value);
}

export function resetWorksheetsCache(): void {
  memoryWorksheetStore.clear();
}
