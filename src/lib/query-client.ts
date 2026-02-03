import { QueryClient } from "@tanstack/react-query";

import { logger } from "@/lib/logger";

let browserQueryClient: QueryClient | undefined = undefined;

export const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
        },
      },
    });
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
        },
      },
    });
  }
  return browserQueryClient;
};

// Server-side prefetch wrapper with error handling
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  queryFn: () => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
    });
    return { data: null, error: null };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Prefetch query failed", {
      queryKey,
      error: err.message,
    });
    return { data: null, error: err };
  }
}
