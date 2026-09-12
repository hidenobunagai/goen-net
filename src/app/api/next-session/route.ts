import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession, TursoUnavailableError, upsertNextSession } from "@/lib/turso";
import { JsonBodyError, requireJson } from "@/lib/utils";

export const MAX_NEXT_SESSION_LOCATION_LENGTH = 500;

/** Accepts ISO 8601 ("2026-09-01T10:00:00Z") and datetime-local ("2026-09-01T10:00"). */
const dateTimeString = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      const parsed = new Date(value.length === 16 ? `${value}:00` : value);
      return !Number.isNaN(parsed.getTime());
    },
    { message: "Must be a valid date-time string." }
  );

export const NextSessionSchema = z.object({
  startAt: dateTimeString,
  endAt: dateTimeString.nullish(),
  location: z
    .string()
    .trim()
    .max(MAX_NEXT_SESSION_LOCATION_LENGTH, "Location must be 500 characters or fewer.")
    .nullish(),
});

export type NextSessionInput = z.infer<typeof NextSessionSchema>;

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
    logger.error("Failed to load next session", { error });
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

  let payload: NextSessionInput;
  try {
    payload = await requireJson<NextSessionInput>(request);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_JSON", message: error.message },
        },
        { status: error.status }
      );
    }
    throw error;
  }

  const parsed = NextSessionSchema.safeParse({
    startAt: typeof payload?.startAt === "string" ? payload.startAt : payload?.startAt,
    endAt: typeof payload?.endAt === "string" ? payload.endAt || null : (payload?.endAt ?? null),
    location:
      typeof payload?.location === "string"
        ? payload.location || null
        : (payload?.location ?? null),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request payload.";
    const code = parsed.error.issues.some((issue) => issue.path.includes("startAt"))
      ? "INVALID_START"
      : "INVALID_INPUT";
    return NextResponse.json(
      {
        ok: false,
        error: { code, message },
      },
      { status: 422 }
    );
  }

  const { startAt, endAt, location } = parsed.data;

  try {
    await upsertNextSession({ startAt, endAt: endAt ?? null, location: location || null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to update next session", { error });
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
