import type { MvpEntry } from "@/lib/db/schema";
import type { TeamRow } from "@/lib/scoring";
import type { MvpBrushSpec, MvpEsportsSpec, MvpSpec } from "./types";

export const MVP_SUBTITLE = "TOP 5 FRAGGERS";

export type MvpDisplayEntry = {
  rank: number;
  name: string;
  teamName: string;
  kills: number;
};

/**
 * Join locked MVP entries with team names. ORDER PRESERVED: the locked list
 * is the sole authority (ERD §5 iron rule 2) — never re-sorted, never
 * sliced. Unknown teamId → throw naming it (fail loud, same doctrine as
 * computeStandings). Empty entries → [] (the graphic then renders header +
 * watermark only).
 */
export function toMvpDisplay(
  entries: ReadonlyArray<MvpEntry>,
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name">>,
): MvpDisplayEntry[] {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  return entries.map((entry) => {
    const teamName = teamNames.get(entry.teamId);
    if (teamName === undefined) {
      throw new Error(`toMvpDisplay: entry references unknown teamId "${entry.teamId}"`);
    }
    return { rank: entry.rank, name: entry.name, teamName, kills: entry.kills };
  });
}

/* -------------------------------------------------------------------------- */
/* Starting-five brush lockup (grunge-red) — PURE layout math only.            */
/* No DOM, no measurement, no data access: the component just paints slots.    */
/* -------------------------------------------------------------------------- */

/** "1 KILL" is singular; every other count (including 0) is plural. */
export function mvpKillLabel(kills: number): string {
  return `${kills} KILL${kills === 1 ? "" : "S"}`;
}

/**
 * Conservative advance-width estimate in em. Latin/digits ~0.6, spaces 0.28,
 * fullwidth/CJK/katakana/Arabic/glyphs ~1.0 — the latter never get artificially
 * narrowed. Used only to pick a font size; the component keeps an ellipsis as
 * the last-resort clip guard.
 */
function nameWidthEm(name: string): number {
  let em = 0;
  for (const ch of name) {
    if (/\s/u.test(ch)) em += 0.28;
    else if (/[\p{Script=Arabic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\uFF01-\uFFEF]/u.test(ch)) em += 1;
    else if (/[iljt.,:'|·]/u.test(ch)) em += 0.3;
    else if (/[A-Z0-9]/u.test(ch)) em += 0.66;
    else em += 0.6;
  }
  return Math.max(1, em);
}

/** Pick the largest whole-pixel size that fits the measured name box. */
export function fitMvpNameFontSize(name: string, spec: MvpBrushSpec): number {
  const em = nameWidthEm(name);
  const fitted = Math.floor(spec.name.w / em);
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}

export type GrungeRowSlots = {
  badge: { x: number; y: number; w: number; h: number; text: string };
  name: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  kills: { x: number; y: number; w: number; h: number; text: string };
  watermark: { x: number; y: number; w: number; h: number; text: string };
};

/**
 * Row layout for one locked entry. `teamName` is deliberately ignored: the
 * PUBGM characters are baked into the art, so no team data is ever painted.
 * Name and kills overlap by ~18% of the name box (brush strokes cut across the
 * white block letters, matching the reference lockup).
 */
export function grungeMvpRowSlots(
  entry: MvpDisplayEntry,
  rowTop: number,
  spec: MvpBrushSpec,
): GrungeRowSlots {
  const badgeH = 48;
  const nameH = 96;
  const killsH = 64;
  const overlap = Math.round(nameH * 0.18);
  return {
    badge: {
      x: spec.badge.x,
      y: rowTop + (spec.rowHeight - badgeH) / 2,
      w: spec.badge.w,
      h: badgeH,
      text: `#${entry.rank} FRAGGER`,
    },
    name: {
      x: spec.name.x,
      y: rowTop + 36,
      w: spec.name.w,
      h: nameH,
      fontSize: fitMvpNameFontSize(entry.name, spec),
      text: entry.name,
    },
    kills: {
      x: spec.kills.x,
      y: rowTop + 36 + nameH - overlap,
      w: spec.kills.w,
      h: killsH,
      text: mvpKillLabel(entry.kills),
    },
    watermark: {
      x: spec.watermark.x,
      y: rowTop + (spec.rowHeight - 152 * 0.82) / 2,
      w: spec.watermark.w,
      h: 152 * 0.82,
      text: String(entry.kills),
    },
  };
}

/** Fixed-pitch row tops — never stretch rows off the painted bars. */
export function fixedMvpRowTops(count: number, spec: MvpSpec): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => spec.rowY0 + i * spec.rowPitch);
}

/* -------------------------------------------------------------------------- */
/* English-only esports card lockup (esports-clash) — PURE layout math.         */
/* The art paints the red/blue cards and the PUBGM characters; the five locked  */
/* entries only supply rank, name and kills. No team data, no scoring.          */
/* -------------------------------------------------------------------------- */

/** Advance-width estimate in em for the heavy italic display face. Wide
 *  Arabic/CJK/fullwidth glyphs are never narrowed; the skew margin is covered
 *  by the safe zone's unused right-hand buffer. */
function esportsNameWidthEm(name: string): number {
  let em = 0;
  for (const ch of name) {
    if (/\s/u.test(ch)) em += 0.3;
    else if (/[\p{Script=Arabic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\uFF01-\uFFEF]/u.test(ch)) em += 1.05;
    else if (/[iljt.,:'|·_ₛ≌]/u.test(ch)) em += 0.34;
    else if (/[A-Z0-9]/u.test(ch)) em += 0.7;
    else em += 0.64;
  }
  return Math.max(1, em);
}

/** Largest whole-pixel size that keeps a 2–24+ char IGN inside the left zone. */
export function fitEsportsNameFontSize(
  name: string,
  spec: MvpEsportsSpec,
): number {
  const fitted = Math.floor(spec.name.w / esportsNameWidthEm(name));
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}

export type EsportsRowSlots = {
  rank: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  name: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  statLabel: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  kills: { x: number; y: number; w: number; h: number; fontSize: number; glow: string; text: string };
};

/** Row slots for one locked entry. `teamName` is deliberately ignored — the
 *  PUBGM characters are baked into the art, so no team data is ever painted.
 *  `cardIndex` picks the red/blue kill glow (cards alternate from the top). */
export function esportsMvpRowSlots(
  entry: MvpDisplayEntry,
  rowTop: number,
  spec: MvpEsportsSpec,
  cardIndex: number,
): EsportsRowSlots {
  return {
    rank: {
      x: spec.rank.x,
      y: rowTop + spec.rank.y,
      w: spec.rank.w,
      h: 24,
      fontSize: spec.rank.fontSize,
      text: `RANK #${String(entry.rank).padStart(2, "0")}`,
    },
    name: {
      x: spec.name.x,
      y: rowTop + spec.name.y,
      w: spec.name.w,
      h: 68,
      fontSize: fitEsportsNameFontSize(entry.name, spec),
      text: entry.name, // verbatim — glyph torture names are never normalized
    },
    statLabel: {
      x: spec.statLabel.x,
      y: rowTop + spec.statLabel.y,
      w: spec.statLabel.w,
      h: 20,
      fontSize: spec.statLabel.fontSize,
      text: spec.statLabel.text,
    },
    kills: {
      x: spec.kills.x,
      y: rowTop + spec.kills.y,
      w: spec.kills.w,
      h: 52,
      fontSize: spec.kills.fontSize,
      glow: spec.kills.glow[((cardIndex % 2) + 2) % 2]!,
      text: String(entry.kills),
    },
  };
}
