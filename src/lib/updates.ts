import type { InArgs } from "@libsql/client";

import { logger } from "@/lib/logger";
import { execute, isTursoConfigured, TursoUnavailableError } from "@/lib/turso";

export type UpdateCategory = 0 | 1 | 2;
export type UpdateWhen = -1 | 1;

export type UpdateRecord = {
  id: string;
  by: string;
  category: UpdateCategory;
  urgent: boolean;
  uid: string;
  title: string;
  body: string;
  when: UpdateWhen;
  createdAt: string;
  viewerIsOwner: boolean;
};

export class UpdateNotFoundError extends Error {
  constructor(message = "Update not found") {
    super(message);
    this.name = "UpdateNotFoundError";
  }
}

type FetchOptions = {
  limit?: number;
  offset?: number;
};

function assertTursoAvailable(): void {
  if (!isTursoConfigured()) {
    throw new TursoUnavailableError();
  }
}

type UsersTableSchema = {
  idColumn: string;
  emailColumn?: string;
  nameColumn?: string;
  createdAtColumn?: string;
  updatedAtColumn?: string;
};

let cachedUsersTableSchema: UsersTableSchema | null = null;

async function getUsersTableSchema(): Promise<UsersTableSchema> {
  if (cachedUsersTableSchema) {
    return cachedUsersTableSchema;
  }

  const result = await execute("PRAGMA table_info('users')");
  const rows = (result?.rows ?? []) as Array<Record<string, unknown> | unknown[]>;
  const columnMap = new Map<string, string>();

  for (const row of rows) {
    const name = extractColumnName(row);
    if (name) {
      columnMap.set(name.toLowerCase(), name);
    }
  }

  if (columnMap.size === 0) {
    throw new Error("[updates] users table is missing or has no columns");
  }

  const idColumn = columnMap.get("uid") ?? columnMap.get("id") ?? columnMap.get("user_id");

  if (!idColumn) {
    throw new Error("[updates] users table is missing an id or uid column");
  }

  const schema: UsersTableSchema = {
    idColumn,
    emailColumn: pickColumn(columnMap, ["email", "email_address", "user_email"]),
    nameColumn: pickColumn(columnMap, ["name", "display_name", "full_name"]),
    createdAtColumn: pickColumn(columnMap, [
      "created_at",
      "created_on",
      "createdat",
      "createdAt",
      "created",
    ]),
    updatedAtColumn: pickColumn(columnMap, [
      "updated_at",
      "updated_on",
      "updatedat",
      "updatedAt",
      "updated",
      "modified_at",
      "modifiedon",
    ]),
  };

  cachedUsersTableSchema = schema;
  return schema;
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

function pickColumn(columnMap: Map<string, string>, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const column = columnMap.get(candidate.toLowerCase());
    if (column) {
      return column;
    }
  }
  return undefined;
}

type UpdatesTableSchema = {
  idColumn: string;
  byNameColumn?: string;
  categoryColumn?: string;
  priorityColumn?: string;
  urgentColumn?: string;
  uidColumn?: string;
  titleColumn?: string;
  bodyColumn?: string;
  whenValueColumn?: string;
  createdAtColumn?: string;
  updatedAtColumn?: string;
};

let cachedUpdatesTableSchema: UpdatesTableSchema | null = null;
let attemptedPriorityToUrgentRename = false;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function getUpdatesTableSchema(): Promise<UpdatesTableSchema> {
  if (cachedUpdatesTableSchema) {
    return cachedUpdatesTableSchema;
  }

  const result = await execute("PRAGMA table_info('updates')");
  const rows = (result?.rows ?? []) as Array<Record<string, unknown> | unknown[]>;
  const columnMap = new Map<string, string>();

  for (const row of rows) {
    const name = extractColumnName(row);
    if (name) {
      columnMap.set(name.toLowerCase(), name);
    }
  }

  if (columnMap.size === 0) {
    throw new Error("[updates] updates table is missing or has no columns");
  }

  const idColumn = pickColumn(columnMap, ["id", "update_id"]) ?? columnMap.get("id");

  if (!idColumn) {
    throw new Error("[updates] updates table is missing an id column");
  }

  const schema: UpdatesTableSchema = {
    idColumn,
    byNameColumn: pickColumn(columnMap, [
      "by_name",
      "byname",
      "author",
      "author_name",
      "authorname",
    ]),
    categoryColumn: pickColumn(columnMap, ["category", "category_id", "categoryid"]),
    priorityColumn: pickColumn(columnMap, ["priority", "priority_level", "prioritylevel"]),
    urgentColumn: pickColumn(columnMap, ["urgent", "is_urgent", "urgent_flag", "urgentflag"]),
    uidColumn: pickColumn(columnMap, ["uid", "user_id", "userid", "user_uid", "useruid"]),
    titleColumn: pickColumn(columnMap, ["title", "headline", "subject"]),
    bodyColumn: pickColumn(columnMap, ["body", "text", "content", "description", "details"]),
    whenValueColumn: pickColumn(columnMap, ["when_value", "when", "timeframe", "period"]),
    createdAtColumn: pickColumn(columnMap, [
      "created_at",
      "created_on",
      "createdat",
      "createdAt",
      "created",
    ]),
    updatedAtColumn: pickColumn(columnMap, [
      "updated_at",
      "updated_on",
      "updatedat",
      "updatedAt",
      "updated",
      "modified_at",
      "modifiedon",
    ]),
  };

  if (!schema.urgentColumn && schema.priorityColumn) {
    if (
      !attemptedPriorityToUrgentRename &&
      (await renamePriorityColumnToUrgent(schema.priorityColumn))
    ) {
      cachedUpdatesTableSchema = null;
      return getUpdatesTableSchema();
    }

    schema.urgentColumn = schema.priorityColumn;
    schema.priorityColumn = undefined;
  }

  cachedUpdatesTableSchema = schema;
  return schema;
}

