import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import { fetchUpdates } from "@/lib/updates";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed)) {
    return 200;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(request: NextRequest) {
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

  const viewerId = session.user?.email;
  if (!viewerId) {
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

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));

  try {
    const updates = await fetchUpdates(viewerId, { limit });
    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    logger.error("Failed to load updates", { error, viewerId, limit });
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "FETCH_FAILED",
          message: unavailable
            ? "The updates cannot be loaded because the database is unavailable right now."
            : "Unable to load updates right now.",
        },
      },
      { status: 503 }
    );
  }
}
