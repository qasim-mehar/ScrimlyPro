import { describe, expect, it } from "vitest";

import { announcementSlotLabels, orderTeamsBySlot } from "@/lib/sessions/slots";

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
});
