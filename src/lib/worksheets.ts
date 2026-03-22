import type { InArgs } from "@libsql/client";

import { buildColumnMap, pickColumn, quoteIdentifier } from "@/lib/db-utils";
import { execute, isTursoConfigured, TursoUnavailableError } from "@/lib/turso";

export const WORKSHEET_ROLES = ["presenter", "coach", "observer"] as const;

export type WorksheetRole = (typeof WORKSHEET_ROLES)[number];

export type WorksheetRecord<T = unknown> = {
  uid: string;
  role: WorksheetRole;
  data: T | null;
  updatedAt: string | null;
};

type WorksheetsTableSchema = {
  idColumn?: string;
  uidColumn: string;
  roleColumn: string;
  dataColumn: string;
  updatedAtColumn?: string;
  createdAtColumn?: string;
};

let cachedSchema: WorksheetsTableSchema | null = null;

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
  if (!record) {
    return null;
  }

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

function assertTursoAvailable(): void {
  if (!isTursoConfigured()) {
    throw new TursoUnavailableError();
  }
}

async function getSchema(): Promise<WorksheetsTableSchema> {
  if (cachedSchema) {
    return cachedSchema;
  }

  assertTursoAvailable();
  const result = await execute("PRAGMA table_info('worksheets')");
  const rows = (result?.rows ?? []) as Array<Record<string, unknown> | unknown[]>;
  const columnMap = buildColumnMap(rows);

  if (columnMap.size === 0) {
    throw new Error("[worksheets] worksheets table is missing or has no columns");
  }

  const schema: WorksheetsTableSchema = {
    idColumn: pickColumn(columnMap, ["id", "worksheet_id", "rowid"]),
    uidColumn: pickColumn(columnMap, ["uid", "user_id", "user_uid", "email"], {
      required: true,
    })!,
    roleColumn: pickColumn(columnMap, ["role", "worksheet_role", "type"], {
      required: true,
    })!,
    dataColumn: pickColumn(columnMap, ["data", "payload", "content", "form"], {
      required: true,
    })!,
    updatedAtColumn: pickColumn(columnMap, [
      "updated_at",
      "updatedon",
      "updated",
      "modified_at",
      "modified",
      "updatedat",
    ]),
    createdAtColumn: pickColumn(columnMap, ["created_at", "createdon", "created", "createdat"]),
  };

  cachedSchema = schema;
  return schema;
}

function parseStoredData(raw: unknown): unknown {
  if (raw == null) {
    return null;
  }

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

  const schema = await getSchema();
  const { uidColumn, roleColumn, dataColumn, updatedAtColumn } = schema;

  const selectColumns = [
    `${quoteIdentifier(uidColumn)} AS uid`,
    `${quoteIdentifier(roleColumn)} AS role`,
    `${quoteIdentifier(dataColumn)} AS data`,
  ];

  if (updatedAtColumn) {
    selectColumns.push(`${quoteIdentifier(updatedAtColumn)} AS updated_at`);
  }

  const result = await execute(
    `SELECT ${selectColumns.join(", ")}
       FROM worksheets
      WHERE ${quoteIdentifier(uidColumn)} = ?1
        AND ${quoteIdentifier(roleColumn)} = ?2
      LIMIT 1`,
    [uid, role]
  );

  const row = (result.rows?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) {
    return null;
  }

  const data = parseStoredData(row.data) as T | null;
  const updatedAtValue = row.updated_at;
  const updatedAt =
    typeof updatedAtValue === "string"
      ? updatedAtValue
      : updatedAtValue != null
        ? String(updatedAtValue)
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

  const schema = await getSchema();
  const { uidColumn, roleColumn, dataColumn, updatedAtColumn, createdAtColumn } = schema;

  const columns = [uidColumn, roleColumn, dataColumn];
  const placeholders = ["?1", "?2", "?3"];

  const values: InArgs = [uid, role, JSON.stringify(data ?? null)];

  if (createdAtColumn) {
    columns.push(createdAtColumn);
    placeholders.push("datetime('now')");
  }

  if (updatedAtColumn) {
    columns.push(updatedAtColumn);
    placeholders.push("datetime('now')");
  }

  const insertColumns = columns.map(quoteIdentifier).join(", ");
  const insertValues = placeholders.join(", ");
  const conflictTarget = `${quoteIdentifier(uidColumn)}, ${quoteIdentifier(roleColumn)}`;
  const updateAssignments = [
    `${quoteIdentifier(dataColumn)} = excluded.${quoteIdentifier(dataColumn)}`,
  ];

  if (updatedAtColumn) {
    updateAssignments.push(`${quoteIdentifier(updatedAtColumn)} = datetime('now')`);
  }

  await execute(
    `INSERT INTO worksheets (${insertColumns})
       VALUES (${insertValues})
       ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updateAssignments.join(", ")}`,
    values
  );
}

export async function deleteWorksheet(uid: string, role: WorksheetRole): Promise<void> {
  if (!isTursoConfigured()) {
    deleteMemoryWorksheet(uid, role);
    return;
  }

  const schema = await getSchema();
  const { uidColumn, roleColumn } = schema;

  await execute(
    `DELETE FROM worksheets WHERE ${quoteIdentifier(uidColumn)} = ?1 AND ${quoteIdentifier(roleColumn)} = ?2`,
    [uid, role]
  );
}

export function isValidWorksheetRole(value: string): value is WorksheetRole {
  return (WORKSHEET_ROLES as readonly string[]).includes(value);
}

export function resetWorksheetsCache(): void {
  cachedSchema = null;
  memoryWorksheetStore.clear();
}
