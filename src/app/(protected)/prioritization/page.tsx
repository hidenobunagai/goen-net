import { logger } from "@/lib/logger";
import { requireUserSession } from "@/lib/session";
import type { UpdateRecord } from "@/lib/updates";
import { fetchUpdates } from "@/lib/updates";

import { PrioritizationBoard } from "./_components/prioritization-board";

export default async function PrioritizationPage() {
  const session = await requireUserSession();
  const viewerEmail = session.user?.email ?? "";

  let updates: UpdateRecord[] = [];
  try {
    if (viewerEmail) {
      updates = await fetchUpdates(viewerEmail, { limit: 200 });
    }
  } catch (error) {
    logger.error("Failed to load updates for prioritization", { error });
  }

  return <PrioritizationBoard initialUpdates={updates} />;
}
