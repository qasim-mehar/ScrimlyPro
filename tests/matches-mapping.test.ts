import { describe, expect, it } from "vitest";

import { shouldResize } from "@/components/matches/resize-images";
import type { RawSquad } from "@/lib/db/schema";
import { suggestMappings } from "@/lib/matching/suggest";
import { parseOcrFormData } from "@/lib/ocr/form";
import {
  sanitizeSquads,
  validateMapping,
  type SquadRowDraft,
} from "@/lib/matches/mapping";

function row(
  placement: number,
  teamId: string | null,
  playerCount = 3,
): SquadRowDraft {
  return {
    placement,
    squadTag: "",
    teamId,
    players: Array.from({ length: playerCount }, (_, i) => ({
      name: `P${placement}-${i}`,
      kills: 1,
    })),
  };
}

/** 4 fully-mapped squads, placements 1..4, distinct teams. */
function validRows(): SquadRowDraft[] {
  return [row(1, "t1"), row(2, "t2"), row(3, "t3"), row(4, "t4")];
}

describe("validateMapping", () => {
  it("all-mapped valid → []", () => {
    expect(validateMapping(validRows(), 4)).toEqual([]);
  });

  it("unmapped rows list their placements", () => {
    const rows = validRows();
    rows[1]!.teamId = null;
    rows[3]!.teamId = null;

    const issues = validateMapping(rows, 4);

    expect(issues.filter((i) => i.code === "UNMAPPED")).toHaveLength(2);
    expect(issues.map((i) => i.message).join("\n")).toContain("2");
    expect(issues.map((i) => i.message).join("\n")).toContain("4");
  });

  it("duplicate team names the team + both placements", () => {
    const rows = validRows();
    rows[2]!.teamId = "t1";
    const names = new Map([
      ["t1", "Alpha"],
      ["t2", "Beta"],
      ["t3", "Gamma"],
      ["t4", "Delta"],
    ]);

    const issues = validateMapping(rows, 4, names);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("DUPLICATE_TEAM");
    expect(issues[0]?.message).toContain("Alpha");
    expect(issues[0]?.message).toContain("1");
    expect(issues[0]?.message).toContain("3");
  });

  it("duplicate team without a name map falls back to the teamId", () => {
    const rows = validRows();
    rows[2]!.teamId = "t1";

    const issues = validateMapping(rows, 4);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("t1");
  });

  it("placement gap after edit → BAD_PLACEMENTS", () => {
    const rows = validRows();
    rows[3]!.placement = 5; // 1,2,3,5 — missing 4

    const issues = validateMapping(rows, 4);

    expect(issues.some((i) => i.code === "BAD_PLACEMENTS")).toBe(true);
    expect(issues.map((i) => i.message).join("\n")).toContain("4");
  });

  it("duplicate placement after edit → BAD_PLACEMENTS", () => {
    const rows = validRows();
    rows[3]!.placement = 2;

    const issues = validateMapping(rows, 4);

    expect(issues.some((i) => i.code === "BAD_PLACEMENTS")).toBe(true);
    expect(issues.map((i) => i.message).join("\n")).toContain("Duplicate placement 2");
  });

  it("5-player squad → BAD_SQUAD_SIZE", () => {
    const rows = validRows();
    rows[0] = row(1, "t1", 5);

    const issues = validateMapping(rows, 4);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("BAD_SQUAD_SIZE");
    expect(issues[0]?.message).toContain("Placement 1");
  });

  it("0-player squad → BAD_SQUAD_SIZE", () => {
    const rows = validRows();
    rows[0] = row(1, "t1", 0);

    const issues = validateMapping(rows, 4);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("BAD_SQUAD_SIZE");
  });
});

describe("sanitizeSquads (untrusted OCR boundary)", () => {
  it("missing squadTag/confidence → coerced, sorted; suggestMappings no longer crashes", () => {
    // Live Gemini reads omit squadTag/confidence (RawSquad declares them,
    // the wire doesn't guarantee them) — normalize(undefined) 500'd the page.
    const raw = JSON.parse(
      '[{"placement":2,"players":[{"name":"A","kills":1}]},{"placement":1,"squadTag":"TF","confidence":"low","players":[{"name":"B","kills":2,"confidence":"low"}]}]',
    ) as RawSquad[];

    const clean = sanitizeSquads(raw);

    expect(clean.map((s) => s.placement)).toEqual([1, 2]);
    expect(clean[0]).toMatchObject({ squadTag: "TF", confidence: "low" });
    expect(clean[1]).toMatchObject({ squadTag: "", confidence: "high" });
    expect(clean[1]?.players).toEqual([{ name: "A", kills: 1 }]);
    expect(() =>
      suggestMappings(clean, [{ id: "t1", name: "TF Squad" }], []),
    ).not.toThrow();
  });
});

describe("shouldResize (upload downscale gate)", () => {
  it("small WhatsApp shot (≤1600px, ≤500KB) → false (no re-compress)", () => {
    expect(shouldResize(1600, 900, 68 * 1024)).toBe(false);
    expect(shouldResize(800, 600, 500 * 1024)).toBe(false);
  });

  it("long edge over 1600px → true", () => {
    expect(shouldResize(1601, 900, 100 * 1024)).toBe(true);
    expect(shouldResize(900, 4000, 100 * 1024)).toBe(true);
  });

  it("small dimensions but over 500KB → true", () => {
    expect(shouldResize(1200, 800, 500 * 1024 + 1)).toBe(true);
  });
});

describe("parseOcrFormData total payload guard (C5.3 §2.6)", () => {
  function bigJpeg(name: string, bytes: number): File {
    return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
  }

  it("5 × 4.2MB (21MB total, each file legal) → BAD_REQUEST", async () => {
    const form = new FormData();
    form.set("sessionId", "s1");
    form.set("matchNo", "1");
    for (let i = 0; i < 5; i++) {
      form.append("images", bigJpeg(`s${i}.jpg`, Math.floor(4.2 * 1024 * 1024)));
    }

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_REQUEST");
    expect(result.error.message).toMatch(/exceeds 20MB/);
  });

  it("4 × 4.2MB (16.8MB total) → passes the total guard", async () => {
    const form = new FormData();
    form.set("sessionId", "s1");
    form.set("matchNo", "1");
    for (let i = 0; i < 4; i++) {
      form.append("images", bigJpeg(`s${i}.jpg`, Math.floor(4.2 * 1024 * 1024)));
    }

    const result = await parseOcrFormData(form);

    expect(result.ok).toBe(true);
  });
});
