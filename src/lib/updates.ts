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

async function ensureUserProfile(uid: string, name: string): Promise<void> {
  if (shouldUseMemory()) {
    return;
  }

  const safeName = name?.trim() || uid;

  try {
    await execute(
      `INSERT INTO users (uid, email, name, created_at, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
       ON CONFLICT(uid) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         updated_at = datetime('now')`,
      [uid, uid, safeName]
    );
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

  const args: InArgs = [viewerId, limit, offset];
  try {
    const result = await execute(
      `WITH ranked_updates AS (
       SELECT
         u.id,
         u.by_name AS by,
         u.category,
         COALESCE(u.urgent, u.priority) AS urgent,
         u.uid,
         COALESCE(NULLIF(u.title, ''), SUBSTR(u.body, 1, 80), 'Untitled') AS title,
         u.body,
         u.when_value AS when_value,
         u.created_at,
         COUNT(v.id) AS votes,
         SUM(CASE WHEN v.uid = ?1 THEN 1 ELSE 0 END) AS viewer_has_voted
       FROM updates u
       LEFT JOIN update_votes v ON v.update_id = u.id
       GROUP BY u.id
     )
     SELECT
       id,
       by,
       category,
       urgent,
       uid,
       title,
       body,
       when_value,
       created_at,
       votes,
       viewer_has_voted
     FROM ranked_updates
     ORDER BY created_at DESC
     LIMIT ?2 OFFSET ?3`,
      args
    );

    return (result.rows ?? []).map((row) => ({
      id: String(row.id),
      by: String(row.by),
      category: Number(row.category) as UpdateCategory,
      urgent: Number(row.urgent ?? row.priority ?? 0) === 1,
      uid: String(row.uid),
      title: String(row.title),
      body: String(row.body ?? ""),
      when: Number(row.when_value) === 1 ? 1 : -1,
      createdAt: String(row.created_at),
      votes: Number(row.votes ?? 0),
      viewerHasVoted: Number(row.viewer_has_voted ?? 0) > 0,
      viewerIsOwner: String(row.uid) === viewerId,
    }));
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

  try {
    const result = await execute(
      `SELECT
       u.id,
       u.by_name AS by,
       u.category,
  COALESCE(u.urgent, u.priority) AS urgent,
       u.uid,
       COALESCE(NULLIF(u.title, ''), SUBSTR(u.body, 1, 80), 'Untitled') AS title,
       u.body,
       u.when_value,
       u.created_at,
       COUNT(v.id) AS votes,
       SUM(CASE WHEN v.uid = ?2 THEN 1 ELSE 0 END) AS viewer_has_voted
     FROM updates u
     LEFT JOIN update_votes v ON v.update_id = u.id
     WHERE u.id = ?1
     GROUP BY u.id`,
      [id, viewerId]
    );

    const row = result.rows?.[0];
    if (!row) return null;

    return {
      id: String(row.id),
      by: String(row.by),
      category: Number(row.category) as UpdateCategory,
      urgent: Number(row.urgent ?? row.priority ?? 0) === 1,
      uid: String(row.uid),
      title: String(row.title),
      body: String(row.body ?? ""),
      when: Number(row.when_value) === 1 ? 1 : -1,
      createdAt: String(row.created_at),
      votes: Number(row.votes ?? 0),
      viewerHasVoted: Number(row.viewer_has_voted ?? 0) > 0,
      viewerIsOwner: String(row.uid) === viewerId,
    };
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

  const args: InArgs = [
    params.id,
    params.by,
    params.category,
    params.urgent ? 1 : 0,
    params.uid,
    params.title,
    params.body,
    params.when,
  ];
  try {
    await ensureUserProfile(params.uid, params.by);
    await execute(
      `INSERT INTO updates (id, by_name, category, priority, uid, title, body, when_value, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))`,
      args
    );
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

  try {
    const result = await execute(
      `DELETE FROM updates WHERE id = ?1 AND uid = ?2`,
      [id, uid]
    );
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

  try {
    if (voting) {
      await execute(
        `INSERT INTO update_votes (id, update_id, uid, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT (update_id, uid) DO NOTHING`,
        [randomUUID(), updateId, uid]
      );
    } else {
      await execute(
        `DELETE FROM update_votes WHERE update_id = ?1 AND uid = ?2`,
        [updateId, uid]
      );
    }

    const result = await execute(
      `SELECT
         COUNT(id) AS votes,
         SUM(CASE WHEN uid = ?2 THEN 1 ELSE 0 END) AS viewer_has_voted
       FROM update_votes
       WHERE update_id = ?1`,
      [updateId, uid]
    );

    const row = result.rows?.[0] ?? {};
    return {
      votes: Number(row.votes ?? 0),
      viewerHasVoted: Number(row.viewer_has_voted ?? 0) > 0,
    };
  } catch (error) {
    if (fallbackToMemoryOnError(error)) {
      return upsertVoteInMemory(updateId, uid, voting);
    }
    throw error;
  }
}
