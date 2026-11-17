import { describe, expect, it } from "vitest";

import {
  announcementSlotLabels,
  assignDefaultTeamSlots,
  DEFAULT_STARTING_SLOT,
  defaultSlotForIndex,
  findDuplicateSlots,
  orderTeamsBySlot,
  parseSlotInput,
} from "@/lib/sessions/slots";

describe("default slot math", () => {
  it("starts team slots at 5", () => {
    expect(DEFAULT_STARTING_SLOT).toBe(5);
  });

  it("numbers teams 5, 6, 7 … up to the 25-team maximum (index 24 → 29)", () => {
    expect(defaultSlotForIndex(0)).toBe(5);
    expect(defaultSlotForIndex(1)).toBe(6);
    expect(defaultSlotForIndex(2)).toBe(7);
    const all = Array.from({ length: 25 }, (_, index) =>
      defaultSlotForIndex(index),
    );
    expect(all).toEqual(Array.from({ length: 25 }, (_, i) => 5 + i));
    expect(all[24]).toBe(29);
  });

  it("honours a custom start slot", () => {
    expect(defaultSlotForIndex(0, 1)).toBe(1);
    expect(defaultSlotForIndex(3, 10)).toBe(13);
  });

  it("clamps out-of-domain results to the DB's 1..99 integer range", () => {
    expect(defaultSlotForIndex(0, 0)).toBe(1);
    expect(defaultSlotForIndex(0, -5)).toBe(1);
    expect(defaultSlotForIndex(10, 95)).toBe(99);
    expect(defaultSlotForIndex(0, Number.NaN)).toBe(1);
  });
});

describe("parseSlotInput", () => {
  it("maps empty/blank/0 to unassigned (null)", () => {
    expect(parseSlotInput("")).toBeNull();
    expect(parseSlotInput("   ")).toBeNull();
    expect(parseSlotInput("0")).toBeNull();
    expect(parseSlotInput(" 00 ")).toBeNull();
  });

  it("parses 1..99 straight through, including padded input", () => {
    expect(parseSlotInput("5")).toBe(5);
    expect(parseSlotInput(" 7 ")).toBe(7);
    expect(parseSlotInput("99")).toBe(99);
  });

  it("keeps invalid numbers for the validator to flag, never NaN or silent rounding", () => {
    expect(parseSlotInput("100")).toBe(100);
    expect(parseSlotInput("-5")).toBe(-5);
    expect(parseSlotInput("1e2")).toBe(100);
    expect(parseSlotInput("2.5")).toBe(2.5);
    expect(parseSlotInput("abc")).toBeNull();
  });
});

describe("assignDefaultTeamSlots", () => {
  it("assigns 5, 6, 7, 8 … to an initial bulk paste of 4–25 teams", () => {
    for (const count of [4, 16, 25]) {
      const names = Array.from({ length: count }, (_, i) => `Team ${i + 1}`);
      const rows = assignDefaultTeamSlots(names);
      expect(rows.map((row) => row.slotNumber)).toEqual(
        Array.from({ length: count }, (_, i) => 5 + i),
      );
      expect(rows.every((row) => row.manual === false)).toBe(true);
    }
  });

  it("appends a new line with the next sequential slot without clobbering a manual override", () => {
    const names = ["Alpha", "Bravo", "Charlie"];
    const initial = assignDefaultTeamSlots(names);
    expect(initial.map((r) => r.slotNumber)).toEqual([5, 6, 7]);

    // The organizer deliberately moves Team 1 to slot 10.
    const overrides: Record<number, number | null> = { 0: 10 };
    const withOverride = assignDefaultTeamSlots(names, overrides);
    expect(withOverride[0]).toEqual({
      name: "Alpha",
      slotNumber: 10,
      manual: true,
    });

    // Append Delta: untouched rows keep their slots, new row gets index+5.
    const appended = assignDefaultTeamSlots([...names, "Delta"], overrides);
    expect(appended.map((r) => r.slotNumber)).toEqual([10, 6, 7, 8]);
    expect(appended[0]?.slotNumber).toBe(10);
    expect(appended[3]?.manual).toBe(false);
  });

  it("preserves a manual override when a team name is corrected in place", () => {
    const overrides: Record<number, number | null> = { 0: 10 };
    const before = assignDefaultTeamSlots(["Wassup Esprots", "TF Squad"], overrides);
    const after = assignDefaultTeamSlots(["Wassup Esports", "TF Squad"], overrides);
    expect(before[0]?.slotNumber).toBe(10);
    expect(after[0]).toEqual({
      name: "Wassup Esports",
      slotNumber: 10,
      manual: true,
    });
    expect(after[1]?.slotNumber).toBe(6);
  });

  it("treats an explicit clear (including 0 → null) as a preserved manual override", () => {
    const names = ["Alpha", "Bravo", "Charlie"];
    const overrides: Record<number, number | null> = { 1: parseSlotInput("0") };
    const rows = assignDefaultTeamSlots(names, overrides);
    expect(rows[1]).toEqual({
      name: "Bravo",
      slotNumber: null,
      manual: true,
    });
    // Re-reconcile after another name edit — the clear survives.
    const again = assignDefaultTeamSlots(["Alpha", "Bravo!", "Charlie", "Delta"], overrides);
    expect(again[1]?.slotNumber).toBeNull();
    expect(again[1]?.manual).toBe(true);
    expect(again[2]?.slotNumber).toBe(7);
    expect(again[3]?.slotNumber).toBe(8);
  });
});

