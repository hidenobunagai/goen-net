import { logger } from "@/lib/logger";
import { getPrioritizationBoard } from "@/lib/prioritization";
import { requireUserSession } from "@/lib/session";
import type { UpdateRecord } from "@/lib/updates";
import { fetchUpdates } from "@/lib/updates";

import { PrioritizationBoard } from "./_components/prioritization-board";

export default async function PrioritizationPage() {
  const session = await requireUserSession();
  const viewerEmail = session.user?.email ?? "";

  let updates: UpdateRecord[] = [];
  let initialBoard: unknown = null;
  try {
    if (viewerEmail) {
      const [fetchedUpdates, fetchedBoard] = await Promise.all([
        fetchUpdates(viewerEmail, { limit: 200 }),
        getPrioritizationBoard(),
      ]);
      updates = fetchedUpdates;
      initialBoard = fetchedBoard;
    }
  } catch (error) {
    logger.error("Failed to load updates for prioritization", { error });
  }

  return <PrioritizationBoard initialUpdates={updates} initialBoard={initialBoard} />;
}
