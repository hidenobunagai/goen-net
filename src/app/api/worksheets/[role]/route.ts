import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import { JsonBodyError, requireJson } from "@/lib/utils";
import {
    deleteWorksheet,
    getWorksheet,
    isValidWorksheetRole,
    upsertWorksheet,
    type WorksheetRole,
} from "@/lib/worksheets";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
    console.error("Failed to resolve worksheet role", error);
    return null;
  }
}

type AuthResolution =
  | {
      status: "authenticated";
      email: string;
    }
  | {
      status: "unauthenticated";
      response: NextResponse;
    };

async function resolveAuthenticatedEmail(): Promise<AuthResolution> {
  const session = await getOptionalUserSession();
  if (!session) {
    return {
      status: "unauthenticated",
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required." },
        },
        { status: 401 }
      ),
    };
  }

  const email = session.user?.email?.trim();
  if (!email) {
    return {
      status: "unauthenticated",
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "NO_EMAIL",
            message: "Unable to determine user email for this session.",
          },
        },
        { status: 400 }
      ),
    };
  }

  return { status: "authenticated", email };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const auth = await resolveAuthenticatedEmail();
  if (auth.status === "unauthenticated") {
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
    console.error("Failed to load worksheet", error);
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "FETCH_FAILED",
          message: unavailable
            ? "Worksheets cannot be loaded because the database is currently unavailable."
            : "Unable to load worksheet data right now. Please try again soon.",
        },
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const auth = await resolveAuthenticatedEmail();
  if (auth.status === "unauthenticated") {
    return auth.response;
  }

  let payload: SaveWorksheetPayload;
  try {
    payload = await requireJson<SaveWorksheetPayload>(request);
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
    await upsertWorksheet(auth.email, role, payload.data ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save worksheet", error);
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "SAVE_FAILED",
          message: unavailable
            ? "Worksheets cannot be saved because the database is currently unavailable."
            : "Unable to save worksheet right now. Please try again later.",
        },
      },
      { status: 503 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const role = await resolveRole(context);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const auth = await resolveAuthenticatedEmail();
  if (auth.status === "unauthenticated") {
    return auth.response;
  }

  try {
    await deleteWorksheet(auth.email, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to clear worksheet", error);
    const unavailable = error instanceof TursoUnavailableError;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "DELETE_FAILED",
          message: unavailable
            ? "Worksheets cannot be cleared because the database is currently unavailable."
            : "Unable to clear worksheet right now. Please try again later.",
        },
      },
      { status: 503 }
    );
  }
}

