import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError, getNextSession, upsertNextSession } from "@/lib/turso";
import { NextResponse } from "next/server";

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
    const record = await getNextSession();
    return NextResponse.json({
      ok: true,
      session: record,
    });
  } catch (error) {
    console.error("Failed to load next session", error);
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "FETCH_FAILED",
          message: unavailable
            ? "The next session cannot be loaded because the database is unavailable right now."
            : "Unable to load the next session. Please try again later.",
        },
      },
      { status: 503 }
    );
  }
}

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

  if (session.user?.email == null) {
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

  const payload = await request.json();
  const startAt =
    typeof payload?.startAt === "string"
      ? payload.startAt.trim() || null
      : null;
  const endAt =
    typeof payload?.endAt === "string" ? payload.endAt.trim() || null : null;
  const location =
    typeof payload?.location === "string"
      ? payload.location.trim() || null
      : null;

  if (!startAt) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_START", message: "Start time is required." },
      },
      { status: 422 }
    );
  }

  try {
    await upsertNextSession({ startAt, endAt, location });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update next session", error);
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "UPDATE_FAILED",
          message: unavailable
            ? "The next session cannot be updated because the database is unavailable. Please try again once connectivity is restored."
            : "Unable to update the next session right now.",
        },
      },
      { status: 503 }
    );
  }
}
