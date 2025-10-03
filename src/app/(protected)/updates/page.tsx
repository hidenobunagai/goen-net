import { UpdatesBoard } from "@/app/(protected)/updates/_components";
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
      console.error("Failed to load updates during initial render", error);
      updates = [];
    }
  }

  return <UpdatesBoard initialUpdates={updates} viewerEmail={viewerEmail} />;
}
