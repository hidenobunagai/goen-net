import { TursoUnavailableError, execute, isTursoConfigured } from "@/lib/turso";

export const WORKSHEET_ROLES = [
  "presenter",
  "coach",
  "observer",
] as const;

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

function assertTursoAvailable(): void {
  if (!isTursoConfigured()) {
    throw new TursoUnavailableError();
  }
}

function extractColumnName(row: unknown): string | null {
  if (!row) {
    return null;
  }

  if (Array.isArray(row)) {
    const value = row[1];
    if (typeof value === "string") {
      return value;
    }
    if (value != null) {
      return String(value);
    }
    return null;
  }

  if (typeof row === "object") {
    const record = row as Record<string, unknown>;
    const value = record.name;
    if (typeof value === "string") {
      return value;
    }
    if (value != null) {
      return String(value);
    }
  }

  return null;
}

function pickColumn(
  columnMap: Map<string, string>,
  candidates: string[],
  { required = false }: { required?: boolean } = {}
): string | undefined {
  for (const candidate of candidates) {
    const column = columnMap.get(candidate.toLowerCase());
    if (column) {
      return column;
    }
  }

  if (required) {
    const available = Array.from(columnMap.values()).join(", ");
    throw new Error(
      `[worksheets] Required column not found. Tried ${candidates.join(", ")} in table with columns: ${available}`
    );
  }

  return undefined;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function getSchema(): Promise<WorksheetsTableSchema> {
  if (cachedSchema) {
    return cachedSchema;
  }

  assertTursoAvailable();
  const result = await execute("PRAGMA table_info('worksheets')");
  const rows = (result?.rows ?? []) as Array<Record<string, unknown> | unknown[]>;
  const columnMap = new Map<string, string>();

  for (const row of rows) {
    const name = extractColumnName(row);
    if (name) {
      columnMap.set(name.toLowerCase(), name);
    }
  }

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
    createdAtColumn: pickColumn(columnMap, [
      "created_at",
      "createdon",
      "created",
      "createdat",
    ]),
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
  assertTursoAvailable();
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
  assertTursoAvailable();
  const schema = await getSchema();
  const { uidColumn, roleColumn, dataColumn, updatedAtColumn, createdAtColumn } =
    schema;

  const columns = [uidColumn, roleColumn, dataColumn];
  const placeholders = ["?1", "?2", "?3"];

  const values: unknown[] = [uid, role, JSON.stringify(data ?? null)];

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
    updateAssignments.push(
      `${quoteIdentifier(updatedAtColumn)} = datetime('now')`
    );
  }

  await execute(
    `INSERT INTO worksheets (${insertColumns})
       VALUES (${insertValues})
       ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updateAssignments.join(", ")}`,
    values
  );
}

export async function deleteWorksheet(
  uid: string,
  role: WorksheetRole
): Promise<void> {
  assertTursoAvailable();
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
}
