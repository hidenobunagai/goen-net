import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOptionalUserSession } from "@/lib/session";
import { fetchUpdates } from "@/lib/updates";

export async function GET() {
  const session = await getOptionalUserSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    // Fetch recent updates for summary
    const updates = await fetchUpdates(session.user.email, {
      limit: 100,
      offset: 0,
    });

    // Calculate enhanced statistics
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentUpdates = updates.filter((update) => new Date(update.createdAt) > oneWeekAgo);

    const urgentUpdates = updates.filter((update) => update.urgent);

    // Mock additional data for enhanced statistics
    const stats = {
      totalUpdates: updates.length,
      recentUpdates: recentUpdates.length,
      urgentItems: urgentUpdates.length,
      activeMembers: 8, // Based on the fixed 8-person circle
      daysToMeeting: 5, // This should be calculated based on next meeting
      byCategory: {
        general: updates.filter((u) => u.category === 0).length,
        highlight: updates.filter((u) => u.category === 1).length,
        question: updates.filter((u) => u.category === 2).length,
      },
      estimatedDiscussionTime: urgentUpdates.length * 15 + updates.length * 5, // rough estimate
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching update statistics", { error });
    return NextResponse.json({ error: "Failed to fetch update statistics" }, { status: 500 });
  }
}
