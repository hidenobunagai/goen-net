import { Meeting } from "@/types/meetings";
import { NextResponse } from "next/server";

// Mock data for demonstration
const mockMeetings: Meeting[] = [
  {
    id: "1",
    title: "October Goen Net Forum",
    date: new Date("2025-10-05T10:00:00").toISOString(),
    duration: 180, // 3 hours in minutes
    status: "scheduled",
    attendees: [
      "alice@example.com",
      "bob@example.com",
      "charlie@example.com",
      "diana@example.com",
    ],
    description:
      "Monthly alumni forum discussing recent updates and strategic initiatives",
    location: "Conference Room A",
    agenda: [
      "Welcome & Check-ins (15min)",
      "Updates Review & Prioritization (60min)",
      "Strategic Discussion (75min)",
      "Action Items & Next Steps (30min)",
    ],
  },
  {
    id: "2",
    title: "Q4 Planning Session",
    date: new Date("2025-11-15T14:00:00").toISOString(),
    duration: 120,
    status: "scheduled",
    attendees: ["alice@example.com", "bob@example.com", "eve@example.com"],
    description: "Quarterly planning and goal setting",
    location: "Online",
  },
];

export async function GET() {
  try {
    // Return upcoming meeting (next chronologically)
    const upcomingMeetings = mockMeetings
      .filter((meeting) => new Date(meeting.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextMeeting = upcomingMeetings[0] || null;

    return NextResponse.json(nextMeeting);
  } catch (error) {
    console.error("Error fetching upcoming meeting:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming meeting" },
      { status: 500 }
    );
  }
}
