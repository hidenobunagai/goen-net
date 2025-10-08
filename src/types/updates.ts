export interface Update {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  content: string;
  category: "highlight" | "challenge" | "question" | "decision" | "announcement";
  priority: "low" | "medium" | "high" | "urgent";
  timeframe: "immediate" | "this-week" | "this-month" | "next-month" | "long-term";
  tags: string[];
  comments: UpdateComment[];
  createdAt: string;
  updatedAt: string;
  discussionTime?: number; // estimated discussion time in minutes
}

export interface UpdateComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface UpdateSummary {
  totalUpdates: number;
  byCategory: Record<Update["category"], number>;
  byPriority: Record<Update["priority"], number>;
}
