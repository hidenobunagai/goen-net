import { getOptionalUserSession } from "@/lib/session";
import { TursoUnavailableError } from "@/lib/turso";
import {
  deleteWorksheet,
  getWorksheet,
  isValidWorksheetRole,
  upsertWorksheet,
  type WorksheetRole,
} from "@/lib/worksheets";
import { JsonBodyError, requireJson } from "@/lib/utils";
import { NextResponse } from "next/server";

type RouteContext = {
  params: {
    role?: string;
  };
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

async function resolveAuthenticatedEmail() {
  const session = await getOptionalUserSession();
  if (!session) {
    return {
      email: null as const,
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required." },
        },
        { status: 401 }
      ),
    } as const;
  }

  const email = session.user?.email?.trim();
  if (!email) {
    return {
      email: null as const,
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
    } as const;
  }

  return { email, response: null as const };
}

export async function GET(_request: Request, context: RouteContext) {
  const role = normalizeRole(context.params?.role);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const { email, response } = await resolveAuthenticatedEmail();
  if (!email) {
    return response;
  }

  try {
    const record = await getWorksheet(email, role);
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

export async function PUT(request: Request, context: RouteContext) {
  const role = normalizeRole(context.params?.role);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const { email, response } = await resolveAuthenticatedEmail();
  if (!email) {
    return response;
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
    await upsertWorksheet(email, role, payload.data ?? null);
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

export async function DELETE(_request: Request, context: RouteContext) {
  const role = normalizeRole(context.params?.role);
  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_ROLE", message: "Unknown worksheet role." },
      },
      { status: 400 }
    );
  }

  const { email, response } = await resolveAuthenticatedEmail();
  if (!email) {
    return response;
  }

  try {
    await deleteWorksheet(email, role);
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

