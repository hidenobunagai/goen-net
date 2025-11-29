import { UpdatesBoard } from "@/app/(protected)/updates/_components";
import { logger } from "@/lib/logger";
import { requireUserSession } from "@/lib/session";
import type { UpdateRecord } from "@/lib/updates";
import { fetchUpdates } from "@/lib/updates";

export default async function UpdatesPage() {
  const session = await requireUserSession();
  const viewerEmail = session.user?.email ?? null;
  let updates: UpdateRecord[] = [];

  if (viewerEmail) {
    try {
      updates = await fetchUpdates(viewerEmail, { limit: 200 });
    } catch (error) {
      const context = {
        viewerEmail,
        limit: 200,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      };
      logger.error("Failed to load updates during initial render", context);
      updates = [];
    }
  }

  return <UpdatesBoard initialUpdates={updates} />;
}
