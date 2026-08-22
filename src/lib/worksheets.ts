import type { InArgs } from "@libsql/client";

import { execute, isTursoConfigured } from "@/lib/turso";

export const WORKSHEET_ROLES = ["presenter", "coach", "observer"] as const;

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

const memoryWorksheetStore = new Map<string, MemoryWorksheetRecord>();

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

function upsertMemoryWorksheet<T = unknown>(uid: string, role: WorksheetRole, data: T): void {
  const updatedAt = new Date().toISOString();
  memoryWorksheetStore.set(getMemoryKey(uid, role), {
    data: (data ?? null) as T | null,
    updatedAt,
  });
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

export async function upsertWorksheet<T = unknown>(
  uid: string,
  role: WorksheetRole,
  data: T
): Promise<void> {
  if (!isTursoConfigured()) {
    upsertMemoryWorksheet(uid, role, data);
    return;
  }

  await execute(
    `INSERT INTO worksheets (uid, role, data, created_at, updated_at)
     VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
     ON CONFLICT(uid, role) DO UPDATE SET data=excluded.data, updated_at=datetime('now')`,
    [uid, role, JSON.stringify(data ?? null)] as InArgs
  );
}

export async function deleteWorksheet(uid: string, role: WorksheetRole): Promise<void> {
  if (!isTursoConfigured()) {
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
