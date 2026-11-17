import { readFileSync, statSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import {
  AESTHETICS,
  AESTHETIC_IDS,
  getTemplate,
  headerFor,
  hideScrimNameFor,
} from "@/lib/graphics";
import { announcementRows } from "@/lib/graphics/announcement";
import { announcementSlotLabels } from "@/lib/sessions/slots";

const ID = "rundown-orange" as const;
const ART = "public/templates/rundown-orange/announcement.png";

/**
 * Exact canvas Y centres of the 29 baked white divider lines, measured from
 * the live art (a 4096×6144 JPEG payload in a .png name → canvas ×1080/4096 =
 * 0.263671875, no crop) by scanning canvas column x=540 for full-width bright
 * bands across x212..868. Rows 0–23 use lines 0–24.
 */
const LINE_Y = [
  289.1162, 329.9853, 370.9863, 411.5918, 452.5933, 493.3301, 533.9354,
  574.5405, 615.1739, 656.1685, 696.8847, 737.0880, 776.7379, 816.9293,
  857.3441, 897.5391, 937.7497, 977.8273, 1017.6409, 1057.1924, 1096.8750,
  1136.1623, 1175.4492, 1214.8614, 1254.4190, 1293.9858, 1333.6525,
  1373.0715, 1412.3584,
] as const;

const TEAMS = Array.from({ length: 24 }, (_, i) => ({
  id: `t${i}`,
  name: `TEAM ${String(i + 1).padStart(2, "0")}`,
  logoUrl: i === 0 ? "data:image/png;base64,iVBORw0KGgo=" : null,
  slotNumber: 5 + i, // default slots 5..28
}));

function render(n = 24) {
  return renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: ID,
      title: "SCRIM",
      subtitle: "PARTICIPATING TEAMS",
      organizer: "ORGANIZER",
      teams: TEAMS.slice(0, n),
    }),
  );
}

/** JPEG SOF dimension sniff (the art payload is JPEG, not PNG). */
function jpegSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  expect(b[0]).toBe(0xff);
  expect(b[1]).toBe(0xd8);
  let pos = 2;
  while (pos + 9 < b.length) {
    if (b[pos] !== 0xff) {
      pos += 1;
      continue;
    }
    const marker = b[pos + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: b.readUInt16BE(pos + 5), w: b.readUInt16BE(pos + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    pos += 2 + b.readUInt16BE(pos + 2);
  }
  throw new Error("JPEG without an SOF marker");
}

describe("rundown-orange — asset", () => {
  it("ships a non-empty art payload at the measured canvas ratio", () => {
    expect(statSync(ART).size).toBeGreaterThan(10_000);
    expect(jpegSize(ART)).toEqual({ w: 4096, h: 6144 }); // 2:3 → no crop at 1080×1620
    expect(LINE_Y).toHaveLength(29);
  });
});

describe("rundown-orange — registration & baked header suppression", () => {
  const config = getTemplate(ID);

  it("is registered in both registries and keyed by id", () => {
    expect(AESTHETICS[ID]).toBe(config);
    expect(AESTHETIC_IDS).toContain(ID);
    expect(config.id).toBe(ID);
    expect(config.name).toBe("Rundown Orange (Participation)");
  });

  it("uses the baked announcement art with warm gradient fallbacks", () => {
    expect(config.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/rundown-orange/announcement.png",
    });
    for (const variant of ["standings", "mvp"] as const) {
      expect(config.backgrounds[variant].type).toBe("gradient");
      expect((config.backgrounds[variant] as { css: string }).css).toContain("#D93800");
    }
  });

  it("pins the single-column, fixed-pitch geometry", () => {
    const a = config.announcement;
    expect(a.singleColumn).toBe(true);
    expect(a.fixedRowPitch).toBe(true);
    expect(a.rowsPerColumn).toBe(24);
    expect(a.leftX).toBe(212);
    expect(a.rightX).toBe(868);
    expect(a.colWidth).toBe(656);
    expect(a.rowY0).toBe(LINE_Y[0]);
    expect(a.rowPitch).toBeCloseTo((LINE_Y[24] - LINE_Y[0]) / 24, 5);
    expect(a.rowHeight).toBeCloseTo(a.rowPitch!, 5);
    expect(a.rowsBottom).toBe(LINE_Y[24]);
    // The single column spans exactly the baked lines' horizontal extent.
    expect(a.rightX! - a.leftX!).toBe(a.colWidth);
    expect(a.colWidth).toBe(a.teamX! + a.teamW! - a.slotX);
    expect(a.lineYs).toEqual([...LINE_Y]);
  });

  it("suppresses the dynamic title/subtitle so baked 'team participation' is clear", () => {
    expect(hideScrimNameFor(config, "announcement")).toBe(true);
    const header = headerFor(config, "announcement");
    // HeaderSpec slots are coordinate objects — suppression means zero-width,
    // off-canvas slots; the single-column renderer skips them entirely.
    for (const slot of [header.title, header.subtitle, header.organizer]) {
      expect(slot.x).toBeLessThan(0);
      expect(slot.w).toBe(0);
    }
    expect(config.announcement.subtitleBakedIn).toBe(true);
  });

  it("pins the editorial grotesque typography and pure-white ink", () => {
    const a = config.announcement;
    expect(a.rankFont).toBe('500 22px "Inter", "Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif');
    expect(a.nameFont).toBe('500 23px "Inter", "Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif');
    expect(a.inkColor).toBe("#FFFFFF");
    expect(a.accentColor).toBe("#FFFFFF");
    expect(a.mutedColor).toBe("#FED7AA");
    expect(a.cardBg).toBe("transparent");
    expect(config.palette.text).toBe("#FFFFFF");
    expect(config.palette.accent).toBe("#FFFFFF");
    expect(config.palette.rowAltOpacity).toBe(0);
    expect(config.palette.wwcdBg).toBe("rgba(0,0,0,0)");
  });
});

