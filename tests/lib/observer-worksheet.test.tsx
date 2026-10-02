import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ObserverWorksheet } from "@/app/(protected)/worksheets/_components/observer-worksheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ObserverWorksheet", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/worksheets/observer")) {
        if (init?.method === "PUT") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ ok: true, updatedAt: "2026-09-16T00:00:00Z" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, worksheet: null }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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
    vi.restoreAllMocks();
  });

  it("renders checkboxes with accessible names and saves toggled checklist state", async () => {
    await act(async () => {
      root.render(<ObserverWorksheet />);
    });
    await act(async () => {
      await flush();
    });

    const checkboxes = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    );
    expect(checkboxes.length).toBe(10);

    for (const checkbox of checkboxes) {
      const accessibleName =
        checkbox.labels?.[0]?.textContent?.trim() ?? checkbox.closest("label")?.textContent?.trim();
      expect(accessibleName).toBeDefined();
      expect(accessibleName?.length).toBeGreaterThan(0);
    }

    const targetCheckbox = checkboxes[0];
    const targetPromptText =
      targetCheckbox.labels?.[0]?.textContent?.trim() ??
      targetCheckbox.closest("label")?.textContent?.trim();
    expect(targetPromptText).toBeTruthy();

    await act(async () => {
      targetCheckbox.click();
    });

    expect(targetCheckbox.checked).toBe(true);

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Save"
    );
    expect(saveButton).toBeDefined();
    expect(saveButton?.hasAttribute("disabled")).toBe(false);

    await act(async () => {
      saveButton?.click();
      await flush();
    });

    const putCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCalls).toHaveLength(1);

    const body = JSON.parse(String(putCalls[0][1]?.body));
    expect(body.data.checklist?.[targetPromptText!]).toBe(true);
  });
});
