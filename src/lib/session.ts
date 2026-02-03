import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { logger } from "@/lib/logger";

async function resolveServerSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? (error as { digest?: string }).digest
        : undefined;

    if (digest !== "DYNAMIC_SERVER_USAGE" && digest !== "NEXT_REDIRECT") {
      const context = {
        digest,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      };
      logger.error("Failed to resolve server session", context);
    }
    return null;
  }
}

export async function requireUserSession(): Promise<Session> {
  const session = await resolveServerSession();
  if (!session) {
    redirect("/signin");
  }
  return session;
}

export const getOptionalUserSession = resolveServerSession;
