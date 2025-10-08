import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import type { UpdateRecord } from "@/lib/updates";
import { deleteAllUpdates, fetchUpdates, getUpdateById, insertUpdate } from "@/lib/updates";
import { JsonBodyError, requireJson } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getOptionalUserSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  const email = session.user?.email;
  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NO_EMAIL",
          message: "Unable to determine user email for this session.",
        },
      },
      { status: 400 }
    );
  }

  const rateKey = `updates:get:${email}`;
  if (!(await checkRateLimit(rateKey, { limit: 120, windowMs: 60_000 }))) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many requests. Please wait a moment and try again.",
        },
      },
      { status: 429 }
    );
  }

  try {
    const updates = await fetchUpdates(email, { limit, offset });
    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    logger.error("Failed to fetch updates", { error });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "FETCH_FAILED",
          message: unavailable
            ? "Updates cannot be loaded because the database is currently unavailable."
            : "Unable to load updates right now. Please try again soon.",
        },
      },
      { status: 503 }
    );
  }
}

type CreateUpdatePayload = {
  by?: string;
  category?: number;
  urgent?: boolean;
  priority?: boolean;
  title?: string | null;
  update?: string;
  when?: number;
};

export async function POST(request: Request) {
  const session = await getOptionalUserSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      },
      { status: 401 }
    );
  }

  let body: CreateUpdatePayload;
  try {
    body = await requireJson<CreateUpdatePayload>(request);
  } catch (error: unknown) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_JSON", message: error.message } },
        { status: error.status }
      );
    }
    throw error;
  }
  const by = typeof body?.by === "string" ? body.by.trim() : (session.user?.name ?? "Unknown");
  const category = Number(body?.category ?? 0);
  const urgent = Boolean(typeof body?.urgent === "boolean" ? body.urgent : body?.priority);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const updateText = typeof body?.update === "string" ? body.update.trim() : "";
  const when = Number(body?.when ?? -1);

  if (!title) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_BODY", message: "Title is required." },
      },
      { status: 422 }
    );
  }

  if (!updateText) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_BODY", message: "Update text is required." },
      },
      { status: 422 }
    );
  }

  const uid = session.user?.email;
  if (!uid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NO_EMAIL",
          message: "Unable to determine user email for this session.",
        },
      },
      { status: 400 }
    );
  }

  const rateKey = `updates:post:${uid}`;
  if (!(await checkRateLimit(rateKey, { limit: 10, windowMs: 60_000 }))) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message:
            "Too many updates were submitted in a short period. Please pause and try again shortly.",
        },
      },
      { status: 429 }
    );
  }

  const id = randomUUID();

  try {
    await insertUpdate({
      id,
      by,
      category: category as 0 | 1 | 2,
      urgent,
      uid,
      title,
      body: updateText,
      when: (when === 1 ? 1 : -1) as -1 | 1,
    });
  } catch (error) {
    logger.error("Failed to create update", { error });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "CREATE_FAILED",
          message: unavailable
            ? "Updates cannot be posted right now because the database is unavailable. 現在はデータベースに接続できないため投稿できません。サービス復旧後に再度お試しください。"
            : "Unable to create an update right now. Please try again later.",
        },
      },
      { status: 503 }
    );
  }

  let created: Awaited<ReturnType<typeof getUpdateById>> = null;
  try {
    created = await getUpdateById(id, uid);
  } catch (error) {
    logger.error("Failed to load created update", { error });
  }

  if (!created) {
    const fallbackTitle = title ?? (updateText.slice(0, 80) || "Untitled");
    const fallback: UpdateRecord = {
      id,
      by,
      category: category as 0 | 1 | 2,
      urgent,
      uid,
      title: fallbackTitle,
      body: updateText,
      when: (when === 1 ? 1 : -1) as -1 | 1,
      createdAt: new Date().toISOString(),
      viewerIsOwner: true,
    };
    created = fallback;
  }

  return NextResponse.json({ ok: true, id, update: created });
}

export async function DELETE() {
  const session = await getOptionalUserSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      },
      { status: 401 }
    );
  }

  const uid = session.user?.email;
  if (!uid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NO_EMAIL",
          message: "Unable to determine user email for this session.",
        },
      },
      { status: 400 }
    );
  }

  const rateKey = `updates:delete:${uid}`;
  if (!(await checkRateLimit(rateKey, { limit: 3, windowMs: 60_000 }))) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMIT",
          message: "Too many delete requests. Please wait before trying again.",
        },
      },
      { status: 429 }
    );
  }

  try {
    const deleted = await deleteAllUpdates();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    logger.error("Failed to delete updates", { error });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "DELETE_FAILED",
          message: unavailable
            ? "Updates cannot be cleared right now because the database is unavailable."
            : "Unable to delete updates right now. Please try again later.",
        },
      },
      { status: 503 }
    );
  }
}
