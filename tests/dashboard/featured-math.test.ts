import { describe, expect, it } from "vitest";

import { featuredProgress } from "@/components/dashboard/featured-card";

/** M5 WP5 — progress math for the featured card + gauge (pure). */
describe("featuredProgress", () => {
  it("computes scored/planned as a rounded percentage", () => {
    expect(featuredProgress(23, 23)).toBe(100);
    expect(featuredProgress(2, 6)).toBe(33);
    expect(featuredProgress(0, 6)).toBe(0);
    expect(featuredProgress(1, 3)).toBe(33);
  });

  it("is honest about impossible inputs", () => {
    expect(featuredProgress(0, 0)).toBeNull();
  });
});
