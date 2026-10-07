import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, apiServiceError, resolveApiSession } from "@/lib/api";
import {
  getPrioritizationBoard,
  PrioritizationConflictError,
  savePrioritizationBoard,
} from "@/lib/prioritization";
import { checkRateLimit } from "@/lib/rate-limit";
import { JsonBodyError, PayloadTooLargeError, requireJson } from "@/lib/utils";

type SavePrioritizationPayload = {
  board?: unknown;
  baseUpdatedAt?: unknown;
};

export async function GET() {
  const auth = await resolveApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const record = await getPrioritizationBoard();
    return NextResponse.json({ ok: true, board: record.data, updatedAt: record.updatedAt });
  } catch (error) {
    return apiServiceError(error, {
      logMessage: "Failed to load prioritization board",
      code: "FETCH_FAILED",
      message: "Unable to load prioritization board.",
      unavailableMessage:
        "Prioritization board cannot be loaded because the database is unavailable.",
    });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await resolveApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const uid = auth.session.user?.email;
  if (uid) {
    const rateKey = `prioritization:put:${uid}`;
    if (!(await checkRateLimit(rateKey, { limit: 30, windowMs: 60_000 }))) {
      return apiError("RATE_LIMITED", "Too many save requests. Please slow down.", 429);
    }
  }

  let payload: SavePrioritizationPayload;
  try {
    payload = await requireJson<SavePrioritizationPayload>(request);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return apiError("INVALID_JSON", error.message, error.status);
    }
    throw error;
  }

  if (
    payload.baseUpdatedAt !== undefined &&
    payload.baseUpdatedAt !== null &&
    typeof payload.baseUpdatedAt !== "string"
  ) {
    return apiError("INVALID_BODY", "baseUpdatedAt must be a string or null.", 400);
  }

  const baseUpdatedAt = typeof payload.baseUpdatedAt === "string" ? payload.baseUpdatedAt : null;

  try {
    const updatedAt = await savePrioritizationBoard(payload.board ?? null, baseUpdatedAt);
    return NextResponse.json({ ok: true, updatedAt });
  } catch (error) {
    if (error instanceof PrioritizationConflictError) {
      return apiError("SAVE_CONFLICT", error.message, error.status);
    }
    if (error instanceof PayloadTooLargeError) {
      return apiError("PAYLOAD_TOO_LARGE", error.message, error.status);
    }
    return apiServiceError(error, {
      logMessage: "Failed to save prioritization board",
      code: "SAVE_FAILED",
      message: "Unable to save prioritization board.",
      unavailableMessage:
        "Prioritization board cannot be saved because the database is unavailable.",
    });
  }
}
