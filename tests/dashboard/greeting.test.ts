import { describe, expect, it } from "vitest";

import { displayName, greetingFor } from "@/components/dashboard/greeting-row";

/** M5 WP4 — pure pieces of the greeting row (time-aware copy + name). */
describe("greeting helpers", () => {
  it("is time-of-day aware on the server-local hour", () => {
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(23)).toBe("Good evening");
  });

  it("derives the display name from the account email local part", () => {
    expect(displayName("nizam@team.dev")).toBe("Nizam");
    expect(displayName("m5dash-dev@gmail.com")).toBe("M5dash");
    expect(displayName(null)).toBe("there");
    expect(displayName("x@y.dev")).toBe("X");
  });
});
