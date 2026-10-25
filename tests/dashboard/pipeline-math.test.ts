import { describe, expect, it } from "vitest";

import {
  segmentWidths,
  formatProcessing,
} from "@/components/dashboard/pipeline";

/** M5 WP8 — segment-width math + processing-time formatting (pure). */
describe("segmentWidths", () => {
  it("splits 100% by counts", () => {
    expect(segmentWidths({ upcoming: 2, drafts: 2, scored: 6 })).toEqual([
      20, 20, 60,
    ]);
  });

  it("keeps nonzero segments visible at a 4% minimum", () => {
    expect(segmentWidths({ upcoming: 99, drafts: 1, scored: 0 })).toEqual([
      96, 4, 0,
    ]);
  });

  it("returns zeros for an empty pipeline (honest empty state)", () => {
    expect(segmentWidths({ upcoming: 0, drafts: 0, scored: 0 })).toEqual([
      0, 0, 0,
    ]);
  });
});

describe("formatProcessing", () => {
  it("renders minutes, hours, and the honest dash for none", () => {
    expect(formatProcessing(null)).toBe("—");
    expect(formatProcessing(20)).toBe("<1m");
    expect(formatProcessing(20 * 60)).toBe("20m");
    expect(formatProcessing(135 * 60)).toBe("2h 15m");
  });
});
