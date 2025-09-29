import { getOptionalUserSession } from "@/lib/session";
import { fetchUpdates } from "@/lib/updates";
import { NextResponse } from "next/server";

export interface StatsData {
  totalUpdates: number;
  urgentItems: number;
  activeMembers: number;
  daysToMeeting: number;
}

export async function GET() {
  try {
    console.log("[API] Stats endpoint called");
    const session = await getOptionalUserSession();

    if (!session?.user?.email) {
      console.log("[API] No session found, returning mock data");
      // Return mock data for unauthenticated users (shouldn't happen in protected routes)
      const stats: StatsData = {
        totalUpdates: 12,
        urgentItems: 3,
        activeMembers: 8,
        daysToMeeting: 5,
      };

      const response = NextResponse.json(stats);
      response.headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }

    console.log(
      "[API] Session found, fetching real data for:",
      session.user.email
    );
    // Fetch real data from database
    const updates = await fetchUpdates(session.user.email, {
      limit: 100,
      offset: 0,
    });
    const urgentUpdates = updates.filter((update) => update.urgent);

    // Calculate days to next meeting (mock for now - should integrate with meeting system)
    const nextMeetingDate = new Date("2025-10-05T10:00:00"); // Should be dynamic
    const today = new Date();
    const daysToMeeting = Math.ceil(
      (nextMeetingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const stats: StatsData = {
      totalUpdates: updates.length,
      urgentItems: urgentUpdates.length,
      activeMembers: 8, // Fixed for the 8-person circle
      daysToMeeting: Math.max(0, daysToMeeting),
    };

    console.log("[API] Returning stats:", stats);
    const response = NextResponse.json(stats);
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("[API] Error fetching stats:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    return response;
  }
}