describe("findDuplicateSlots", () => {
  it("returns only slot values used more than once", () => {
    expect(findDuplicateSlots([5, 6, 6, 7, null, 5, undefined])).toEqual(
      new Set([5, 6]),
    );
    expect(findDuplicateSlots([5, 6, 7])).toEqual(new Set());
  });
});

describe("orderTeamsBySlot", () => {
  it("puts assigned slots first (ascending), then NULLs by name", () => {
    const teams = [
      { name: "Zulu", slotNumber: 5 },
      { name: "Bravo", slotNumber: null },
      { name: "Alpha", slotNumber: 2 },
      { name: "Able", slotNumber: null },
    ];
    expect(orderTeamsBySlot(teams).map((t) => t.name)).toEqual([
      "Alpha",
      "Zulu",
      "Able",
      "Bravo",
    ]);
  });

  it("does not mutate the input array", () => {
    const teams = [
      { name: "Zulu", slotNumber: 5 },
      { name: "Alpha", slotNumber: 2 },
    ];
    orderTeamsBySlot(teams);
    expect(teams.map((t) => t.name)).toEqual(["Zulu", "Alpha"]);
  });
});

describe("announcementSlotLabels", () => {
  it("keeps the legacy 01, 02, 03 fallback for an all-NULL list", () => {
    expect(
      announcementSlotLabels([
        { name: "Alpha", slotNumber: null },
        { name: "Bravo" },
        { name: "Charlie", slotNumber: undefined },
      ]),
    ).toEqual(["01", "02", "03"]);
  });

  it("renders assigned slots zero-padded", () => {
    expect(
      announcementSlotLabels([
        { name: "Alpha", slotNumber: 7 },
        { name: "Bravo", slotNumber: 25 },
      ]),
    ).toEqual(["07", "25"]);
  });

  it("skips assigned slots when numbering unassigned teams", () => {
    expect(
      announcementSlotLabels([
        { name: "Alpha", slotNumber: 2 },
        { name: "Bravo", slotNumber: null },
        { name: "Charlie", slotNumber: null },
      ]),
    ).toEqual(["02", "03", "04"]);
  });

  it("renders a 5..20 default slot ladder as 05..20 in slot order", () => {
    const names = Array.from({ length: 16 }, (_, i) => `Team ${i + 1}`);
    const teams = orderTeamsBySlot(assignDefaultTeamSlots(names));
    expect(teams.map((team) => team.slotNumber)).toEqual(
      Array.from({ length: 16 }, (_, i) => 5 + i),
    );
    expect(announcementSlotLabels(teams)).toEqual(
      Array.from({ length: 16 }, (_, i) => String(5 + i).padStart(2, "0")),
    );
  });
});
