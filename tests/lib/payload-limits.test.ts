import { describe, expect, it } from "vitest";

import { MAX_PRIORITIZATION_BOARD_BYTES, savePrioritizationBoard } from "@/lib/prioritization";
import { jsonByteLength, PayloadTooLargeError } from "@/lib/utils";
import { MAX_WORKSHEET_BYTES, upsertWorksheet } from "@/lib/worksheets";

describe("payload size limits", () => {
  it("measures JSON UTF-8 byte length", () => {
    expect(jsonByteLength(null)).toBe(4);
    expect(jsonByteLength({ a: "あ" })).toBeGreaterThan(7);
  });

  it("rejects an oversized prioritization board before touching storage", async () => {
    const big = "x".repeat(MAX_PRIORITIZATION_BOARD_BYTES + 1);
    await expect(savePrioritizationBoard({ big })).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it("rejects an oversized worksheet before touching storage", async () => {
    const big = "x".repeat(MAX_WORKSHEET_BYTES + 1);
    await expect(upsertWorksheet("user@example.com", "coach", { big })).rejects.toBeInstanceOf(
      PayloadTooLargeError
    );
  });
});
