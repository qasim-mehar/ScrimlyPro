import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("joins classes and drops falsy values", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
