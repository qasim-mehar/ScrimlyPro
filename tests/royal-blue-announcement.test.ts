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
  contrastRatio,
  getTemplate,
  headerFor,
  hideScrimNameFor,
  parseHexColor,
} from "@/lib/graphics";
import type { TeamRow } from "@/lib/scoring";

const ASSET = resolve(process.cwd(), "public/templates/royal-blue/announcement.png");
const SAFE_TOP = 425;
const SAFE_BOTTOM = 1145;
const GOLD = "#FFB81C";
const WHITE = "#FFFFFF";
const ROYAL = "#00338D";

type AnnounceTeam = Pick<TeamRow, "id" | "name" | "logoUrl" | "slotNumber">;

function teams(n: number): AnnounceTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `team ${String(i + 1).padStart(2, "0")}`, // deliberately lowercase: CSS uppercases it
    logoUrl: null,
    slotNumber: 5 + i, // 5..28 → "05".."28"
  }));
}

/** JPEG SOF dimensions (the template is a JPEG payload in a `.png`-named file,
 *  like the other broadcast arts). PNG IHDR is accepted too for robustness. */
function imageDimensions(file: string): { w: number; h: number; kind: "jpeg" | "png" } {
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
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
      ) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), kind: "jpeg" };
      }
      i += 2 + len;
    }
  }
  throw new Error("not a valid PNG/JPEG image");
}

describe("royal-blue asset", () => {
  it("exists, is non-empty and has valid image magic bytes + 2:3 dimensions", () => {
    expect(existsSync(ASSET)).toBe(true);
    expect(readFileSync(ASSET).length).toBeGreaterThan(0);
    const dims = imageDimensions(ASSET);
    expect(dims.kind).toBe("jpeg");
    // 4096×6144 JPEG payload inside a `.png` name → uniform ×1080/4096
    // cover fit onto the 1080×1620 canvas, no crop, slots land on config px.
    expect(dims.w).toBe(4096);
    expect(dims.h).toBe(6144);
    expect(dims.w / dims.h).toBeCloseTo(2 / 3, 6);
  });
});

describe("royal-blue registration + header suppression", () => {
  it("is registered in the aesthetic registry", () => {
    const t = getTemplate("royal-blue");
    expect(t.id).toBe("royal-blue");
    expect(t.name).toBe("Royal Blue (Participation)");
    expect(AESTHETICS["royal-blue"]).toBe(t);
    expect(AESTHETIC_IDS).toContain("royal-blue");
    expect(t.backgrounds.announcement).toEqual({
      type: "image",
      src: "/templates/royal-blue/announcement.png",
    });
  });

  it("suppresses the scrim name and every dynamic header on the announcement art", () => {
    const t = getTemplate("royal-blue");
    expect(hideScrimNameFor(t, "announcement")).toBe(true);
    const header = headerFor(t, "announcement");
    for (const slot of [header.title, header.subtitle, header.organizer]) {
      expect(slot.w).toBe(0);
      expect(slot.x).toBeLessThan(0);
    }
    const html = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "royal-blue",
        title: "MY SCRIM NAME",
        subtitle: "PARTICIPATING TEAMS",
        organizer: "MY ORGANIZER",
        teams: teams(4),
      }),
    );
    expect(html).not.toContain("MY SCRIM NAME");
    expect(html).not.toContain("PARTICIPATING TEAMS");
    expect(html).not.toContain("MY ORGANIZER");
  });
});

