import type { UpdateRecord } from "@/lib/updates";

type FetchUpdatesSuccess = {
  ok: true;
  updates: UpdateRecord[];
};

type FetchUpdatesFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type FetchUpdatesResponse = FetchUpdatesSuccess | FetchUpdatesFailure;

export async function fetchUpdatesClient(limit = 200): Promise<UpdateRecord[]> {
  const response = await fetch(`/api/updates?limit=${limit}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const body = (await response.json()) as FetchUpdatesResponse;

  if (!response.ok || !body.ok) {
    const message = body.ok ? "Unable to load updates right now." : body.error.message;
    throw new Error(message);
  }

  return body.updates;
}
