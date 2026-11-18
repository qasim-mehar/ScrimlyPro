import type { MvpEntry } from "@/lib/db/schema";
import type { TeamRow } from "@/lib/scoring";
import type { MvpBrushSpec, MvpEsportsSpec, MvpSpec, MvpParchmentSpec, MvpStartingFiveSpec, MvpSupercrossSpec, MvpSlatePillSpec } from "./types";

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

/** Pick the largest whole-pixel size that fits the measured name box.
 *  MvpGraphic paints brush names with `letterSpacing: 0.03em`; every glyph
 *  adds that much advance on top of the width estimate, so it must be
 *  budgeted here or long names still hit the ellipsis. */
export function fitMvpNameFontSize(name: string, spec: MvpBrushSpec): number {
  const em = (nameWidthEm(name) + name.length * 0.03) * 1.06; // 6% raster safety
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


/* -------------------------------------------------------------------------- */
/* Draft-parchment bars (dusk-amber) — PURE centring math.                     */
/* The five painted tan bars have slightly uneven measured pitches, so a       */
/* single average rowPitch would drift by ~2px by row 3. Instead the exact     */
/* measured bar centres are pinned in the spec and each two-line text block is */
/* placed symmetrically about its own centre: blockCenterY === barCenterY       */
/* by construction (zero drift, for every rank).                               */
/* -------------------------------------------------------------------------- */

/** Advance-width estimate in em plus the per-glyph letter-spacing budget of
 *  the athletic block face. Wide Arabic/CJK/fullwidth glyphs are never
 *  narrowed; the ellipsis remains the last-resort clip guard. */
export function parchmentNameWidthEm(name: string, letterSpacingEm = 0.12): number {
  let em = 0;
  for (const ch of name) {
    if (/\s/u.test(ch)) em += 0.28;
    else if (/[\p{Script=Arabic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\uFF01-\uFFEF]/u.test(ch)) em += 1.0;
    else if (/[iljt.,:'|·_ₛ≌]/u.test(ch)) em += 0.34;
    else if (/[A-Z0-9]/u.test(ch)) em += 0.66;
    else em += 0.62;
  }
  return Math.max(1, em + [...name].length * letterSpacingEm);
}

/** Read the numeric em value from a CSS letter-spacing token (e.g. "0.16em"). */
function letterSpacingEm(token: string): number {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))em$/i.exec(token.trim());
  return match ? Number(match[1]) : 0;
}

/** Largest whole-pixel IGN size that fits the open parchment text zone.
 *  The tracking budget comes from the spec itself so tuning `letterSpacing`
 *  never silently invalidates the fit. */
export function fitParchmentNameFontSize(name: string, spec: MvpParchmentSpec): number {
  const em = parchmentNameWidthEm(name, letterSpacingEm(spec.name.letterSpacing));
  const fitted = Math.floor(spec.textWidth / em);
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}

/** Largest subline size that keeps `RANK 0X / NN KILLS` fully visible. The
 *  nominal size is the spec's ratio of the fitted IGN size (52–55% intent);
 *  wide 0.16em tracking makes long kill labels ~13em, so the width cap steps
 *  it down rather than letting CSS ellipsis hide the kill count. */
export function fitParchmentSublineFontSize(text: string, nameFontSize: number, spec: MvpParchmentSpec): number {
  const em = parchmentNameWidthEm(text, letterSpacingEm(spec.subline.letterSpacing));
  const nominal = Math.round(nameFontSize * spec.subline.ratio);
  const fitted = Math.floor(spec.textWidth / em);
  return Math.max(10, Math.min(nominal, fitted));
}

export type ParchmentRowSlots = {
  barTop: number;
  barBottom: number;
  barCenterY: number;
  fontSize: number;
  name: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  subline: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  blockTop: number;
  blockBottom: number;
  blockCenterY: number;
};

/** Deterministic rank/kills subline text (RANK 01 / 18 KILLS, singular KILL). */
export function parchmentSubline(entry: MvpDisplayEntry): string {
  return `RANK ${String(entry.rank).padStart(2, "0")} / ${mvpKillLabel(entry.kills)}`;
}

/** Row slots for one locked entry. `teamName` is deliberately ignored — the
 *  PUBG MOBILE branding, poster frame and character portraits are baked into
 *  the art, so no team data or synthetic header title is ever painted. */
export function duskMvpRowSlots(
  entry: MvpDisplayEntry,
  rowIndex: number,
  spec: MvpParchmentSpec,
): ParchmentRowSlots {
  const barCenterY = spec.barCenterYs[rowIndex] ?? spec.barCenterYs[spec.barCenterYs.length - 1] ?? 0;
  const barTop = barCenterY - spec.rowHeight / 2;
  const barBottom = barCenterY + spec.rowHeight / 2;

  const fontSize = fitParchmentNameFontSize(entry.name, spec);
  const subText = parchmentSubline(entry);
  const subFontSize = fitParchmentSublineFontSize(subText, fontSize, spec);
  const nameH = fontSize * spec.name.lineHeight;
  const subH = subFontSize * spec.subline.lineHeight;
  const blockH = nameH + spec.subline.gap + subH;
  const blockTop = barCenterY - blockH / 2;
  const blockBottom = blockTop + blockH;

  return {
    barTop,
    barBottom,
    barCenterY,
    fontSize,
    name: {
      x: spec.textLeft,
      y: blockTop,
      w: spec.textWidth,
      h: nameH,
      fontSize,
      text: entry.name,
    },
    subline: {
      x: spec.textLeft,
      y: blockTop + nameH + spec.subline.gap,
      w: spec.textWidth,
      h: subH,
      fontSize: subFontSize,
      text: subText,
    },
    blockTop,
    blockBottom,
    blockCenterY: (blockTop + blockBottom) / 2,
  };
}

/** Painted-bar tops for the locked top-5 list (falls back to nominal pitch
 *  beyond the five measured bars — never throws for a short/extra list). */
export function duskMvpRowTops(count: number, spec: MvpParchmentSpec): number[] {
  if (count <= 0) return [];
  const centers = spec.barCenterYs;
  const pitch = centers.length > 1 ? (centers[centers.length - 1]! - centers[0]!) / (centers.length - 1) : spec.rowHeight;
  return Array.from({ length: count }, (_, i) => {
    const center = centers[i] ?? (centers.at(-1) ?? 0) + (i - centers.length + 1) * pitch;
    return center - spec.rowHeight / 2;
  });
}


/* -------------------------------------------------------------------------- */
/* Right-aligned starting-five crimson lockup (cardinal-gold) — PURE math.      */
/* The art paints the five bars and the PUBGM characters; each locked entry    */
/* only supplies rank, IGN and kills. No team data, no scoring, no DOM.         */
/* -------------------------------------------------------------------------- */

/** Deterministic white kills line: "#1 • 18 KILLS" / "#1 • 1 KILL". */
export function startingFiveKillsLine(rank: number, kills: number): string {
  return `#${rank} • ${kills} ${kills === 1 ? "KILL" : "KILLS"}`;
}

/** Largest whole-pixel size that keeps a 2–30 char IGN inside the open right
 *  zone. Wide Arabic/CJK/fullwidth glyphs are never artificially narrowed; the
 *  component keeps an ellipsis as the last-resort clip guard. */
export function fitStartingFiveNameFontSize(
  name: string,
  spec: MvpStartingFiveSpec,
): number {
  const fitted = Math.floor(spec.textWidth / nameWidthEm(name));
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}

export type StartingFiveRowSlots = {
  top: number;
  height: number;
  centerY: number;
  textLeft: number;
  textWidth: number;
  killsText: string;
  nameText: string;
  nameFontSize: number;
};

/**
 * One locked entry seated on its measured painted crimson bar. `barBottoms`
 * (not a nominal pitch) is authoritative: the row box spans exactly the
 * painted bar, so the stacked-text midpoint is the bar's exact pixel centre —
 * zero cumulative drift through all five bars. `teamName` is deliberately
 * ignored — the characters are baked into the art, so no team data is painted.
 */
export function startingFiveRowSlots(
  entry: MvpDisplayEntry,
  index: number,
  spec: MvpStartingFiveSpec,
): StartingFiveRowSlots {
  // Defensive fallback keeps a partial spec from producing NaN rows; the
  // registered cardinal-gold config always supplies both arrays.
  const top = spec.barTops[index] ?? spec.rowY0 + index * spec.rowPitch;
  const bottom = spec.barBottoms[index] ?? top + spec.rowHeight;
  return {
    top,
    height: bottom - top,
    centerY: (top + bottom) / 2,
    textLeft: spec.textLeft,
    textWidth: spec.textWidth,
    killsText: startingFiveKillsLine(entry.rank, entry.kills),
    nameText: entry.name, // verbatim — glyph torture names are never normalized
    nameFontSize: fitStartingFiveNameFontSize(entry.name, spec),
  };
}


/* -------------------------------------------------------------------------- */
/* Apex Blaze single-line motorsport lockup (apex-blaze) — PURE layout math.    */
/* The art bakes the orange P# / prefixes, the header and the divider rules.    */
/* Only the five locked entries' IGN + kills are painted, dead-centred on the   */
/* measured glyph band of each baked prefix. No team data, no scoring.         */
/* -------------------------------------------------------------------------- */

/** Largest whole-pixel size that keeps a 2–30 char uppercase IGN inside the
 *  name box (the kills readout reserves `reserveWidth` on the right). The 4%
 *  headroom covers the 0.04em tracking used by the renderer; wide glyphs are
 *  never artificially narrowed and the component keeps an ellipsis guard. */
export function fitSupercrossNameFontSize(name: string, spec: MvpSupercrossSpec): number {
  const available = spec.textWidth - spec.kills.reserveWidth - spec.nameGap;
  const fitted = Math.floor(available / (nameWidthEm(name) * 1.04));
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}

/** Exact row tops for the single-line rows: rowTop + rowHeight/2 equals the
 *  measured orange P# / glyph midpoint for every baked row (zero Y drift).
 *  Rows beyond the baked five extend at the nominal pitch — never compressed. */
export function supercrossMvpRowTops(count: number, spec: MvpSupercrossSpec): number[] {
  if (count <= 0 || spec.rowCenterYs.length === 0) return [];
  const last = spec.rowCenterYs.length - 1;
  const lastCenter = spec.rowCenterYs[last]!;
  return Array.from({ length: count }, (_, i) => {
    const center = spec.rowCenterYs[i] ?? lastCenter + (i - last) * spec.rowPitch;
    return center - spec.rowHeight / 2;
  });
}

export type SupercrossRowSlots = {
  name: { x: number; y: number; w: number; h: number; fontSize: number; text: string };
  kills: { x: number; y: number; w: number; h: number; text: string };
};

/** Row slots for one locked entry. `teamName` is deliberately ignored — every
 *  non-IGN field is baked into the art. The kills readout is right-aligned on
 *  the divider's right edge; the name occupies the remaining measured span. */
export function supercrossMvpRowSlots(
  entry: MvpDisplayEntry,
  rowTop: number,
  spec: MvpSupercrossSpec,
): SupercrossRowSlots {
  return {
    name: {
      x: spec.textLeft,
      y: rowTop,
      w: Math.max(40, spec.textWidth - spec.kills.reserveWidth - spec.nameGap),
      h: spec.rowHeight,
      fontSize: fitSupercrossNameFontSize(entry.name, spec),
      text: entry.name, // verbatim — glyph torture names are never normalized
    },
    kills: {
      x: spec.textRight - spec.kills.reserveWidth,
      y: rowTop,
      w: spec.kills.reserveWidth,
      h: spec.rowHeight,
      text: `${entry.kills} ${entry.kills === 1 ? spec.kills.singular : spec.kills.plural}`,
    },
  };
}


/* -------------------------------------------------------------------------- */
/* Starting-five slate pills (urban-slate) — PURE layout math only.             */
/* The art paints the five off-white bars and the PUBGM characters; the locked  */
/* entries only supply the IGN and the kills. No team data, no scoring.         */
/* -------------------------------------------------------------------------- */

/** Two-part reference lockup: a light condensed leading token followed by the
 *  ultra-bold primary token ("TEAM SAMI", "JAYLIN SELLERS"). Handles the common
 *  whitespace/clan-tag/pipe separators; glyph-torture IGNs with no clean split
 *  stay a single all-bold token (never normalized or stripped). */
export type SlateNameParts = { lead: string; main: string; hasSplit: boolean };

export function slateNameParts(name: string): SlateNameParts {
  const s = name.trim();
  // The original separator is kept on `lead` so the rendered text content is
  // byte-for-byte the locked IGN — only the weight changes across the split.
  const bracket = /^(\[[^\]]+\])(\s*)([\s\S]+)$/.exec(s);
  if (bracket) return { lead: bracket[1]! + bracket[2]!, main: bracket[3]!, hasSplit: true };
  const space = /^(\S+)(\s+)([\s\S]+)$/.exec(s);
  if (space) return { lead: space[1]! + space[2]!, main: space[3]!, hasSplit: true };
  const pipe = /^([^|·｜]+)([|·｜])(\s*)([\s\S]+)$/.exec(s);
  if (pipe) return { lead: pipe[1]! + pipe[2]! + pipe[3]!, main: pipe[4]!, hasSplit: true };
  return { lead: "", main: s, hasSplit: false };
}

/** Advance-width estimate in em for the tall condensed Rajdhani face. Latin
 *  caps are narrow; Arabic/CJK/fullwidth glyphs are never artificially shrunk.
 *  Used only to pick a font size — the component keeps an ellipsis as the
 *  last-resort clip guard. */
function slateNameWidthEm(name: string): number {
  let em = 0;
  for (const ch of name) {
    if (/\s/u.test(ch)) em += 0.28;
    else if (/[\p{Script=Arabic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\uFF01-\uFFEF]/u.test(ch)) em += 1;
    else if (/[iljt.,:'|·_ₛ≌]/u.test(ch)) em += 0.32;
    else if (/[A-Z0-9]/u.test(ch)) em += 0.52; // Rajdhani condensed cap
    else em += 0.5;
  }
  return Math.max(1, em);
}

/** Largest whole-pixel size that keeps a 2–30 char IGN inside the open white
 *  zone (base 40px → floor 26px for very long names). */
export function fitSlateNameFontSize(name: string, spec: MvpSlatePillSpec): number {
  const fitted = Math.floor(spec.textWidth / slateNameWidthEm(name));
  return Math.min(spec.name.maxFontSize, Math.max(spec.name.minFontSize, fitted));
}
