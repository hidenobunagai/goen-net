export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  attendees: string[];
  description?: string;
  location?: string;
  agenda?: string[];
  notes?: string;
}

export interface MeetingStats {
  totalMeetings: number;
  upcomingMeetings: number;
  completedMeetings: number;
  averageDuration: number;
}
