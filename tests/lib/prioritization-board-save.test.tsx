import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PrioritizationBoard } from "@/app/(protected)/prioritization/_components/prioritization-board";
import type { UpdateRecord } from "@/lib/updates";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const INITIAL_UPDATED_AT = "2026-10-07T00:00:00.000Z";
const NEW_UPDATED_AT = "2026-10-07T00:00:05.000Z";

function makeUpdate(id: string, title: string): UpdateRecord {
  return {
    id,
    by: "Alice",
    category: 0,
    urgent: false,
    uid: "alice@example.com",
    title,
    body: "",
    when: 1,
    createdAt: "2026-10-01T00:00:00.000Z",
    viewerIsOwner: true,
  };
}

const INITIAL_BOARD = {
  columns: {
    backlog: { id: "backlog", title: "Unassigned", removable: false, itemIds: [] },
  },
  columnOrder: ["backlog"],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("PrioritizationBoard autosave", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  const putCalls = () =>
    fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "PUT");

  const renderBoard = async (updates: UpdateRecord[] = [makeUpdate("u1", "Ship the report")]) => {
    await act(async () => {
      root.render(
        <PrioritizationBoard
          initialUpdates={updates}
          initialBoard={INITIAL_BOARD}
          initialUpdatedAt={INITIAL_UPDATED_AT}
        />
      );
    });
  };

  beforeEach(() => {
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, updatedAt: NEW_UPDATED_AT }),
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    window.localStorage.clear();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    fetchMock.mockReset();
    refreshMock.mockReset();
  });

  it("sends no PUT while the board is left untouched", async () => {
    await renderBoard();

    // Long enough for the old bug (a save roughly every second) to show up.
    await act(async () => {
      await wait(3000);
    });

    expect(putCalls()).toHaveLength(0);
  });

  it("saves a real board change exactly once and does not loop afterwards", async () => {
    await renderBoard();

    const label = Array.from(container.querySelectorAll("label")).find(
      (el) => el.textContent === "New category"
    );
    expect(label?.htmlFor).toBeTruthy();

    const input = Array.from(container.querySelectorAll("input")).find(
      (el) => el.id === label?.htmlFor
    );
    expect(input).toBeTruthy();

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(input, "Retrospective");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const addButton = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Add Category")
    );
    expect(addButton).toBeTruthy();
    await act(async () => {
      addButton?.click();
    });

    await act(async () => {
      await wait(1200);
    });

    const puts = putCalls();
    expect(puts).toHaveLength(1);
    expect(String(puts[0]?.[0])).toBe("/api/prioritization");

    const body = JSON.parse(String((puts[0]?.[1] as RequestInit).body)) as {
      baseUpdatedAt: string | null;
      board: { columnOrder: string[] };
    };
    expect(body.baseUpdatedAt).toBe(INITIAL_UPDATED_AT);
    expect(body.board.columnOrder.some((id) => id.startsWith("retrospective-"))).toBe(true);

    // Status transitions (saving -> saved -> idle) must not schedule more saves.
    await act(async () => {
      await wait(3000);
    });
    expect(putCalls()).toHaveLength(1);
  });
});