describe("rundown-orange — 1–24 team line-locked geometry", () => {
  const spec = getTemplate(ID).announcement;

  it.each([1, 4, 8, 12, 16, 20, 24])("locks all %i rows in the single column", (n) => {
    const rows = announcementRows(n, spec);
    expect(rows).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      expect(rows[i].y).toBe(LINE_Y[i]);
      expect(rows[i].pitch).toBeCloseTo(LINE_Y[i + 1] - LINE_Y[i], 10);
    }
    // The single column is config-wide: no per-row x/width split exists.
    expect(spec.singleColumn).toBe(true);
    expect(spec.leftX).toBe(212);
    expect(spec.colWidth).toBe(656);
  });

  it("centres every row on the exact midpoint of its two baked lines for ALL counts 1..24", () => {
    for (let n = 1; n <= 24; n++) {
      const rows = announcementRows(n, spec);
      for (let i = 0; i < n; i++) {
        const textCentre = rows[i].y + rows[i].pitch / 2;
        const lineMidpoint = (LINE_Y[i] + LINE_Y[i + 1]) / 2;
        expect(Math.abs(textCentre - lineMidpoint)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("never stretches the pitch when the team count shrinks", () => {
    const rows24 = announcementRows(24, spec);
    for (const n of [1, 4, 8, 12, 16, 20]) {
      const rowsN = announcementRows(n, spec);
      for (let i = 0; i < n; i++) {
        expect(rowsN[i].y).toBe(rows24[i].y);
        expect(rowsN[i].pitch).toBe(rows24[i].pitch);
      }
    }
  });

  it("clears the baked header band and footer lockup", () => {
    const rows = announcementRows(24, spec);
    // Header band occupies y 0..285; row 0 starts on the first baked line.
    expect(rows[0].y).toBeGreaterThanOrEqual(285);
    // Row 23's bottom edge is baked line 24, clear of the footer (y1470+).
    expect(rows[23].y + rows[23].pitch).toBeLessThanOrEqual(1420);
  });
});

describe("rundown-orange — SSR markup & typography", () => {
  const html = render(24);
  const styleAttrs = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);

  it("renders 24 slots (05..28) and 24 team names in the single column", () => {
    expect(announcementSlotLabels(TEAMS)).toEqual(
      Array.from({ length: 24 }, (_, i) => String(5 + i).padStart(2, "0")),
    );
    for (let i = 0; i < 24; i++) {
      expect(html).toContain(`>${String(5 + i).padStart(2, "0")}<`);
      expect(html).toContain(`TEAM ${String(i + 1).padStart(2, "0")}`);
    }
    expect((html.match(/left:212px/g) ?? []).length).toBe(24);
    expect((html.match(/width:656px/g) ?? []).length).toBe(24);
  });

  it("positions each row top on its measured baked line", () => {
    for (let i = 0; i < 24; i++) expect(html).toContain(`top:${LINE_Y[i]}px`);
  });

  it("centres text with flexbox and declares line-height AFTER every font shorthand", () => {
    const fontStyles = styleAttrs.filter((s) => s.includes("font:"));
    expect(fontStyles.length).toBeGreaterThanOrEqual(48); // row + 2 spans × 24
    for (const s of fontStyles) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      expect(s).toContain("line-height:1");
      expect(s.indexOf("font:")).toBeLessThan(s.indexOf("line-height:1"));
    }
    expect(html).toContain("font:500 22px"); // slot '#'
    expect(html).toContain("font:500 23px"); // team name
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("letter-spacing:-0.02em");
    expect(html).toContain("letter-spacing:-0.01em");
    expect(html).toContain("white-space:nowrap");
    expect(html).toContain("text-overflow:ellipsis");
  });

  it("paints Inter and pure-white ink, with no row card behind the text", () => {
    expect(html).toContain("Inter");
    expect(html).toContain("Rajdhani");
    expect(html).toContain("Noto Sans Symbols 2");
    expect(html).toContain("system-ui");
    expect((html.match(/color:#FFFFFF/g) ?? []).length).toBeGreaterThanOrEqual(48);
    expect(html).not.toContain("background:");
    expect(html).not.toContain("border-radius:50%"); // no logo plate over the art
  });

  it("ellipsizes over-long names via an inner block (flex nodes cannot ellipsize)", () => {
    const long = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: ID,
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        teams: [{ ...TEAMS[0], name: "A".repeat(60) }],
      }),
    );
    expect(long).toContain("min-width:0");
    expect((long.match(/text-overflow:ellipsis/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(long).toContain("A".repeat(60));
  });

  it("emits no dynamic header text over the baked 'team participation' lockup", () => {
    expect(html).not.toContain("SCRIM");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).not.toContain("ORGANIZER");
  });

  it("renders cleanly at the smaller supported counts too", () => {
    for (const n of [1, 4, 12, 24]) {
      const h1 = render(n);
      expect(h1).not.toContain("NaN");
      expect(h1).not.toContain("undefined");
      expect((h1.match(/left:212px/g) ?? []).length).toBe(n);
    }
  });
});
