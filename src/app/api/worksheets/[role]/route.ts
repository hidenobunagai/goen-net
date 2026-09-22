import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, apiServiceError, resolveApiUser } from "@/lib/api";
import { logger } from "@/lib/logger";
import { JsonBodyError, PayloadTooLargeError, requireJson } from "@/lib/utils";
import {
  deleteWorksheet,
  getWorksheet,
  isValidWorksheetRole,
  upsertWorksheet,
  type WorksheetRole,
} from "@/lib/worksheets";

type RouteContext = {
  params: Promise<{
    role: string;
  }>;
};

type SaveWorksheetPayload = {
  data?: unknown;
};

function normalizeRole(value: string | undefined): WorksheetRole | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  return isValidWorksheetRole(normalized) ? normalized : null;
}

async function resolveRole(context: RouteContext): Promise<WorksheetRole | null> {
  try {
    const params = await context.params;
    return normalizeRole(params?.role);
  } catch (error) {
    logger.error("Failed to resolve worksheet role", { error });
    return null;
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return apiError("INVALID_ROLE", "Unknown worksheet role.", 400);
  }

  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const record = await getWorksheet(auth.email, role);
    return NextResponse.json({
      ok: true,
      worksheet: record
        ? { data: record.data, updatedAt: record.updatedAt, role: record.role }
        : null,
    });
  } catch (error) {
    return apiServiceError(error, {
      logMessage: "Failed to load worksheet",
      code: "FETCH_FAILED",
      message: "Unable to load worksheet data right now. Please try again soon.",
      unavailableMessage:
        "Worksheets cannot be loaded because the database is currently unavailable.",
    });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return apiError("INVALID_ROLE", "Unknown worksheet role.", 400);
  }

  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  let payload: SaveWorksheetPayload;
  try {
    payload = await requireJson<SaveWorksheetPayload>(request);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return apiError("INVALID_JSON", error.message, error.status);
    }
    throw error;
  }

  try {
    await upsertWorksheet(auth.email, role, payload.data ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return apiError("PAYLOAD_TOO_LARGE", error.message, error.status);
    }
    return apiServiceError(error, {
      logMessage: "Failed to save worksheet",
      code: "SAVE_FAILED",
      message: "Unable to save worksheet right now. Please try again later.",
      unavailableMessage:
        "Worksheets cannot be saved because the database is currently unavailable.",
    });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return apiError("INVALID_ROLE", "Unknown worksheet role.", 400);
  }

  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    await deleteWorksheet(auth.email, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServiceError(error, {
      logMessage: "Failed to clear worksheet",
      code: "DELETE_FAILED",
      message: "Unable to clear worksheet right now. Please try again later.",
      unavailableMessage:
        "Worksheets cannot be cleared because the database is currently unavailable.",
    });
  }
}
