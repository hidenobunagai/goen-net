import { getConfig } from "./config";

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

export interface SendEmailResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResponse> {
  const config = getConfig();
  const apiKey = config.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Failed to send email: ${response.statusText}`
    );
  }

  return data;
}

export function getAllowedEmails(): string[] {
  const config = getConfig();
  const emails = config.ALLOWED_EMAILS ?? "";
  return emails
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
