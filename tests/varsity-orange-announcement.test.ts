import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  announcementRowLayout,
  getTemplate,
  relativeLuminance,
  hideScrimNameFor,
  parseHexColor,
  selectableAestheticIds,
} from "@/lib/graphics";
import { announcementSlotLabels } from "@/lib/sessions/slots";
import { VALID_TEMPLATE_IDS } from "@/lib/sessions/input";
import type { TeamRow } from "@/lib/scoring";

const ID = "varsity-orange";
const ASSET = resolve(process.cwd(), "public/templates/varsity-orange/announcement.png");
const REF = resolve(process.cwd(), "public/templates/varsity-orange/refrence-image/announcement-ref.png");
const CHARCOAL = "#111111"; // team names on the cream art
const ORANGE = "#E85319"; // slot numerals on the cream art
const PIPE_1 = 464;
const PIPE_2 = 834;
const GAP = 12;
const ROW_PITCH = (1225 - 501) / 11; // dash 12 center − dash 1 center, / 11

type AnnounceTeam = Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">;

/** 24 teams with explicit 1–24 seats — the campaign's calibration fixture. */
function teams(n = 24, withSlots = true): AnnounceTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `TEAM ${String(i + 1).padStart(2, "0")}`,
    logoUrl: null,
    slotNumber: withSlots ? i + 1 : null,
  }));
}

function render(n = 24, withSlots = true): string {
  return renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: ID,
      title: "MY SCRIM NAME",
      subtitle: "PARTICIPATING TEAMS",
      organizer: "MY ORGANIZER",
      teams: teams(n, withSlots),
    }),
  );
}

/** Every inline style attribute in the rendered markup. */
function styles(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
}

function imageDimensions(file: string): { w: number; h: number; kind: "png" | "jpeg" } {
  const b = readFileSync(file);
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), kind: "png" };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = b.readUInt16BE(i + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), kind: "jpeg" };
      }
      i += 2 + len;
    }
  }
  throw new Error("not a valid PNG/JPEG image");
}

describe("varsity-orange registration + assets", () => {
  it("is registered in AESTHETICS, AESTHETIC_IDS and the session allowlist", () => {
    const t = getTemplate(ID);
    expect(t.id).toBe(ID);
    expect(t.name).toBe("Varsity Orange");
    expect(AESTHETICS[ID]).toBe(t);
    expect(AESTHETIC_IDS).toContain(ID);
    expect(VALID_TEMPLATE_IDS).toContain(ID);
    expect(selectableAestheticIds("announcement")).toContain(ID);
  });

  it("ships a 2:3 announcement art and the visual reference guide", () => {
    expect(existsSync(ASSET)).toBe(true);
    const art = imageDimensions(ASSET);
    expect(art.kind).toBe("png");
    expect(art.w / art.h).toBeCloseTo(2 / 3, 6); // R9: exactly 2:3, no crop
    expect(getTemplate(ID).backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/varsity-orange/announcement.png",
    });
    expect(existsSync(REF)).toBe(true);
    expect(readFileSync(REF).length).toBeGreaterThan(0);
  });

  it("uses dark orange/carbon gradient fallbacks for standings and MVP", () => {
    const t = getTemplate(ID);
    for (const variant of ["standings", "mvp"] as const) {
      expect(t.backgrounds[variant].type).toBe("gradient");
    }
  });

  it("bakes the headline into the art — no dynamic header text renders", () => {
    const t = getTemplate(ID);
    expect(hideScrimNameFor(t, "announcement")).toBe(true);
    const html = render();
    expect(html).not.toContain("MY SCRIM NAME");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).not.toContain("MY ORGANIZER");
  });
});

