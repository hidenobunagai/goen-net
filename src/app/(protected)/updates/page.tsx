import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { UpdatesBoard } from "@/app/(protected)/updates/_components";
import { getQueryClient } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { requireUserSession } from "@/lib/session";
import { fetchUpdates } from "@/lib/updates";

export default async function UpdatesPage() {
  const queryClient = getQueryClient();
  const session = await requireUserSession();
  const viewerEmail = session.user?.email ?? null;

  // Prefetch updates data
  if (viewerEmail) {
    await queryClient.prefetchQuery({
      queryKey: ["updates", viewerEmail],
      queryFn: () => fetchUpdates(viewerEmail, { limit: 200 }),
    });
  }

  const initialError = queryClient.getQueryState(["updates", viewerEmail])?.error;
  if (initialError) {
    logger.error("Failed to prefetch updates", {
      viewerEmail,
      error: initialError instanceof Error ? initialError.message : String(initialError),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UpdatesBoard viewerEmail={viewerEmail} />
    </HydrationBoundary>
  );
}
