import { getOptionalUserSession } from "@/lib/session";
import { UpdateNotFoundError, upsertVote } from "@/lib/updates";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } = await context.params;
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
    const result = await upsertVote(id, uid, true);
    return NextResponse.json({
      ok: true,
      votes: result.votes,
      viewerHasVoted: result.viewerHasVoted,
    });
  } catch (error) {
    if (error instanceof UpdateNotFoundError) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "Update not found." },
        },
        { status: 404 }
      );
    }
    console.error("Failed to register vote", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VOTE_FAILED",
          message: "Unable to register vote right now.",
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
    const result = await upsertVote(id, uid, false);
    return NextResponse.json({
      ok: true,
      votes: result.votes,
      viewerHasVoted: result.viewerHasVoted,
    });
  } catch (error) {
    if (error instanceof UpdateNotFoundError) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "Update not found." },
        },
        { status: 404 }
      );
    }
    console.error("Failed to remove vote", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VOTE_FAILED",
          message: "Unable to remove vote right now.",
        },
      },
      { status: 503 }
    );
  }
}