describe("varsity-orange 24-slot geometry — two 12-row columns", () => {
  const spec = getTemplate(ID).announcement;

  it("pins the measured pipe centers and fixed row geometry", () => {
    expect(spec.leftX).toBe(PIPE_1);
    expect(spec.rightX).toBe(PIPE_2);
    expect(spec.slotPosition).toBe("right");
    expect(spec.pipeGap).toBe(GAP);
    expect(spec.rowY0).toBe(480);
    expect(spec.rowHeight).toBe(42);
    expect(spec.rowPitch).toBeCloseTo(ROW_PITCH, 8);
    expect(spec.rowsBottom).toBeCloseTo(1311.8181818181819, 8);
    expect(spec.fixedRowPitch).toBe(true);
    expect(spec.singleColumn).not.toBe(true);
  });

  it("lays out EXACTLY 24 slots — 12 in each column — for 24 teams", () => {
    const rows = announcementRowLayout(24, spec);
    expect(rows).toHaveLength(24);
    expect(rows.filter((r) => r.x === PIPE_1)).toHaveLength(12);
    expect(rows.filter((r) => r.x === PIPE_2)).toHaveLength(12);
    expect(spec.rowsPerColumn).toBe(12);
    // Every row box height is the painted dash, so the text midpoint is the
    // dash midpoint — zero cumulative pitch drift through row 12.
    for (const row of rows) {
      expect(row.rowH).toBe(42);
      expect(row.pitch).toBeCloseTo(ROW_PITCH, 8);
    }
    const left = rows.filter((r) => r.x === PIPE_1);
    expect(left[0]!.y).toBe(480);
    expect(left[11]!.y + left[11]!.rowH! / 2).toBeCloseTo(1225, 4);
  });

  it("keeps a 25th team on the fixed pitch instead of dragging the right column off its dashes", () => {
    const rows = announcementRowLayout(25, spec);
    expect(rows).toHaveLength(25);
    expect(rows.filter((r) => r.x === PIPE_1)).toHaveLength(12);
    expect(rows.filter((r) => r.x === PIPE_2)).toHaveLength(13);
    for (const row of rows) expect(row.pitch).toBeCloseTo(ROW_PITCH, 8);
    // The reserved pitch seats the overflow row below dash 12 but still on
    // the cream card, clear of the baked footer (y1465+).
    const overflow = rows[24]!;
    expect(overflow.y).toBeCloseTo(480 + 12 * ROW_PITCH, 8);
    expect(overflow.y + overflow.rowH!).toBeLessThan(1465);
  });

  it("never stretches rows off the painted dashes for fewer teams", () => {
    for (const n of [4, 12, 16, 20, 23]) {
      const rows = announcementRowLayout(n, spec);
      expect(rows).toHaveLength(n);
      for (const row of rows) {
        expect(row.rowH).toBe(42);
        expect(row.pitch).toBeCloseTo(ROW_PITCH, 8);
        expect(row.y + row.rowH!).toBeLessThanOrEqual(1312);
      }
    }
  });
});

