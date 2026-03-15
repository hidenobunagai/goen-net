import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession, isTursoConfigured } from "@/lib/turso";
import { fetchUpdates } from "@/lib/updates";

export interface StatsData {
  totalUpdates: number;
  urgentItems: number;
  activeMembers: number;
  daysToMeeting: number;
}

export async function GET() {
  try {
    const session = await getOptionalUserSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      );
    }

    const [updates, nextSession] = await Promise.all([
      fetchUpdates(session.user.email, { limit: 100, offset: 0 }),
      isTursoConfigured() ? getNextSession().catch(() => null) : Promise.resolve(null),
    ]);

    const urgentUpdates = updates.filter((update) => update.urgent);

    let daysToMeeting = 0;
    if (nextSession?.startAt) {
      const nextMeetingDate = new Date(nextSession.startAt);
      if (!Number.isNaN(nextMeetingDate.getTime())) {
        daysToMeeting = Math.max(
          0,
          Math.ceil((nextMeetingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );
      }
    }

    const stats: StatsData = {
      totalUpdates: updates.length,
      urgentItems: urgentUpdates.length,
      activeMembers: 8,
      daysToMeeting,
    };

    logger.debug("Returning stats", { stats });
    const response = NextResponse.json(stats);
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    logger.error("Error fetching stats", { error });
    const response = NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