async function renamePriorityColumnToUrgent(columnName: string): Promise<boolean> {
  if (!isTursoConfigured()) {
    return false;
  }

  attemptedPriorityToUrgentRename = true;

  const quotedSource = quoteIdentifier(columnName);
  const quotedTarget = quoteIdentifier("urgent");

  try {
    await execute(`ALTER TABLE updates RENAME COLUMN ${quotedSource} TO ${quotedTarget}`);
    logger.info("[updates] Renamed column to urgent to match application schema.", {
      columnName,
    });
    return true;
  } catch (error) {
    logger.warn("[updates] Failed to rename column to urgent. Falling back to legacy mapping.", {
      columnName,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return false;
  }
}

function toRecord(row: unknown): Record<string, unknown> | null {
  if (!row || Array.isArray(row) || typeof row !== "object") {
    return null;
  }
  return row as Record<string, unknown>;
}

function getValue(row: Record<string, unknown>, columnName: string | undefined): unknown {
  if (!columnName) {
    return undefined;
  }
  return row[columnName];
}

function getStringValue(
  row: Record<string, unknown>,
  columnName: string | undefined,
  fallback: string | null = null
): string | null {
  const value = getValue(row, columnName);
  if (value == null) {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

function getNumberValue(
  row: Record<string, unknown>,
  columnName: string | undefined
): number | null {
  const value = getValue(row, columnName);
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toUpdateRecord(
  row: Record<string, unknown>,
  schema: UpdatesTableSchema,
  viewerId: string
): UpdateRecord | null {
  const id = getStringValue(row, schema.idColumn, null);
  if (!id) {
    return null;
  }

  const body = getStringValue(row, schema.bodyColumn, "") ?? "";
  const titleRaw = getStringValue(row, schema.titleColumn, "") ?? "";
  const title = titleRaw.trim() || body.slice(0, 80) || "Untitled";
  const by = getStringValue(row, schema.byNameColumn, "Unknown");
  const uid = getStringValue(row, schema.uidColumn, "") ?? "";
  const categoryValueRaw = getNumberValue(row, schema.categoryColumn);
  const categoryValue = categoryValueRaw != null ? Number(categoryValueRaw) : 0;
  const normalizedCategory =
    categoryValue === 0 || categoryValue === 1 || categoryValue === 2
      ? (categoryValue as UpdateCategory)
      : 0;
  const urgentSource =
    getNumberValue(row, schema.urgentColumn) ?? getNumberValue(row, schema.priorityColumn) ?? 0;
  const whenRaw = getNumberValue(row, schema.whenValueColumn) ?? -1;
  const createdAtValue =
    getStringValue(row, schema.createdAtColumn) ??
    getStringValue(row, schema.updatedAtColumn) ??
    new Date().toISOString();

  return {
    id,
    by: by ?? "Unknown",
    category: normalizedCategory,
    urgent: Number(urgentSource ?? 0) > 0,
    uid,
    title,
    body,
    when: Number(whenRaw) > 0 ? 1 : -1,
    createdAt: createdAtValue,
    viewerIsOwner: uid === viewerId,
  };
}

async function ensureUserProfile(uid: string, name: string): Promise<void> {
  assertTursoAvailable();

  const safeName = name?.trim() || uid;

  try {
    const schema = await getUsersTableSchema();
    const args: (string | null)[] = [uid];
    const insertColumns: string[] = [schema.idColumn];
    const insertValues: string[] = ["?1"];

    const addArgument = (columnName: string | undefined, value: string | null) => {
      if (!columnName) {
        return;
      }
      args.push(value);
      insertColumns.push(columnName);
      insertValues.push(`?${args.length}`);
    };

    addArgument(schema.emailColumn, uid);
    addArgument(schema.nameColumn, safeName);

    if (schema.createdAtColumn) {
      insertColumns.push(schema.createdAtColumn);
      insertValues.push("datetime('now')");
    }

    if (schema.updatedAtColumn) {
      insertColumns.push(schema.updatedAtColumn);
      insertValues.push("datetime('now')");
    }

    const assignments: string[] = [];

    if (schema.emailColumn) {
      assignments.push(`${schema.emailColumn} = excluded.${schema.emailColumn}`);
    }

    if (schema.nameColumn) {
      assignments.push(`${schema.nameColumn} = excluded.${schema.nameColumn}`);
    }

    if (schema.updatedAtColumn) {
      assignments.push(`${schema.updatedAtColumn} = datetime('now')`);
    }

    const conflictClause =
      assignments.length > 0
        ? `ON CONFLICT(${schema.idColumn}) DO UPDATE SET ${assignments.join(", ")}`
        : `ON CONFLICT(${schema.idColumn}) DO NOTHING`;

    const sql = `INSERT INTO users (${insertColumns.join(", ")})
VALUES (${insertValues.join(", ")})
${conflictClause}`;

    await execute(sql, args as InArgs);
  } catch (error) {
    logger.error("[updates] Failed to ensure user profile", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    throw error;
  }
}

export async function fetchUpdates(
  viewerId: string,
  { limit = 50, offset = 0 }: FetchOptions = {}
): Promise<UpdateRecord[]> {
  assertTursoAvailable();

  const schema = await getUpdatesTableSchema();

  const orderBy = schema.createdAtColumn ?? schema.updatedAtColumn ?? schema.idColumn;

  const result = await execute(
    `SELECT * FROM updates ORDER BY ${orderBy} DESC LIMIT ?1 OFFSET ?2`,
    [limit, offset] as InArgs
  );

  const records: Record<string, unknown>[] = [];
  for (const row of result.rows ?? []) {
    const record = toRecord(row);
    if (record) {
      records.push(record);
    }
  }

  const updates: UpdateRecord[] = [];
  for (const record of records) {
    const update = toUpdateRecord(record, schema, viewerId);
    if (update) {
      updates.push(update);
    }
  }

  return updates;
}

export async function getUpdateById(id: string, viewerId: string): Promise<UpdateRecord | null> {
  assertTursoAvailable();

  const schema = await getUpdatesTableSchema();

  const result = await execute(`SELECT * FROM updates WHERE ${schema.idColumn} = ?1 LIMIT 1`, [
    id,
  ] as InArgs);

  const row = result.rows?.[0];
  const record = toRecord(row);
  if (!record) {
    return null;
  }

  const update = toUpdateRecord(record, schema, viewerId);
  return update;
}

export async function insertUpdate(params: {
  id: string;
  by: string;
  category: UpdateCategory;
  urgent: boolean;
  uid: string;
  title: string | null;
  body: string;
  when: UpdateWhen;
}): Promise<void> {
  assertTursoAvailable();

  await ensureUserProfile(params.uid, params.by);

  const schema = await getUpdatesTableSchema();

  const columns: string[] = [];
  const values: string[] = [];
  const args: (string | number | null)[] = [];

  const pushValue = (columnName: string | undefined, value: string | number | null) => {
    if (!columnName) {
      return;
    }
    columns.push(columnName);
    args.push(value);
    values.push(`?${args.length}`);
  };

  pushValue(schema.idColumn, params.id);
  pushValue(schema.byNameColumn, params.by);
  pushValue(schema.categoryColumn, params.category);

  const urgentValue = params.urgent ? 1 : 0;
  if (schema.priorityColumn) {
    pushValue(schema.priorityColumn, urgentValue);
  }
  if (schema.urgentColumn && schema.urgentColumn !== schema.priorityColumn) {
    pushValue(schema.urgentColumn, urgentValue);
  }

  pushValue(schema.uidColumn, params.uid);
  pushValue(schema.titleColumn, params.title ?? null);
  pushValue(schema.bodyColumn, params.body);
  pushValue(schema.whenValueColumn, params.when);

  if (schema.createdAtColumn) {
    columns.push(schema.createdAtColumn);
    values.push("datetime('now')");
  }

  if (schema.updatedAtColumn) {
    columns.push(schema.updatedAtColumn);
    values.push("datetime('now')");
  }

  const sql = `INSERT INTO updates (${columns.join(", ")}) VALUES (${values.join(", ")})`;

  await execute(sql, args as InArgs);
}

export async function deleteUpdate(id: string, uid: string): Promise<boolean> {
  assertTursoAvailable();

  const schema = await getUpdatesTableSchema();
  const hasUidColumn = Boolean(schema.uidColumn);

  const sql = hasUidColumn
    ? `DELETE FROM updates WHERE ${schema.idColumn} = ?1 AND ${schema.uidColumn} = ?2`
    : `DELETE FROM updates WHERE ${schema.idColumn} = ?1`;
  const args: (string | number)[] = hasUidColumn ? [id, uid] : [id];
  const result = await execute(sql, args as InArgs);
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteAllUpdates(): Promise<number> {
  assertTursoAvailable();

  const result = await execute(`DELETE FROM updates`);
  return result.rowsAffected ?? 0;
}
