import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession, isTursoConfigured } from "@/lib/turso";
import type { Meeting } from "@/types/meetings";

export async function GET() {
  try {
    const session = await getOptionalUserSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      );
    }

    if (!isTursoConfigured()) {
      return NextResponse.json(null);
    }

    const nextSession = await getNextSession();

    if (!nextSession?.startAt) {
      return NextResponse.json(null);
    }

    const sessionDate = new Date(nextSession.startAt);
    if (Number.isNaN(sessionDate.getTime()) || sessionDate <= new Date()) {
      return NextResponse.json(null);
    }

    const durationMs =
      nextSession.endAt && !Number.isNaN(new Date(nextSession.endAt).getTime())
        ? new Date(nextSession.endAt).getTime() - sessionDate.getTime()
        : 3 * 60 * 60 * 1000;
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    const meeting: Meeting = {
      id: "next-session",
      title: "Goen Net Session",
      date: sessionDate.toISOString(),
      duration: durationMinutes,
      status: "scheduled",
      attendees: [],
      location: nextSession.location ?? undefined,
    };

    return NextResponse.json(meeting);
  } catch (error) {
    logger.error("Error fetching upcoming meeting", { error });
    return NextResponse.json({ error: "Failed to fetch upcoming meeting" }, { status: 500 });
  }
}
