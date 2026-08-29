import type { InArgs } from "@libsql/client";
import { z } from "zod";

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

export const CreateUpdateSchema = z.object({
  by: z.string().optional(),
  category: z
    .number()
    .refine((value): value is 0 | 1 | 2 => value === 0 || value === 1 || value === 2, {
      message: "Category must be one of 0 (Work), 1 (Family), or 2 (Personal).",
    })
    .optional(),
  urgent: z.boolean().optional(),
  priority: z.boolean().optional(), // Legacy support
  title: z.string().nullable().optional(),
  update: z.string().optional(), // Legacy support
  body: z.string().optional(),
  when: z
    .number()
    .refine((value): value is -1 | 1 => value === -1 || value === 1, {
      message: "When must be either -1 (Past) or 1 (Future).",
    })
    .optional(),
});

export type CreateUpdateInput = z.infer<typeof CreateUpdateSchema>;

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

function toRecord(row: unknown): Record<string, unknown> | null {
  if (!row || Array.isArray(row) || typeof row !== "object") {
    return null;
  }
  return row as Record<string, unknown>;
}

function toUpdateRecord(row: Record<string, unknown>, viewerId: string): UpdateRecord | null {
  const id = row.id != null ? String(row.id) : null;
  if (!id) return null;

  const body = row.body != null ? String(row.body) : "";
  const titleRaw = row.title != null ? String(row.title) : "";
  const title = titleRaw.trim() || body.slice(0, 80) || "Untitled";
  const by = row.by_name != null ? String(row.by_name) : "Unknown";
  const uid = row.uid != null ? String(row.uid) : "";
  const categoryRaw = row.category != null ? Number(row.category) : 0;
  const category = (categoryRaw === 1 || categoryRaw === 2 ? categoryRaw : 0) as UpdateCategory;
  const urgent = Number(row.urgent ?? 0) > 0;
  const whenRaw = row.when_value != null ? Number(row.when_value) : -1;
  const createdAt = (row.created_at ?? row.updated_at ?? new Date().toISOString()) as string;

  return {
    id,
    by,
    category,
    urgent,
    uid,
    title,
    body,
    when: Number(whenRaw) > 0 ? 1 : -1,
    createdAt: String(createdAt),
    viewerIsOwner: uid === viewerId,
  };
}

async function ensureUserProfile(uid: string, name: string): Promise<void> {
  assertTursoAvailable();
  const safeName = name?.trim() || uid;
  try {
    await execute(
      `INSERT INTO users (uid, email, name, created_at, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
       ON CONFLICT(uid) DO UPDATE SET email=excluded.email, name=excluded.name, updated_at=datetime('now')`,
      [uid, uid, safeName] as InArgs
    );
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
  const result = await execute(
    "SELECT * FROM updates ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
    [limit, offset] as InArgs
  );
  const updates: UpdateRecord[] = [];
  for (const row of result.rows ?? []) {
    const record = toRecord(row);
    if (!record) continue;
    const update = toUpdateRecord(record, viewerId);
    if (update) updates.push(update);
  }
  return updates;
}

export async function getUpdateById(id: string, viewerId: string): Promise<UpdateRecord | null> {
  assertTursoAvailable();
  const result = await execute("SELECT * FROM updates WHERE id = ?1 LIMIT 1", [id] as InArgs);
  const record = toRecord(result.rows?.[0]);
  if (!record) return null;
  return toUpdateRecord(record, viewerId);
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
  await execute(
    `INSERT INTO updates (id, by_name, category, urgent, uid, title, body, when_value, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))`,
    [
      params.id,
      params.by,
      params.category,
      params.urgent ? 1 : 0,
      params.uid,
      params.title,
      params.body,
      params.when,
    ] as InArgs
  );
}

export async function deleteUpdate(id: string, uid: string): Promise<boolean> {
  assertTursoAvailable();
  const result = await execute("DELETE FROM updates WHERE id = ?1 AND uid = ?2", [
    id,
    uid,
  ] as InArgs);
  return (result.rowsAffected ?? 0) > 0;
}
