import { UpdatesBoard } from "@/app/(protected)/updates/_components";
import { requireUserSession } from "@/lib/session";
import { fetchUpdates } from "@/lib/updates";

export default async function UpdatesPage() {
  const session = await requireUserSession();
  const viewerEmail = session.user?.email ?? null;

  const updates = viewerEmail
    ? await fetchUpdates(viewerEmail, { limit: 200 })
    : [];

  return <UpdatesBoard initialUpdates={updates} viewerEmail={viewerEmail} />;
}