describe("royal-blue 1–24 team geometry + art clearance", () => {
  const spec = getTemplate("royal-blue").announcement;

  it.each([1, 4, 8, 12, 16, 20, 24])("keeps every row inside the safe window for %i teams", (n) => {
    const rows = announcementRowLayout(n, spec);
    expect(rows).toHaveLength(n);
    for (const row of rows) {
      expect(row.y).toBeGreaterThanOrEqual(SAFE_TOP);
      expect(row.y + (row.rowH ?? spec.rowHeight)).toBeLessThanOrEqual(SAFE_BOTTOM);
      expect(row.rowH).toBe(44);
      expect(row.pitch).toBe(58);
    }
  });

  it("uses two 12-row columns with fixed pitch for 24 teams", () => {
    const rows = announcementRowLayout(24, spec);
    const left = rows.filter((r) => r.x === 110);
    const right = rows.filter((r) => r.x === 560);
    expect(left).toHaveLength(12);
    expect(right).toHaveLength(12);
    for (const row of rows) {
      expect(row.rowH).toBe(44);
      expect(row.pitch).toBe(58);
    }
    expect(left[0]?.y).toBe(425);
    expect(left[11]?.y).toBe(425 + 11 * 58);
    expect(right[0]?.y).toBe(425);
    // Row 12 bottom = 425 + 11*58 + 44 = 1107 ≤ 1145 (bottom art starts 1180).
    expect(left[11]!.y + left[11]!.rowH!).toBe(1107);
  });

  it("never stretches rows into the bottom art with fewer than 24 teams", () => {
    for (const n of [1, 12, 16, 20, 23]) {
      const rows = announcementRowLayout(n, spec);
      expect(new Set(rows.map((r) => r.pitch))).toEqual(new Set([58]));
      expect(Math.max(...rows.map((r) => r.y + r.rowH!))).toBeLessThanOrEqual(1107);
    }
  });

  it("auto-fits an overflow 25th team inside rowsBottom", () => {
    const rows = announcementRowLayout(25, spec);
    expect(rows).toHaveLength(25);
    expect(rows.filter((r) => r.x === 110)).toHaveLength(12);
    expect(rows.filter((r) => r.x === 560)).toHaveLength(13);
    for (const row of rows) expect(row.y + row.rowH!).toBeLessThanOrEqual(SAFE_BOTTOM);
  });
});