describe("varsity-orange SSR — [Team Name] | [Slot #] pipe split", () => {
  const html = render();
  const allStyles = styles(html);

  it("renders all 24 names and 24 slot numerals with no NaN/undefined", () => {
    for (let i = 1; i <= 24; i++) {
      expect(html).toContain(`TEAM ${String(i).padStart(2, "0")}`);
      expect(html).toContain(`>${String(i).padStart(2, "0")}<`);
    }
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("places team names LEFT of each pipe and slot numbers RIGHT of it", () => {
    const spec = getTemplate(ID).announcement;
    const nameW = spec.teamW;
    const gap = spec.pipeGap!;
    // Name boxes end gap-px BEFORE each pipe; slot boxes start gap-px AFTER it.
    for (const pipe of [PIPE_1, PIPE_2]) {
      expect(pipe - gap - nameW).toBeLessThan(pipe); // name box is left of pipe
      expect(pipe + gap).toBeGreaterThan(pipe); // slot box is right of pipe
      expect(allStyles.filter((s) => s.includes(`left:${pipe - gap - nameW}px`))).toHaveLength(12);
      expect(allStyles.filter((s) => s.includes(`left:${pipe + gap}px`))).toHaveLength(12);
    }
    // The charcoal name ink and orange slot ink are pinned per column.
    expect(allStyles.filter((s) => s.includes(`color:${CHARCOAL}`))).toHaveLength(24);
    expect(allStyles.filter((s) => s.includes(`color:${ORANGE}`))).toHaveLength(24);
    // Names are RIGHT-aligned (snug to pipe) on both the flex cell and its
    // inner ellipsis block (2 nodes per name), slots LEFT-aligned by default.
    expect(allStyles.filter((s) => s.includes("text-align:right"))).toHaveLength(48);
  });

  it("centers both ink columns on every dash midline (flex + lineHeight:1 after font)", () => {
    const exactLineHeight = /(?:^|;)line-height:1(?:;|$)/;
    // 48 absolutely positioned cells (24 name + 24 slot), each 42px tall.
    const cells = allStyles.filter(
      (s) => s.startsWith("position:absolute") && s.includes("height:42px"),
    );
    expect(cells).toHaveLength(48);
    for (const s of cells) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }
  });

  it("uses Rajdhani-led 800 weight for both inks", () => {
    expect(html).toContain('font:800 22px &quot;Rajdhani&quot;');
    expect(html).toContain("Exo 2");
    expect(html).toContain("font-variant-numeric:tabular-nums");
    const spec = getTemplate(ID).announcement;
    expect(spec.nameFont).toContain("800");
    expect(spec.slotFont).toContain("800");
    expect(spec.inkColor).toBe(CHARCOAL);
    expect(spec.accentColor).toBe(ORANGE);
  });

  it("truncates 20+ character names with CSS ellipsis instead of crossing the pipe", () => {
    const long = teams().map((t, i) =>
      i === 0 ? { ...t, name: "VERY LONG TWENTY FIVE CHARACTER TEAM NAME" } : t,
    );
    const markup = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: ID,
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: long,
      }),
    );
    expect(markup).toContain("text-overflow:ellipsis");
    expect(markup).toContain("white-space:nowrap");
    expect(markup).toContain("overflow:hidden");
    expect(markup).not.toContain("NaN");
  });

  it("renders cleanly for edge counts 1, 12, 16 and 24", () => {
    for (const n of [1, 12, 16, 24]) {
      const markup = render(n);
      expect(markup).not.toContain("NaN");
      expect(markup).not.toContain("undefined");
      expect(markup).toContain(`TEAM ${String(n).padStart(2, "0")}`);
    }
  });
});

describe("varsity-orange slot fallbacks (NULL slot_number)", () => {
  it("increments unassigned seats 01–24 without collision", () => {
    const labels = announcementSlotLabels(teams(24, false));
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe("01");
    expect(labels[23]).toBe("24");
    expect(new Set(labels).size).toBe(24);
  });

  it("skips numbers already used by an assigned slot", () => {
    const mixed: AnnounceTeam[] = [
      { id: "a", name: "A", logoUrl: null, slotNumber: 5 },
      { id: "b", name: "B", logoUrl: null, slotNumber: null },
      { id: "c", name: "C", logoUrl: null, slotNumber: 7 },
      { id: "d", name: "D", logoUrl: null, slotNumber: null },
    ];
    // index 1 → 2 (free), index 3 → 4 (free; 3 would also be free but the
    // fallback advances from the row number and skips any used seat).
    expect(announcementSlotLabels(mixed)).toEqual(["05", "02", "07", "04"]);
  });

  it("renders an all-NULL 24-team list as 01–24 on the art", () => {
    const html = render(24, false);
    for (let i = 1; i <= 24; i++) expect(html).toContain(`>${String(i).padStart(2, "0")}<`);
    expect(html).not.toContain("NaN");
  });
});

describe("varsity-orange contrast on the light card region", () => {
  it("charcoal names clear AA normal text and varsity-orange slots clear AA large text", () => {
    // The cream card region (canvas x300–1000, y480–1246) is the light
    // background both inks sit on. Pin against a conservative light-card
    // luminance of 0.85 (the art measures brighter, so this is a lower bound).
    const CARD_LUM = 0.85;
    const over = (fg: string) => {
      const fgLum = relativeLuminance(parseHexColor(fg));
      return (Math.max(CARD_LUM, fgLum) + 0.05) / (Math.min(CARD_LUM, fgLum) + 0.05);
    };
    // #111111 is normal-weight-scale display ink → WCAG AA 4.5:1 floor.
    expect(over(CHARCOAL)).toBeGreaterThanOrEqual(4.5);
    // #E85319 is the prompt's fixed varsity slot ink. At 800-weight 22px it
    // qualifies as WCAG LARGE text (≥18.66px bold) → the AA floor is 3:1,
    // which the measured orange/cream pair clears (≈3.2:1).
    expect(over(ORANGE)).toBeGreaterThanOrEqual(3);
  });
});
