import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";

type ApiSession = { ok: true; session: Session } | { ok: false; response: NextResponse };
type ApiUser = { ok: true; email: string } | { ok: false; response: NextResponse };

/** Builds the shared `{ ok: false, error: { code, message } }` JSON response. */
export function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/** Resolves the session for an API route, or a 401 response when there is none. */
export async function resolveApiSession(): Promise<ApiSession> {
  const session = await getOptionalUserSession();
  if (!session) {
    return { ok: false, response: apiError("UNAUTHENTICATED", "Authentication required.", 401) };
  }
  return { ok: true, session };
}

/**
 * Resolves the signed-in user's email for an API route.
 * Returns a 401 response when there is no session, or a 400 response when the
 * session has no email.
 */
export async function resolveApiUser(): Promise<ApiUser> {
  const auth = await resolveApiSession();
  if (!auth.ok) {
    return auth;
  }

  const email = auth.session.user?.email?.trim();
  if (!email) {
    return {
      ok: false,
      response: apiError("NO_EMAIL", "Unable to determine user email for this session.", 400),
    };
  }

  return { ok: true, email };
}

type ApiServiceErrorOptions = {
  /** Message for the `logger.error` entry. */
  logMessage: string;
  /** Extra fields merged into the log context. */
  context?: Record<string, unknown>;
  /** Error code used when the failure is not a `TursoUnavailableError`. */
  code: string;
  /** Message used when the failure is not a `TursoUnavailableError`. */
  message: string;
  /** Message used when the database is unavailable. */
  unavailableMessage: string;
};

/**
 * Logs a caught service failure and turns it into the shared 503 response:
 * `TursoUnavailableError` becomes DATABASE_UNAVAILABLE, anything else uses the
 * supplied code/message.
 */
export function apiServiceError(error: unknown, options: ApiServiceErrorOptions): NextResponse {
  logger.error(options.logMessage, { error, ...options.context });
  const unavailable = error instanceof TursoUnavailableError;
  return apiError(
    unavailable ? "DATABASE_UNAVAILABLE" : options.code,
    unavailable ? options.unavailableMessage : options.message,
    503
  );
}
