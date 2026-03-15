import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import { fetchUpdates } from "@/lib/updates";

export async function GET(request: NextRequest) {
  const session = await getOptionalUserSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 200), 1), 500);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const updates = await fetchUpdates(session.user.email, { limit, offset });
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
