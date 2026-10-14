import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementGraphic } from "@/components/graphics/AnnouncementGraphic";
import { MvpGraphic } from "@/components/graphics/MvpGraphic";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { effectivePitch, getTemplate, splitRows, type AestheticId } from "@/lib/graphics";
import type { MvpDisplayEntry } from "@/lib/graphics/mvp";
import type { StandingRow } from "@/lib/scoring";

const LOGO = "data:image/png;base64,iVBORw0KGgo=";

function rows(n: number, withLogos: boolean): StandingRow[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    teamName: `SQUAD ${i + 1}`,
    logoUrl: withLogos && i % 2 === 0 ? LOGO : null,
    wwcd: i === 0 ? 2 : 0,
    pp: 40 - i,
    kp: 30 - i,
    total: 70 - i * 2,
  }));
}

function mvpEntries(): MvpDisplayEntry[] {
  return [
    { rank: 1, name: "ALPHA", teamName: "SQUAD 1", kills: 24 },
    { rank: 2, name: "BRAVO", teamName: "SQUAD 2", kills: 21 },
    { rank: 3, name: "CHARLIE", teamName: "SQUAD 3", kills: 19 },
    { rank: 4, name: "DELTA", teamName: "SQUAD 4", kills: 17 },
    { rank: 5, name: "ECHO", teamName: "SQUAD 5", kills: 15 },
  ];
}

function announceTeams(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `SQUAD ${i + 1}`,
    logoUrl: i === 0 ? LOGO : null,
  }));
}

function standings(
  aestheticId: AestheticId,
  subtitle: string,
  n: number,
  opts: { logos?: boolean; matchCount?: number } = {},
) {
  return h(OverallStandingsGraphic, {
    aestheticId,
    title: "SCRIM",
    subtitle,
    organizer: null,
    standings: rows(n, opts.logos ?? false),
    matchCount: opts.matchCount,
  });
}

describe("Fix A — matchCount/isFinal renders (SSR)", () => {
  it("pmpl-light final with matchCount renders the count, never an empty slot", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "FINAL RESULTS", 16, { matchCount: 6 }));
    expect(html).toContain(">6<");
    expect(html).not.toContain("FINAL RESULTS");
  });

  it("pmpl-light mid-session with matchCount renders the count verbatim", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 2", 16, { matchCount: 2 }));
    expect(html).toContain(">2<");
  });

  it("pmpl-light without matchCount keeps the digit-parsing fallback", () => {
    const mid = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 2", 16));
    expect(mid).toContain(">2<");
    // FINAL RESULTS with no count → the documented empty slot (callers must
    // pass matchCount; GraphicsTab always does when confirmedCount > 0).
    const fin = renderToStaticMarkup(standings("pmpl-light", "FINAL RESULTS", 16));
    expect(fin).toMatch(/left:620px;[^"]*">\s*<\/div>/);
  });

  it.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
    "gradient %s ignores matchCount — full subtitle untouched",
    (id) => {
      const html = renderToStaticMarkup(standings(id, "FINAL RESULTS", 16, { matchCount: 6 }));
      expect(html).toContain("FINAL RESULTS");
    },
  );
});

describe("Fix D — palette-driven polish (SSR presence)", () => {
  const IDS: AestheticId[] = ["dark-gold", "purple-butterfly", "pink-blossom", "pmpl-light"];

  it("standings logo plates use plateBg/plateRing; rank-1 ring uses accent", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 4, { logos: true, matchCount: 1 }));
      expect(html).toContain(p.plateBg);
      expect(html).toContain(p.plateRing);
      expect(html).toContain(`2px solid ${p.accent}`);
      expect(html).toContain("border-radius:50%");
    }
  });

  it("MVP medallions use metal fills for 1/2/3 and neutral plates for 4/5", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(
        h(MvpGraphic, {
          aestheticId: id,
          title: "SCRIM",
          subtitle: "TOP 5 FRAGGERS",
          organizer: null,
          entries: mvpEntries(),
        }),
      );
      expect(html).toContain(p.medalGold);
      expect(html).toContain(p.medalSilver);
      expect(html).toContain(p.medalBronze);
      expect(html).toContain(p.medalText);
      expect(html).toContain(p.plateBg);
      expect(html).toContain("border-radius:50%");
    }
  });

  it("announcement cells render rounded cards with logo plates", () => {
    for (const id of IDS) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(
        h(AnnouncementGraphic, {
          aestheticId: id,
          title: "SCRIM",
          subtitle: "PARTICIPATING TEAMS",
          organizer: null,
          teams: announceTeams(16),
        }),
      );
      expect(html).toContain(p.plateBg);
      expect(html).toContain(p.plateRing);
      expect(html).toContain("border-radius:16px");
      expect(html).toContain("border-radius:50%");
    }
  });

  it("no graphic hardcodes the legacy raw-logo render (plates always wrap logos)", () => {
    const html = renderToStaticMarkup(standings("dark-gold", "AFTER MATCH 1", 4, { logos: true }));
    // Every logo img carries the circular crop; the 44px plate precedes it.
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(img).toContain("border-radius:50%");
  });
});

describe("typography + rank-1 emphasis (both themes, SSR)", () => {
  it.each(["dark-gold", "purple-butterfly", "pink-blossom"] as AestheticId[])(
    "gradient %s draws uppercase, letter-spaced code labels",
    (id) => {
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 16));
      for (const label of ["RANK", "TEAM", "WWCD", "PP", "KP", "TOTAL"]) {
        expect(html).toContain(`>${label}<`);
      }
      expect(html).toMatch(/letter-spacing:0?\.08em/);
    },
  );

  it("pmpl-light draws no code labels (baked into the art)", () => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 1", 16, { matchCount: 1 }));
    expect(html).not.toContain(">RANK<");
    expect(html).not.toContain(">TEAM<");
  });

  it("rank-1 keeps its emphasis treatment in light and dark themes", () => {
    for (const id of ["pmpl-light", "dark-gold"] as AestheticId[]) {
      const p = getTemplate(id).palette;
      const html = renderToStaticMarkup(standings(id, "AFTER MATCH 1", 16, { matchCount: 1 }));
      expect(html).toContain(p.wwcdBg);
      expect(html).toContain(p.accent);
    }
  });
});

describe("row auto-fit at 16/19/25 teams (SSR)", () => {
  it.each([16, 19, 25])("pmpl-light renders %i teams on the auto-fit pitch", (n) => {
    const html = renderToStaticMarkup(standings("pmpl-light", "AFTER MATCH 6", n, { matchCount: 6 }));
    const st = getTemplate("pmpl-light").standings;
    const [leftCount] = splitRows(n);
    const pitch = effectivePitch(st.rowY0, st.rowPitch, st.columns[0].rowsBottom, leftCount);
    const lastTop = st.rowY0 + (leftCount - 1) * pitch;
    // The component uses the auto-fit pitch: the last left-column row sits
    // exactly on the computed top (the fixed 80px pitch would put 25-team
    // rows at top:1331px instead).
    expect(html).toContain(`top:${lastTop}px`);
    if (n === 25) expect(html).not.toContain("top:1331px");
    expect(html).toContain(`SQUAD ${n}`);
  });
});
