import { TursoUnavailableError, execute, isTursoConfigured } from "@/lib/turso";
import type { InArgs } from "@libsql/client";
import { randomUUID } from "crypto";

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
  votes: number;
  viewerHasVoted: boolean;
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

type MemoryUpdate = {
  id: string;
  by: string;
  category: UpdateCategory;
  urgent: boolean;
  uid: string;
  title: string;
  body: string;
  when: UpdateWhen;
  createdAt: string;
  voters: Set<string>;
};

type UpdatesMemoryStore = {
  updates: MemoryUpdate[];
  fallbackEnabled: boolean;
};

const globalUpdatesStore = globalThis as typeof globalThis & {
  __goenNetUpdatesMemory?: UpdatesMemoryStore;
};

if (!globalUpdatesStore.__goenNetUpdatesMemory) {
  globalUpdatesStore.__goenNetUpdatesMemory = {
    updates: [],
    fallbackEnabled: false,
  };
}

const memoryStore = globalUpdatesStore.__goenNetUpdatesMemory;
const memoryUpdates = memoryStore.updates;

function shouldUseMemory(): boolean {
  return memoryStore.fallbackEnabled || !isTursoConfigured();
}

function fallbackToMemoryOnError(error: unknown): boolean {
  if (shouldUseMemory()) {
    return true;
  }

  const allowFallback =
    error instanceof TursoUnavailableError ||
    process.env.NODE_ENV !== "production";

  if (!allowFallback) {
    return false;
  }

  if (!memoryStore.fallbackEnabled) {
    console.warn(
      "[updates] Falling back to in-memory storage for updates operations.",
      error
    );
    memoryStore.fallbackEnabled = true;
  }

  return true;
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
  const rows = (result?.rows ?? []) as Array<
    Record<string, unknown> | unknown[]
  >;
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

  const idColumn =
    columnMap.get("uid") ?? columnMap.get("id") ?? columnMap.get("user_id");

  if (!idColumn) {
    throw new Error("[updates] users table is missing an id or uid column");
  }

  const schema: UsersTableSchema = {
    idColumn,
    emailColumn: pickColumn(columnMap, [
      "email",
      "email_address",
      "user_email",
    ]),
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

function pickColumn(
  columnMap: Map<string, string>,
  candidates: string[]
): string | undefined {
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

type UpdateVotesTableSchema = {
  idColumn: string;
  updateIdColumn: string;
  uidColumn: string;
  createdAtColumn?: string;
  updatedAtColumn?: string;
};

let cachedUpdatesTableSchema: UpdatesTableSchema | null = null;
let cachedUpdateVotesTableSchema: UpdateVotesTableSchema | null = null;

async function getUpdatesTableSchema(): Promise<UpdatesTableSchema> {
  if (cachedUpdatesTableSchema) {
    return cachedUpdatesTableSchema;
  }

  const result = await execute("PRAGMA table_info('updates')");
  const rows = (result?.rows ?? []) as Array<
    Record<string, unknown> | unknown[]
  >;
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

  const idColumn =
    pickColumn(columnMap, ["id", "update_id"]) ?? columnMap.get("id");

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
    categoryColumn: pickColumn(columnMap, [
      "category",
      "category_id",
      "categoryid",
    ]),
    priorityColumn: pickColumn(columnMap, [
      "priority",
      "priority_level",
      "prioritylevel",
    ]),
    urgentColumn: pickColumn(columnMap, [
      "urgent",
      "is_urgent",
      "urgent_flag",
      "urgentflag",
    ]),
    uidColumn: pickColumn(columnMap, [
      "uid",
      "user_id",
      "userid",
      "user_uid",
      "useruid",
    ]),
    titleColumn: pickColumn(columnMap, ["title", "headline", "subject"]),
    bodyColumn: pickColumn(columnMap, [
      "body",
      "text",
      "content",
      "description",
      "details",
    ]),
    whenValueColumn: pickColumn(columnMap, [
      "when_value",
      "when",
      "timeframe",
      "period",
    ]),
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

  cachedUpdatesTableSchema = schema;
  return schema;
}

async function getUpdateVotesTableSchema(): Promise<UpdateVotesTableSchema> {
  if (cachedUpdateVotesTableSchema) {
    return cachedUpdateVotesTableSchema;
  }

  const result = await execute("PRAGMA table_info('update_votes')");
  const rows = (result?.rows ?? []) as Array<
    Record<string, unknown> | unknown[]
  >;
  const columnMap = new Map<string, string>();

  for (const row of rows) {
    const name = extractColumnName(row);
    if (name) {
      columnMap.set(name.toLowerCase(), name);
    }
  }

  if (columnMap.size === 0) {
    throw new Error(
      "[updates] update_votes table is missing or has no columns"
    );
  }

  const idColumn = pickColumn(columnMap, ["id", "vote_id", "voteid"]);
  const updateIdColumn = pickColumn(columnMap, [
    "update_id",
    "updateid",
    "update",
  ]);
  const uidColumn = pickColumn(columnMap, ["uid", "user_id", "userid"]);

  if (!idColumn || !updateIdColumn || !uidColumn) {
    throw new Error(
      "[updates] update_votes table is missing required columns (id/update_id/uid)"
    );
  }

  const schema: UpdateVotesTableSchema = {
    idColumn,
    updateIdColumn,
    uidColumn,
    createdAtColumn: pickColumn(columnMap, [
      "created_at",
      "created_on",
      "createdat",
      "created",
    ]),
    updatedAtColumn: pickColumn(columnMap, [
      "updated_at",
      "updated_on",
      "updatedat",
      "updated",
    ]),
  };

  cachedUpdateVotesTableSchema = schema;
  return schema;
}

function toRecord(row: unknown): Record<string, unknown> | null {
  if (!row || Array.isArray(row) || typeof row !== "object") {
    return null;
  }
  return row as Record<string, unknown>;
}

function getValue(
  row: Record<string, unknown>,
  columnName: string | undefined
): unknown {
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

function getStringFromKey(
  row: Record<string, unknown>,
  key: string
): string | null {
  const value = row[key];
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

function getNumberFromKey(
  row: Record<string, unknown>,
  key: string
): number | null {
  const value = row[key];
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function createPlaceholders(startIndex: number, count: number): string {
  return Array.from(
    { length: count },
    (_, index) => `?${startIndex + index}`
  ).join(", ");
}

type VoteSummary = {
  votes: number;
  viewerHasVoted: boolean;
};

async function getVoteSummaries(
  viewerId: string,
  updateIds: string[]
): Promise<Map<string, VoteSummary>> {
  const summaries = new Map<string, VoteSummary>();

  if (updateIds.length === 0) {
    return summaries;
  }

  const votesSchema = await getUpdateVotesTableSchema();
  const placeholders = createPlaceholders(2, updateIds.length);
  const sql = `SELECT ${votesSchema.updateIdColumn} AS update_id,
    COUNT(${votesSchema.idColumn}) AS votes,
    SUM(CASE WHEN ${votesSchema.uidColumn} = ?1 THEN 1 ELSE 0 END) AS viewer_has_voted
    FROM update_votes
    WHERE ${votesSchema.updateIdColumn} IN (${placeholders})
    GROUP BY ${votesSchema.updateIdColumn}`;
  const args: (string | number)[] = [viewerId, ...updateIds];
  const result = await execute(sql, args as InArgs);

  for (const row of result.rows ?? []) {
    const record = toRecord(row);
    if (!record) {
      continue;
    }
    const updateId =
      getStringFromKey(record, "update_id") ??
      getStringFromKey(record, votesSchema.updateIdColumn);
    if (!updateId) {
      continue;
    }
    const votes =
      getNumberFromKey(record, "votes") ??
      getNumberFromKey(record, `count(${votesSchema.idColumn})`) ??
      0;
    const viewerHasVotedCount =
      getNumberFromKey(record, "viewer_has_voted") ??
      getNumberFromKey(record, "viewerHasVoted") ??
      0;
    summaries.set(updateId, {
      votes: Number(votes ?? 0),
      viewerHasVoted: Number(viewerHasVotedCount ?? 0) > 0,
    });
  }

  return summaries;
}

function toUpdateRecord(
  row: Record<string, unknown>,
  schema: UpdatesTableSchema,
  viewerId: string,
  votes: Map<string, VoteSummary>
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
    getNumberValue(row, schema.urgentColumn) ??
    getNumberValue(row, schema.priorityColumn) ??
    0;
  const whenRaw = getNumberValue(row, schema.whenValueColumn) ?? -1;
  const createdAtValue =
    getStringValue(row, schema.createdAtColumn) ??
    getStringValue(row, schema.updatedAtColumn) ??
    new Date().toISOString();

  const voteSummary = votes.get(id) ?? { votes: 0, viewerHasVoted: false };

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
    votes: Number(voteSummary.votes ?? 0),
    viewerHasVoted: Boolean(voteSummary.viewerHasVoted),
    viewerIsOwner: uid === viewerId,
  };
}

async function ensureUserProfile(uid: string, name: string): Promise<void> {
  if (shouldUseMemory()) {
    return;
  }

  const safeName = name?.trim() || uid;

  try {
    const schema = await getUsersTableSchema();
    const args: (string | null)[] = [uid];
    const insertColumns: string[] = [schema.idColumn];
    const insertValues: string[] = ["?1"];

    const addArgument = (
      columnName: string | undefined,
      value: string | null
    ) => {
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
      assignments.push(
        `${schema.emailColumn} = excluded.${schema.emailColumn}`
      );
    }

    if (schema.nameColumn) {
      assignments.push(`${schema.nameColumn} = excluded.${schema.nameColumn}`);
    }

    if (schema.updatedAtColumn) {
      assignments.push(`${schema.updatedAtColumn} = datetime('now')`);
    }

    const conflictClause =
      assignments.length > 0
        ? `ON CONFLICT(${schema.idColumn}) DO UPDATE SET ${assignments.join(
            ", "
          )}`
        : `ON CONFLICT(${schema.idColumn}) DO NOTHING`;

    const sql = `INSERT INTO users (${insertColumns.join(", ")})
VALUES (${insertValues.join(", ")})
${conflictClause}`;

    await execute(sql, args as InArgs);
  } catch (error) {
    console.error("[updates] Failed to ensure user profile", error);
    throw error;
  }
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toRecordFromMemory(
  item: MemoryUpdate,
  viewerId: string
): UpdateRecord {
  const votes = item.voters.size;
  return {
    id: item.id,
    by: item.by,
    category: item.category,
    urgent: item.urgent,
    uid: item.uid,
    title: item.title,
    body: item.body,
    when: item.when,
    createdAt: item.createdAt,
    votes,
    viewerHasVoted: viewerId ? item.voters.has(viewerId) : false,
    viewerIsOwner: item.uid === viewerId,
  };
}

function fetchUpdatesFromMemory(
  viewerId: string,
  { limit = 50, offset = 0 }: FetchOptions = {}
): UpdateRecord[] {
  return memoryUpdates
    .slice()
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(offset, offset + limit)
    .map((item) => toRecordFromMemory(item, viewerId));
}

function getUpdateFromMemory(
  id: string,
  viewerId: string
): UpdateRecord | null {
  const match = memoryUpdates.find((item) => item.id === id);
  return match ? toRecordFromMemory(match, viewerId) : null;
}

function insertUpdateIntoMemory(params: {
  id: string;
  by: string;
  category: UpdateCategory;
  urgent: boolean;
  uid: string;
  title: string | null;
  body: string;
  when: UpdateWhen;
}): void {
  const createdAt = new Date().toISOString();
  const title = params.title ?? (params.body.slice(0, 80) || "Untitled");
  const item: MemoryUpdate = {
    id: params.id,
    by: params.by,
    category: params.category,
    urgent: params.urgent,
    uid: params.uid,
    title,
    body: params.body,
    when: params.when,
    createdAt,
    voters: new Set(),
  };
  memoryUpdates.unshift(item);
}

function deleteUpdateFromMemory(id: string, uid: string): boolean {
  const index = memoryUpdates.findIndex(
    (item) => item.id === id && item.uid === uid
  );
  if (index === -1) return false;
  memoryUpdates.splice(index, 1);
  return true;
}

function deleteAllUpdatesFromMemory(): number {
  const deleted = memoryUpdates.length;
  memoryUpdates.splice(0, memoryUpdates.length);
  return deleted;
}

function upsertVoteInMemory(
  updateId: string,
  uid: string,
  voting: boolean
): { votes: number; viewerHasVoted: boolean } {
  const update = memoryUpdates.find((item) => item.id === updateId);
  if (!update) {
    throw new UpdateNotFoundError();
  }

  if (voting) {
    update.voters.add(uid);
  } else {
    update.voters.delete(uid);
  }

  return {
    votes: update.voters.size,
    viewerHasVoted: update.voters.has(uid),
  };
}

export async function fetchUpdates(
  viewerId: string,
  { limit = 50, offset = 0 }: FetchOptions = {}
): Promise<UpdateRecord[]> {
  if (shouldUseMemory()) {
    return fetchUpdatesFromMemory(viewerId, { limit, offset });
  }

  const schema = await getUpdatesTableSchema();

  const orderBy =
    schema.createdAtColumn ?? schema.updatedAtColumn ?? schema.idColumn;

  try {
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

    const updateIds = records
      .map((record) => getStringValue(record, schema.idColumn) ?? null)
      .filter((id): id is string => Boolean(id));

    const voteSummaries = await getVoteSummaries(viewerId, updateIds);

    const updates: UpdateRecord[] = [];
    for (const record of records) {
      const update = toUpdateRecord(record, schema, viewerId, voteSummaries);
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return fetchUpdatesFromMemory(viewerId, { limit, offset });
    }
    throw error;
  }
}

export async function getUpdateById(
  id: string,
  viewerId: string
): Promise<UpdateRecord | null> {
  if (shouldUseMemory()) {
    return getUpdateFromMemory(id, viewerId);
  }

  const schema = await getUpdatesTableSchema();

  try {
    const result = await execute(
      `SELECT * FROM updates WHERE ${schema.idColumn} = ?1 LIMIT 1`,
      [id] as InArgs
    );

    const row = result.rows?.[0];
    const record = toRecord(row);
    if (!record) {
      return null;
    }

    const rowId = getStringValue(record, schema.idColumn) ?? id;
    const voteSummaries = await getVoteSummaries(
      viewerId,
      rowId ? [rowId] : []
    );
    const update = toUpdateRecord(record, schema, viewerId, voteSummaries);
    return update;
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return getUpdateFromMemory(id, viewerId);
    }
    throw error;
  }
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
  if (shouldUseMemory()) {
    insertUpdateIntoMemory(params);
    return;
  }

  try {
    await ensureUserProfile(params.uid, params.by);

    const schema = await getUpdatesTableSchema();

    const columns: string[] = [];
    const values: string[] = [];
    const args: (string | number | null)[] = [];

    const pushValue = (
      columnName: string | undefined,
      value: string | number | null
    ) => {
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

    const sql = `INSERT INTO updates (${columns.join(
      ", "
    )}) VALUES (${values.join(", ")})`;

    await execute(sql, args as InArgs);
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      insertUpdateIntoMemory(params);
      return;
    }
    throw error;
  }
}

export async function deleteUpdate(id: string, uid: string): Promise<boolean> {
  if (shouldUseMemory()) {
    return deleteUpdateFromMemory(id, uid);
  }

  const schema = await getUpdatesTableSchema();
  const hasUidColumn = Boolean(schema.uidColumn);

  try {
    const sql = hasUidColumn
      ? `DELETE FROM updates WHERE ${schema.idColumn} = ?1 AND ${schema.uidColumn} = ?2`
      : `DELETE FROM updates WHERE ${schema.idColumn} = ?1`;
    const args: (string | number)[] = hasUidColumn ? [id, uid] : [id];
    const result = await execute(sql, args as InArgs);
    return (result.rowsAffected ?? 0) > 0;
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return deleteUpdateFromMemory(id, uid);
    }
    throw error;
  }
}

export async function deleteAllUpdates(): Promise<number> {
  if (shouldUseMemory()) {
    return deleteAllUpdatesFromMemory();
  }

  try {
    const result = await execute(`DELETE FROM updates`);
    return result.rowsAffected ?? 0;
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return deleteAllUpdatesFromMemory();
    }
    throw error;
  }
}

export async function upsertVote(
  updateId: string,
  uid: string,
  voting: boolean
): Promise<{ votes: number; viewerHasVoted: boolean }> {
  if (shouldUseMemory()) {
    return upsertVoteInMemory(updateId, uid, voting);
  }

  const votesSchema = await getUpdateVotesTableSchema();

  try {
    if (voting) {
      const columns = [
        votesSchema.idColumn,
        votesSchema.updateIdColumn,
        votesSchema.uidColumn,
      ];
      const values = ["?1", "?2", "?3"];
      const args: (string | number | null)[] = [randomUUID(), updateId, uid];

      if (votesSchema.createdAtColumn) {
        columns.push(votesSchema.createdAtColumn);
        values.push("datetime('now')");
      }

      if (votesSchema.updatedAtColumn) {
        columns.push(votesSchema.updatedAtColumn);
        values.push("datetime('now')");
      }

      const insertSql = `INSERT INTO update_votes (${columns.join(", ")})
VALUES (${values.join(", ")})
ON CONFLICT (${votesSchema.updateIdColumn}, ${
        votesSchema.uidColumn
      }) DO NOTHING`;

      await execute(insertSql, args as InArgs);
    } else {
      const deleteSql = `DELETE FROM update_votes WHERE ${votesSchema.updateIdColumn} = ?1 AND ${votesSchema.uidColumn} = ?2`;
      await execute(deleteSql, [updateId, uid] as InArgs);
    }

    const summary = await getVoteSummaries(uid, [updateId]);
    const info = summary.get(updateId) ?? { votes: 0, viewerHasVoted: voting };

    return {
      votes: Number(info.votes ?? 0),
      viewerHasVoted: Boolean(info.viewerHasVoted),
    };
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return upsertVoteInMemory(updateId, uid, voting);
    }
    throw error;
  }
}
