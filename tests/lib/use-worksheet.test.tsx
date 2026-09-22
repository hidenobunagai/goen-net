import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorksheet } from "@/hooks/use-worksheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<T>(useHook: () => T): { result: { current: T }; unmount: () => void } {
  const resultRef = { current: undefined as unknown as T };

  function Probe() {
    const value = useHook();
    useEffect(() => {
      resultRef.current = value;
    });
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Probe />);
  });

  return {
    result: resultRef,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const putCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "PUT");

describe("useWorksheet save guard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let unmount: (() => void) | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    unmount?.();
    unmount = undefined;
    fetchMock.mockReset();
  });

  it("refuses to save while the initial GET is still pending, then saves once loaded", async () => {
    let resolveGet: (value: unknown) => void = () => {};
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      return new Promise((resolve) => {
        resolveGet = resolve;
      });
    });

    const hook = renderHook(() => useWorksheet<Record<string, unknown>>("coach"));
    unmount = hook.unmount;

    expect(hook.result.current.loading).toBe(true);
    expect(hook.result.current.canSave).toBe(false);

    await act(async () => {
      await hook.result.current.save();
    });
    expect(putCalls(fetchMock)).toHaveLength(0);

    await act(async () => {
      resolveGet({
        ok: true,
        json: async () => ({ ok: true, worksheet: { data: { note: "loaded" } } }),
      });
      await flush();
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.canSave).toBe(true);
    expect(hook.result.current.form).toEqual({ note: "loaded" });

    await act(async () => {
      await hook.result.current.save();
    });
    expect(putCalls(fetchMock)).toHaveLength(1);
    expect(JSON.parse(String(putCalls(fetchMock)[0][1]?.body))).toEqual({
      data: { note: "loaded" },
    });
  });

  it("refuses to save after a load failure, and recovers via reload()", async () => {
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: false, error: { message: "load failed" } }),
      });
    });

    const hook = renderHook(() => useWorksheet<Record<string, unknown>>("coach"));
    unmount = hook.unmount;

    await act(async () => {
      await flush();
    });

    expect(hook.result.current.loadError).toBe("load failed");
    expect(hook.result.current.canSave).toBe(false);

    await act(async () => {
      await hook.result.current.save();
    });
    expect(putCalls(fetchMock)).toHaveLength(0);

    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, worksheet: { data: { note: "recovered" } } }),
      });
    });

    await act(async () => {
      hook.result.current.reload();
      await flush();
    });

    expect(hook.result.current.loadError).toBeNull();
    expect(hook.result.current.canSave).toBe(true);
    expect(hook.result.current.form).toEqual({ note: "recovered" });
  });
});
