import { addDays } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/resend", () => ({
  getAllowedEmails: vi.fn(() => ["user1@example.com", "user2@example.com"]),
  sendEmail: vi.fn().mockResolvedValue({ id: "email-123" }),
}));

vi.mock("@/lib/turso", () => ({
  getNextSession: vi.fn(),
  isTursoConfigured: vi.fn(() => true),
}));

import { GET } from "@/app/api/cron/session-reminder/route";
import { sendEmail } from "@/lib/resend";
import { getNextSession } from "@/lib/turso";

describe("GET /api/cron/session-reminder", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "secret-key" };
  });

  it("returns 401 when authorization token does not match CRON_SECRET", async () => {
    const request = new Request("https://example.com/api/cron/session-reminder", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });

  it("sends reminder when session is exactly 3 days away", async () => {
    const threeDaysLater = addDays(new Date(), 3).toISOString();
    vi.mocked(getNextSession).mockResolvedValue({
      startAt: threeDaysLater,
      endAt: null,
      location: "Office",
      updatedAt: null,
    });

    const request = new Request("https://example.com/api/cron/session-reminder", {
      headers: { authorization: "Bearer secret-key" },
    });

    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toContain("Reminder sent to 2/2 recipients");
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("skips sending when session is not 3 days away", async () => {
    const oneDayLater = addDays(new Date(), 1).toISOString();
    vi.mocked(getNextSession).mockResolvedValue({
      startAt: oneDayLater,
      endAt: null,
      location: "Office",
      updatedAt: null,
    });

    const request = new Request("https://example.com/api/cron/session-reminder", {
      headers: { authorization: "Bearer secret-key" },
    });

    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; message: string };
    expect(body.success).toBe(false);
    expect(body.message).toContain("Not the right time");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
