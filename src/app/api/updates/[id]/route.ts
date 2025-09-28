import { authOptions } from "@/lib/auth";
import { deleteUpdate, getUpdateById } from "@/lib/updates";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
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

  try {
    const update = await getUpdateById(id, viewerId);
    if (!update) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "The requested update could not be found.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, update });
  } catch (error) {
    console.error("Failed to load update", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "FETCH_FAILED",
          message: "Unable to load this update right now.",
        },
      },
      { status: 503 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required." },
      },
      { status: 401 }
    );
  }

  const uid = session.user?.email;
  if (!uid) {
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

  try {
    const deleted = await deleteUpdate(id, uid);
    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete this update.",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete update", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DELETE_FAILED",
          message: "Unable to delete this update right now.",
        },
      },
      { status: 503 }
    );
  }
}
