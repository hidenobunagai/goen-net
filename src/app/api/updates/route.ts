import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiServiceError, resolveApiUser } from "@/lib/api";
import { fetchUpdates } from "@/lib/updates";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed)) {
    return 200;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(request: NextRequest) {
  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));

  try {
    const updates = await fetchUpdates(auth.email, { limit });
    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    return apiServiceError(error, {
      logMessage: "Failed to load updates",
      context: { viewerId: auth.email, limit },
      code: "FETCH_FAILED",
      message: "Unable to load updates right now.",
      unavailableMessage:
        "The updates cannot be loaded because the database is unavailable right now.",
    });
  }
}
