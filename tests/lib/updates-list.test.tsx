import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const fetchUpdatesMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

  return {
    ...actual,
    useQuery: useQueryMock,
  };
});

vi.mock("@/lib/updates", () => ({
  fetchUpdates: fetchUpdatesMock,
}));

vi.mock("@/app/(protected)/updates/actions", () => ({
  deleteUpdateAction: vi.fn(),
}));

vi.mock("@/app/(protected)/updates/_components/delete-dialogs", () => ({
  DeleteAllUpdatesDialog: ({ children }: { children?: ReactNode }) => children ?? null,
  DeleteUpdateDialog: ({ children }: { children?: ReactNode }) => children ?? null,
}));

vi.mock("@/app/(protected)/updates/_components/update-card", () => ({
  UpdateCard: () => null,
}));

vi.mock("@/app/(protected)/updates/_components/update-details-dialog", () => ({
  UpdateDetailsDialog: () => null,
}));

vi.mock("@/app/(protected)/updates/_components/update-form-dialog", () => ({
  UpdateFormDialog: () => null,
}));

describe("UpdatesBoard query", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useQueryMock.mockReset();
    fetchUpdatesMock.mockReset();

    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    fetchUpdatesMock.mockRejectedValue(new Error("Turso client can only be used on the server."));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        ok: true,
        updates: [],
      }),
    }) as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("loads updates through the API instead of the server-only data module", async () => {
    const { UpdatesBoard } = await import("@/app/(protected)/updates/_components/updates-list");

    renderToString(<UpdatesBoard viewerEmail="member@example.com" />);

    const queryOptions = useQueryMock.mock.calls[0]?.[0];
    expect(queryOptions?.queryKey).toEqual(["updates", "member@example.com"]);

    const updates = await queryOptions.queryFn();

    expect(updates).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/updates?limit=200",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(fetchUpdatesMock).not.toHaveBeenCalled();
  });
});
