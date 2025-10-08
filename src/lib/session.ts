import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

async function resolveServerSession(): Promise<Session | null> {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? (error as { digest?: string }).digest
        : undefined;

    if (digest !== "DYNAMIC_SERVER_USAGE" && digest !== "NEXT_REDIRECT") {
      console.error("Failed to resolve server session", error);
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
