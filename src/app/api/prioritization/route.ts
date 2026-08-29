import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getPrioritizationBoard, savePrioritizationBoard } from "@/lib/prioritization";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import { JsonBodyError, requireJson } from "@/lib/utils";

export async function GET() {
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

  try {
    const board = await getPrioritizationBoard();
    return NextResponse.json({ ok: true, board });
  } catch (error) {
    logger.error("Failed to load prioritization board", { error });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "FETCH_FAILED",
          message: unavailable
            ? "Prioritization board cannot be loaded because the database is unavailable."
            : "Unable to load prioritization board.",
        },
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
  if (uid) {
    const rateKey = `prioritization:put:${uid}`;
    if (!(await checkRateLimit(rateKey, { limit: 30, windowMs: 60_000 }))) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "RATE_LIMITED", message: "Too many save requests. Please slow down." },
        },
        { status: 429 }
      );
    }
  }

  let payload: { board?: unknown };
  try {
    payload = await requireJson<{ board?: unknown }>(request);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_JSON", message: error.message } },
        { status: error.status }
      );
    }
    throw error;
  }

  try {
    await savePrioritizationBoard(payload.board ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to save prioritization board", { error });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "SAVE_FAILED",
          message: unavailable
            ? "Prioritization board cannot be saved because the database is unavailable."
            : "Unable to save prioritization board.",
        },
      },
      { status: 503 }
    );
  }
}
