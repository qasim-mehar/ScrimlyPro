import { describe, expect, it } from "vitest";
import { normalizeName } from "@/lib/matching/normalize";
import {
  aggregatePlayers,
  draftMvpTop5,
  levenshtein,
  type MvpSourceRow,
  type PlayerAggregate,
} from "@/lib/mvp";

function row(teamId: string, matchNo: number, players: Array<{ name: string; kills: number }>): MvpSourceRow {
  return { teamId, matchNo, players };
}

function find(entries: PlayerAggregate[], displayName: string): PlayerAggregate {
  const hit = entries.find((entry) => entry.displayName === displayName);
  if (!hit) throw new Error(`no aggregate with displayName ${displayName}`);
  return hit;
}

describe("levenshtein", () => {
  it("measures classic edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});

describe("normalizeName (shared C2.2 contract)", () => {
  it("collapses separator runs to one space and lowercases", () => {
    expect(normalizeName("Bawa·Qadra")).toBe("bawa qadra");
    expect(normalizeName("4NM | BROKEN")).toBe("4nm broken");
  });

  it("keeps glued names glued and non-Latin names intact", () => {
    expect(normalizeName("4NMBROKEN")).toBe("4nmbroken");
    expect(normalizeName("علی")).toBe("علی");
  });

  it("empties emoji-only names", () => {
    expect(normalizeName("🐉🔥")).toBe("");
  });
});

describe("aggregatePlayers", () => {
  it("merges exact-normalized variants within a team (frequency tie → first-seen canonical)", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "Bawa·Qadra", kills: 4 }]),
      row("T1", 2, [{ name: "Bawa Qadra", kills: 3 }]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      teamId: "T1",
      displayName: "Bawa·Qadra",
      norm: "bawa qadra",
      kills: 7,
    });
    expect(entries[0].variants).toEqual(["Bawa·Qadra", "Bawa Qadra"]);
  });

  it("merges glue drift (4nm broken vs 4nmbroken, distance 1)", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "4NM | BROKEN", kills: 2 }]),
      row("T1", 2, [{ name: "4NMBROKEN", kills: 5 }]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].variants).toEqual(["4NM | BROKEN", "4NMBROKEN"]);
    expect(entries[0].kills).toBe(7);
  });

  it("merges edit drift (trb hanan vs trb hann, distance 1)", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "TRB HANAN", kills: 3 }]),
      row("T1", 2, [{ name: "TRB HANN", kills: 2 }]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].variants).toEqual(["TRB HANAN", "TRB HANN"]);
    expect(entries[0].kills).toBe(5);
  });

  it("keeps heavy drift split — the MVP editor resolves it", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "TF×MAₛOOR", kills: 4 }]),
      row("T1", 2, [{ name: "TFxMA_SODOR", kills: 3 }]),
    ]);
    expect(entries).toHaveLength(2);
    expect(find(entries, "TF×MAₛOOR").kills).toBe(4);
    expect(find(entries, "TFxMA_SODOR").kills).toBe(3);
  });

  it("never merges identical names across teams", () => {
    const entries = aggregatePlayers([
      row("A", 1, [{ name: "HANAN", kills: 3 }]),
      row("B", 1, [{ name: "HANAN", kills: 4 }]),
    ]);
    expect(entries).toHaveLength(2);
    const byTeam = new Map(entries.map((entry) => [entry.teamId, entry.kills]));
    expect(byTeam.get("A")).toBe(3);
    expect(byTeam.get("B")).toBe(4);
    for (const entry of entries) expect(entry.displayName).toBe("HANAN");
  });

  it("keeps non-Latin names intact and separate", () => {
    const entries = aggregatePlayers([
      row("X", 1, [{ name: "علی", kills: 2 }]),
      row("X", 2, [{ name: "احمد", kills: 3 }]),
    ]);
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.norm).not.toBe("");
    }
    expect(find(entries, "علی").kills).toBe(2);
    expect(find(entries, "احمد").kills).toBe(3);
  });

  it("never merges empty-norm (emoji-only) names — not even with each other", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "🐉", kills: 1 }]),
      row("T1", 2, [{ name: "🔥", kills: 2 }]),
    ]);
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.norm).toBe("");
      expect(entry.variants).toHaveLength(1);
    }
  });

  it("picks the most frequent spelling as canonical", () => {
    const entries = aggregatePlayers([
      row("T1", 1, [{ name: "SNAKE", kills: 2 }]),
      row("T1", 2, [{ name: "SN4KE", kills: 1 }]),
      row("T1", 3, [{ name: "SNAKE", kills: 3 }]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].displayName).toBe("SNAKE");
    expect(entries[0].kills).toBe(6);
    expect(entries[0].variants).toEqual(["SNAKE", "SN4KE"]);
  });

  it("is independent of input row order (matchNo ASC wins)", () => {
    const rows: MvpSourceRow[] = [
      row("T1", 3, [{ name: "SNAKE", kills: 3 }]),
      row("T1", 1, [{ name: "Bawa·Qadra", kills: 4 }]),
      row("T2", 3, [{ name: "HANAN", kills: 2 }]),
      row("T1", 2, [{ name: "SN4KE", kills: 1 }]),
      row("T2", 1, [{ name: "HANAN", kills: 5 }]),
      row("T1", 2, [{ name: "Bawa Qadra", kills: 3 }]),
    ];
    const shuffled = rows.slice().reverse();
    expect(aggregatePlayers(shuffled)).toEqual(aggregatePlayers(rows));
  });

  it("is deterministic: same input twice → deep-equal output", () => {
    const rows: MvpSourceRow[] = [
      row("T1", 1, [{ name: "Bawa·Qadra", kills: 4 }, { name: "SNAKE", kills: 2 }]),
      row("T1", 2, [{ name: "Bawa Qadra", kills: 3 }]),
      row("T2", 2, [{ name: "HANAN", kills: 5 }]),
    ];
    expect(aggregatePlayers(rows)).toEqual(aggregatePlayers(rows));
  });
});

describe("draftMvpTop5", () => {
  function player(displayName: string, kills: number): PlayerAggregate {
    return { teamId: "T1", displayName, norm: displayName.toLowerCase(), kills, variants: [displayName] };
  }

  it("sorts kills DESC, breaks ties by name codepoint ASC, and takes exactly 5", () => {
    const players = [
      player("Waldo", 3),
      player("Zed", 8),
      player("Ann", 8),
      player("Cara", 10),
      player("Bob", 6),
      player("Eve", 5),
      player("Dan", 1),
    ];
    const top5 = draftMvpTop5(players);
    expect(top5).toHaveLength(5);
    expect(top5.map((entry) => entry.displayName)).toEqual(["Cara", "Ann", "Zed", "Bob", "Eve"]);
  });

  it("returns fewer than 5 when input is smaller and never mutates the input", () => {
    const players = [player("A", 1), player("B", 2)];
    const top = draftMvpTop5(players);
    expect(top).toHaveLength(2);
    expect(top[0].displayName).toBe("B");
    expect(players.map((entry) => entry.displayName)).toEqual(["A", "B"]);
  });
});
