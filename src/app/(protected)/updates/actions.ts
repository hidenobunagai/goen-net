"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import { CreateUpdateSchema, deleteAllUpdates, deleteUpdate, insertUpdate } from "@/lib/updates";

export type ActionState = {
  ok: boolean;
  error?: string;
  data?: unknown;
};

export async function createUpdateAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireUserSession();
  const uid = session.user?.email;

  if (!uid) {
    return { ok: false, error: "Authentication required." };
  }

  const rateKey = `updates:post:${uid}`;
  if (!(await checkRateLimit(rateKey, { limit: 10, windowMs: 60_000 }))) {
    return {
      ok: false,
      error: "Too many updates submitted. Please wait a moment.",
    };
  }

  // Parse FormData manually or use Object.fromEntries if structure is simple
  // Since we have a complex schema with numbers and booleans, we need to preprocess
  const rawData = {
    by: formData.get("by")?.toString(),
    category: Number(formData.get("category")),
    urgent: formData.get("urgent") === "true" || formData.get("urgent") === "on",
    title: formData.get("title")?.toString(),
    body: formData.get("body")?.toString(),
    when: Number(formData.get("when")),
  };

  const parsed = CreateUpdateSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0].message,
    };
  }

  const data = parsed.data;
  const id = randomUUID();
  const by = data.by?.trim() || session.user?.name || "Unknown";
  const title = data.title?.trim() || "";
  const body = data.body?.trim() || "";

  if (!title && !body) {
    return { ok: false, error: "Title or body is required." };
  }

  try {
    await insertUpdate({
      id,
      by,
      category: (data.category ?? 0) as 0 | 1 | 2,
      urgent: data.urgent ?? false,
      uid,
      title: title || body.slice(0, 80) || "Untitled",
      body,
      when: (data.when === 1 ? 1 : -1) as -1 | 1,
    });

    revalidatePath("/updates");
    return { ok: true };
  } catch (error) {
    logger.error("Failed to create update", { error });
    if (error instanceof TursoUnavailableError) {
      return {
        ok: false,
        error: "Database unavailable. Please try again later.",
      };
    }
    return { ok: false, error: "Failed to create update." };
  }
}

export async function deleteUpdateAction(id: string): Promise<ActionState> {
  const session = await requireUserSession();
  const uid = session.user?.email;

  if (!uid) {
    return { ok: false, error: "Authentication required." };
  }

  const rateKey = `updates:delete:${uid}`;
  if (!(await checkRateLimit(rateKey, { limit: 10, windowMs: 60_000 }))) {
    return { ok: false, error: "Too many delete requests." };
  }

  try {
    await deleteUpdate(id, uid);
    revalidatePath("/updates");
    return { ok: true };
  } catch (error) {
    logger.error("Failed to delete update", { error });
    if (error instanceof TursoUnavailableError) {
      return { ok: false, error: "Database unavailable." };
    }
    return { ok: false, error: "Failed to delete update." };
  }
}

export async function deleteAllUpdatesAction(): Promise<ActionState> {
  const session = await requireUserSession();
  const uid = session.user?.email;

  if (!uid) {
    return { ok: false, error: "Authentication required." };
  }

  // Only allow specific users or admins if needed, but for now open to auth users as per existing logic
  // Existing logic in route.ts didn't restrict delete ALL?
  // Wait, route.ts DELETE handler calls `deleteAllUpdates()`?
  // Let's check route.ts again.
  // Yes, `deleteAllUpdates()` is called. It seems dangerous but I will replicate it.

  try {
    await deleteAllUpdates();
    revalidatePath("/updates");
    return { ok: true };
  } catch (error) {
    logger.error("Failed to delete all updates", { error });
    if (error instanceof TursoUnavailableError) {
      return { ok: false, error: "Database unavailable." };
    }
    return { ok: false, error: "Failed to delete updates." };
  }
}