describe("royal-blue SSR — Y-axis centering + reference typography", () => {
  const html = renderToStaticMarkup(
    h(AnnouncementGraphic, {
      aestheticId: "royal-blue",
      title: "SCRIM",
      subtitle: "PARTICIPATING TEAMS",
      organizer: null,
      teams: teams(24),
    }),
  );

  it("renders all zero-padded slot labels 05..28 and uppercase team names", () => {
    for (let slot = 5; slot <= 28; slot++) {
      expect(html).toContain(`>${String(slot).padStart(2, "0")}<`);
    }
    // Source spelling stays lowercase — CSS `text-transform:uppercase` (pinned
    // below) renders it uppercase without mutating the underlying team name.
    for (let i = 1; i <= 24; i++) {
      expect(html).toContain(`team ${String(i).padStart(2, "0")}`);
    }
  });

  it("pins flex centering and line-height AFTER the font shorthand on every cell", () => {
    // Check per style attribute (font values contain `&quot;` entities, which
    // themselves carry semicolons, so a single naive regex cannot span them).
    const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]!);
    const exactLineHeight = /(?:^|;)line-height:1(?:;|$)/;

    // 24 row wrappers: absolutely positioned, 44px tall flex/center boxes.
    const wrappers = styles.filter(
      (s) => s.startsWith("position:absolute") && s.includes("height:44px"),
    );
    expect(wrappers).toHaveLength(24);
    for (const s of wrappers) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
    }

    // 48 cells (slot + name): flex/center, height:100%, font then line-height:1.
    const cells = styles.filter((s) => s.includes("height:100%"));
    expect(cells).toHaveLength(48);
    for (const s of cells) {
      expect(s).toContain("display:flex");
      expect(s).toContain("align-items:center");
      // The `font` shorthand resets line-height; it must be re-declared AFTER
      // it, and the value must be exactly 1 (not 1.5 / 10px).
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }

    // The row wrapper carries the font shorthand too — same ordering law.
    for (const s of wrappers) {
      expect(exactLineHeight.test(s)).toBe(true);
      expect(s.indexOf("font:")).toBeLessThan(s.search(exactLineHeight));
    }
  });

  it("pins the gold slot / white name hierarchy and athletic tracking", () => {
    expect(html).toContain(`color:${GOLD}`);
    expect(html).toContain(`color:${WHITE}`);
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("text-transform:uppercase");
    expect(html).toContain("letter-spacing:0.04em");
    expect(html).toContain('font:800 22px &quot;Exo 2&quot;');
    expect(html).toContain('font:700 22px &quot;Exo 2&quot;');
  });

  it("handles 30-character PUBG glyph names without NaN or lost rows", () => {
    const glyphs = "TEAM × · | _ ₛ ≌ 日本語 ALPHA-0123456789".slice(0, 30);
    const glyphTeams: AnnounceTeam[] = teams(16).map((t, i) => ({
      ...t,
      name: i === 0 ? glyphs : `${t.name}${glyphs}`.slice(0, 30),
    }));
    const markup = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "royal-blue",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: glyphTeams,
      }),
    );
    expect(markup).toContain(glyphs);
    expect(markup).toContain("text-overflow:ellipsis");
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("undefined");
    expect(markup.match(/left:(110|560)px/g)).toHaveLength(16);
  });

  it("keeps the configured font/palette tokens exactly", () => {
    const t = getTemplate("royal-blue");
    expect(t.announcement.rankFont).toBe('800 22px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif');
    expect(t.announcement.nameFont).toBe('700 22px "Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif');
    expect(t.announcement.accentColor).toBe(GOLD);
    expect(t.announcement.inkColor).toBe(WHITE);
    expect(t.announcement.mutedColor).toBe("#93C5FD");
    expect(t.announcement.cardBg).toBe("transparent");
    expect(t.palette.accent).toBe(GOLD);
    expect(t.palette.text).toBe(WHITE);
  });

  it("renders all rows for the edge counts without NaN/undefined", () => {
    for (const n of [1, 12, 16, 24]) {
      const markup = renderToStaticMarkup(
        h(AnnouncementGraphic, {
          aestheticId: "royal-blue",
          title: "SCRIM",
          subtitle: "PARTICIPATING TEAMS",
          organizer: null,
          teams: teams(n),
        }),
      );
      expect(markup).not.toContain("NaN");
      expect(markup).not.toContain("undefined");
      expect(markup).toContain(`team ${String(n).padStart(2, "0")}`);
    }
  });

  it("renders the overflow 25th team inside the safe window (SSR)", () => {
    const markup = renderToStaticMarkup(
      h(AnnouncementGraphic, {
        aestheticId: "royal-blue",
        title: "SCRIM",
        subtitle: "PARTICIPATING TEAMS",
        organizer: null,
        teams: teams(25),
      }),
    );
    expect(markup).toContain("team 25");
    expect(markup).toContain(">29<"); // last zero-padded slot label
    expect(markup.match(/left:(110|560)px/g)).toHaveLength(25);
    const rowTops = [...markup.matchAll(/position:absolute;left:\d+px;top:(\d+(?:\.\d+)?)px/g)].map(
      (m) => Number(m[1]),
    );
    expect(rowTops).toHaveLength(25);
    for (const top of rowTops) {
      expect(top).toBeGreaterThanOrEqual(SAFE_TOP);
      expect(top + 44).toBeLessThanOrEqual(SAFE_BOTTOM);
    }
  });
});

describe("royal-blue WCAG contrast (repo contrast helper)", () => {
  it("gold slot ink and white name ink both clear 4.5:1 against royal blue", () => {
    const field = parseHexColor(ROYAL);
    expect(contrastRatio(parseHexColor(GOLD), field)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseHexColor(WHITE), field)).toBeGreaterThanOrEqual(4.5);
  });

  it("the gradient fallback stops clear 4.5:1 for white name ink", () => {
    const config = getTemplate("royal-blue");
    for (const bg of Object.values(config.backgrounds)) {
      if (bg.type !== "gradient") continue;
      for (const stop of bg.css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        expect(contrastRatio(parseHexColor(WHITE), parseHexColor(stop))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
