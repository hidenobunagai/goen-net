import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, apiServiceError, resolveApiSession } from "@/lib/api";
import { getPrioritizationBoard, savePrioritizationBoard } from "@/lib/prioritization";
import { checkRateLimit } from "@/lib/rate-limit";
import { JsonBodyError, PayloadTooLargeError, requireJson } from "@/lib/utils";

export async function GET() {
  const auth = await resolveApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const board = await getPrioritizationBoard();
    return NextResponse.json({ ok: true, board });
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

  let payload: { board?: unknown };
  try {
    payload = await requireJson<{ board?: unknown }>(request);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return apiError("INVALID_JSON", error.message, error.status);
    }
    throw error;
  }

  try {
    await savePrioritizationBoard(payload.board ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
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
