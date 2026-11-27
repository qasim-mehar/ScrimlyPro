export type AestheticId =
  | "dark-gold"
  | "purple-butterfly"
  | "pink-blossom"
  | "pmpl-light"
  | "neon-green"
  | "challengers-red"
  | "ewc-yellow"
  | "onyx-green"
  | "pmgc-crimson"
  | "pmgc-aqua"
  | "pmwi-violet"
  | "grunge-red"
  | "esports-clash"
  | "dusk-amber"
  | "cardinal-gold"
  | "apex-blaze"
  | "urban-slate"
  | "rundown-orange"
  | "royal-blue"
  | "varsity-yellow"
  | "court-orange"
  | "varsity-purple"
  | "varsity-orange"
  | "pmsl-cobalt"
  | "ewc-teal"
  | "pmgo-teal";

/** Slot coordinates are TOP-LEFT of the text box, in canvas px. */
export type Slot = {
  x: number;
  y: number;
  w?: number;
  align?: "left" | "center" | "right";
};

export type DecorShape = {
  kind: "circle" | "bar";
  x: number;
  y: number;
  w: number; // circle: diameter; bar: width
  h?: number; // bar: height
  color: string;
  opacity?: number;
};

/** Uniformly pre-scaled image box (canvas px). Used when the art's native
 *  ratio differs from the 2:3 canvas: width/height MUST keep the art ratio
 *  (no distortion); left/top position the art so its painted slots land on
 *  the config's measured coordinates. */
export type ImageFit = { width: number; height: number; left: number; top: number };

export type Background =
  | { type: "gradient"; css: string; decor: DecorShape[] }
  | { type: "image"; src: string; fit?: ImageFit }; // art swap; `fit` keeps portrait art distortion-free

export type StatColumnKey = "wwcd" | "matches" | "pp" | "kp" | "total";

/** One stat value box: left edge of the table's centered value box (see
 * `StandingsTableSpec.statBoxW` for its width). Array order is render order. */
export type StatColumn = { key: StatColumnKey; x: number };

export type StandingsColumnSpec = {
  rankX: number; // left edge of rank box (48 wide, centered text)
  teamX: number; // left edge of name (logo renders AT teamX when present, name shifts +52)
  teamW: number; // max name width before CSS ellipsis
  statColumns: StatColumn[]; // ordered per-template columns (each stat box is
  // `standings.statBoxW` wide, centered; default 58)
  stripX: number; // row background strip
  stripW: number;
  rowsBottom?: number; // bottom edge of this column's table area — when set,
  // rows auto-fit: pitch = (rowsBottom − rowY0) / rowsInColumn (P4)
  ranksBakedIn?: boolean; // true → art bakes the 1–24 rank numerals; draw no rank
  rowsPerColumn?: number; // fixed left-column capacity (team N+1 starts right)
  fixedRowPitch?: boolean; // true → ignore rowsBottom and use rowPitch verbatim
};

export type StandingsTableSpec = {
  columns: [StandingsColumnSpec, StandingsColumnSpec];
  headerLabelsY: number; // top edge of RANK/TEAM/... label row
  rowY0: number; // TOP edge of first data row
  rowPitch: number;
  rowHeight: number;
  maxRowsLeft: number;
  singleColumn?: boolean; // true → one full-width table (neon-green art):
  // OverallStandingsGraphic renders columns[0] with ALL rows and skips
  // columns[1]; splitRows/maxRowsLeft do not apply.
  rankBoxW?: number; // width of the centered rank value box (default 48)
  statBoxW?: number; // width of each centered stat value box (default 58;
  // ewc-yellow's five baked header slots need 46 to stay non-overlapping)
  logoPlate?: number; // logo plate diameter (default 44)
  logoNameGap?: number; // logo → name offset inside teamW (default 52)
  ranksBakedIn?: boolean; // table-wide default for StandingsColumnSpec.ranksBakedIn
  rowsPerColumn?: number; // table-wide default left-column capacity
  fixedRowPitch?: boolean; // table-wide default for StandingsColumnSpec.fixedRowPitch
  uniformStatInk?: boolean; // true → every stat value (including rank-1 TOTAL)
  // uses palette.text; art tables whose baked rank badge already supplies the
  // rank-1 emphasis keep all numerals in pure white (pmgc-crimson)
  uniformRowInk?: boolean; // true → rank 1 is rendered exactly like every
  // other row (no accent ink, strip or plate ring) — challengers-red's art
  // bakes its own emphasis and wants no red text anywhere in the table
  nameFont: string;
  statFont: string;
  labelFont: string;
  nameLetterSpacing?: string; // art-backed wide-tracked names (varsity-purple
  // 0.16em); the renderer keeps its legacy -0.01em when absent
  nameUppercase?: boolean; // true → uppercase team names on the art-backed
  // broadcast table (varsity-purple's reference schedule typography)

  /** Dual baked header pills (pmsl-cobalt): the art prints two empty coloured
   *  boxes above the table — the left blue one holds the session name, the
   *  right yellow one the stage/subtitle. Pure coordinate + ink data; the
   *  renderer seats each string dead-centre in its measured box. Absent on
   *  every other template, so their header markup is unchanged. */
  headerPills?: {
    left: HeaderPillSpec;
    right: HeaderPillSpec;
  };
};

/** One header-pill ink slot. `box` is the pill's measured bounds (the renderer
 *  centres its text); `height` drives the line-height declared AFTER `font`. */
export type HeaderPillSpec = {
  box: Slot;
  height: number;
  font: string;
  color: string;
  text: "title" | "subtitle"; // which header prop supplies the string
};

/** Starting-five brush lockup (grunge-red): measured slot geometry plus the
 *  exact ink/font tokens. Pure data — `lib/graphics/mvp.ts` turns it into
 *  layout slots; MvpGraphic only renders those slots. */
export type MvpBrushSpec = {
  rowHeight: number;
  badge: {
    x: number;
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    rule: string;
  };
  name: {
    x: number;
    w: number;
    maxFontSize: number;
    minFontSize: number;
    fontFamily: string;
    fontWeight: number;
    color: string;
  };
  kills: {
    x: number;
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
  watermark: {
    x: number;
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
};

/** English-only esports card lockup (esports-clash). Measured canvas slots and
 *  exact ink/font tokens. Pure data — `lib/graphics/mvp.ts` derives the row
 *  slots; `MvpGraphic` only paints them. No team/avatar fields by design. */
export type MvpEsportsSpec = {
  rowHeight: number;
  rank: {
    x: number;
    y: number; // offset from the painted card top
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
  name: {
    x: number;
    y: number;
    w: number;
    maxFontSize: number;
    minFontSize: number;
    fontFamily: string;
    fontWeight: number;
    color: string;
  };
  statLabel: {
    x: number;
    y: number;
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    text: string;
  };
  kills: {
    x: number;
    y: number;
    w: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    glow: readonly [string, string]; // red card / blue card tint
  };
};

/** Art-backed "draft parchment bar" lockup (dusk-amber). Pure measured data:
 *  the five painted tan bars' canvas-space vertical CENTRES plus one shared
 *  right-aligned text axis in the open parchment zone. `lib/graphics/mvp.ts`
 *  turns it into two-line row slots whose combined midpoint is, by
 *  construction, the painted bar's centre for every rank (zero Y drift). */
export type MvpParchmentSpec = {
  rowHeight: number; // text container height, strictly inside each painted bar
  barCenterYs: readonly number[]; // exact measured bar centres on the 1080×1620 canvas
  textLeft: number; // left edge of the shared right-aligned text box
  textWidth: number; // right edge = textLeft + textWidth (clears all 5 portraits)
  name: {
    fontFamily: string;
    fontWeight: number;
    maxFontSize: number;
    minFontSize: number;
    color: string; // espresso ink on the warm tan bar
    letterSpacing: string;
    lineHeight: number; // unitless multiplier; declared AFTER `font` in CSS
    textShadow: string; // subtle vintage dual-tone print shadow
  };
  subline: {
    fontFamily: string;
    fontWeight: number;
    ratio: number; // subline font size / name font size (~0.53)
    color: string;
    letterSpacing: string;
    lineHeight: number;
    gap: number; // px between line 1 and line 2
  };
};


/** Measured 1080×1620 canvas geometry for the cardinal-gold "STARTING FIVE"
  *  art: five painted crimson bars, each with an open right-hand text zone.
  *  Pure data — `lib/graphics/mvp.ts` derives the row boxes, `MvpGraphic` only
  *  paints them. `barTops`/`barBottoms` hold the exact measured boundaries so
  *  row i spans bar i and its stacked-text midpoint is that bar's exact
  *  pixel centre (zero cumulative pitch drift across the five bars). */
export type MvpStartingFiveSpec = {
  rowHeight: number; // nominal bar height (canvas px)
  rowY0: number; // nominal first bar top
  rowPitch: number; // nominal bar pitch (config consumers only)
  barTops: readonly number[]; // exact measured painted-bar tops (canvas px)
  barBottoms: readonly number[]; // exact measured painted-bar bottoms (canvas px)
  textLeft: number; // left edge of the open crimson right-hand text zone
  textWidth: number; // its width; right edge must stay inside the painted bar
  kills: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: string;
    lineHeight: string;
    color: string; // crisp white
  };
  name: {
    fontFamily: string;
    maxFontSize: number;
    minFontSize: number;
    fontWeight: number;
    letterSpacing: string;
    lineHeight: string;
    color: string; // warm varsity gold
  };
};


/** Apex Blaze — the Supercross "TOP 5 /// FINISHES" single-line row lockup.
 *  Pure measured data: the exact canvas Y centres of the five baked orange
 *  P# / glyph bands (authoritative — the art's pitch is NOT uniform), plus the
 *  horizontal span from just right of the baked slash to the right end of the
 *  black divider rules. `lib/graphics/mvp.ts` derives row slots; the renderer
 *  only paints them. */
export type MvpSupercrossSpec = {
  rowHeight: number;
  rowCenterYs: readonly number[]; // exact measured glyph-band midpoints (canvas px)
  rowPitch: number; // nominal fallback pitch for rows beyond the baked five
  textLeft: number; // strictly right of every baked orange slash (max slashRightX)
  textRight: number; // right end of the baked horizontal divider rules
  textWidth: number; // textRight - textLeft
  nameGap: number; // minimum gap between the IGN box and the kills readout
  name: {
    maxFontSize: number;
    minFontSize: number;
    fontFamily: string;
    fontWeight: number; // heavy surname / surname-only names (800)
    softWeight: number; // medium first name in the reference poster (500)
    color: string; // track-black ink on the white textured card
    tracking: string;
  };
  kills: {
    fontFamily: string;
    numberFontSize: number;
    unitFontSize: number;
    numberFontWeight: number; // 800
    unitFontWeight: number; // 500
    color: string;
    tracking: string;
    reserveWidth: number; // right-aligned box reserved for "NN KILLS"
    singular: string;
    plural: string;
  };
};


/** One painted off-white rounded bar baked into urban-slate's mvp.png, mapped
 *  onto the 1080×1620 canvas through the uniform `Background.fit`. `centerY`
 *  is exactly `top + height / 2` — the two-line text stack is locked to this
 *  box so its vertical midpoint lands dead-on the bar's measured midline. */
export type MvpSlateBar = {
  top: number;
  height: number;
  centerY: number;
};

/** Urban Slate — five rounded off-white bars (monochrome PUBGM character on
 *  the left, open white zone on the right). Pure data: every coordinate and
 *  ink/font token is measured off the art; `MvpGraphic` only paints the two
 *  centered text lines. No team data, logos or avatars (mvpShowTeam: false). */
export type MvpSlatePillSpec = {
  bars: readonly [MvpSlateBar, MvpSlateBar, MvpSlateBar, MvpSlateBar, MvpSlateBar];
  textLeft: number; // canvas x of the open zone, right of the portrait/scope
  textWidth: number; // width of that open zone (right inner edge − margin)
  name: {
    fontFamily: string; // Rajdhani-first condensed athletic stack
    maxFontSize: number;
    minFontSize: number;
    lightWeight: number; // leading token (e.g. "TEAM" in "TEAM SAMI")
    boldWeight: number; // primary token / whole single-token IGN
    color: string;
  };
  kills: {
    fontFamily: string; // Exo 2-first geometric stack
    fontSize: number;
    fontWeight: number;
    color: string;
    letterSpacing: string;
  };
};


export type MvpSpec = {
  rowY0: number;
  rowPitch: number;
  rowHeight: number;
  rankX: number;
  playerX: number;
  playerW: number;
  teamX: number;
  teamW: number;
  killsX: number;
  killsW: number;
  rankFont: string;
  playerFont: string;
  statFont: string;
  subtitleBakedIn?: boolean; // true → art bakes the subtitle (challengers-red
  // "TOP 5 FRAGGERS"): MvpGraphic draws no subtitle line.
  brush?: MvpBrushSpec; // grunge-red starting-five brush typography
  esports?: MvpEsportsSpec;  slatePills?: MvpSlatePillSpec; // urban-slate rounded off-white bar lockup
  supercross?: MvpSupercrossSpec; // apex-blaze single-line motorsport rows
  startingFive?: MvpStartingFiveSpec; // cardinal-gold right-aligned white/gold
  // stacked lockup inside five painted crimson bars
  parchment?: MvpParchmentSpec; // dusk-amber five painted parchment bars
 // esports-clash English-only card lockup
  paperBanner?: MvpPaperBannerSpec; // court-orange paper-cutout banner lockup
};

/** Court Orange — five stacked paper-cutout banners (cream / marigold strips
 *  with burnt-orange rank squares) baked into mvp.png. Pure data: the exact
 *  painted midlines come from `bannerCenterYs`, and `MvpGraphic` centres every
 *  rank badge + player-name/kills box on them with flex + `line-height: 1`.
 *  No team data, logos or avatars are ever rendered (mvpShowTeam: false). */
export type MvpPaperBannerSpec = {
  rowHeight: number; // flex box height — one per painted banner strip
  bannerCenterYs: readonly [number, number, number, number, number]; // measured canvas midlines
  paddingX: number; // inner padding of the paper strip (~28px)
  killsGap: number; // gap between the kill numeral and the KILLS label
  badge: {
    x: number; // left edge of the painted orange square
    w: number; // width of the painted orange square
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
  name: {
    x: number; // left edge of the painted paper strip
    w: number; // width of the painted paper strip
    maxFontSize: number;
    minFontSize: number;
    fontFamily: string;
    fontWeight: number;
    color: string;
  };
  kills: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string; // dark charcoal kill numeral
    labelFontFamily: string;
    labelFontSize: number;
    labelFontWeight: number;
    labelColor: string; // deep crimson "KILLS" label
    labelText: string;
  };
};

export type AnnouncementSpec = {
  rowsTop: number; // y of first row (top of list area)
  rowsBottom: number; // y of last row (bottom of list area)
  slotX: number; // left edge of the slot-number box (e.g. "01")
  slotW: number; // width of the slot-number box
  logoX: number; // left edge of the logo plate
  teamX: number; // left edge of the team name
  teamW: number; // max team-name width before CSS ellipsis
  logoSize: number; // square logo plate size
  rowHeight: number; // base row height (auto-fit stretches pitch)
  slotFont: string; // font for slot numbers ("01".."25")
  nameFont: string; // font for team names
  subtitleBakedIn?: boolean; // true → art bakes the subtitle (pmpl-light
  // "PARTICIPATING TEAMS"): AnnouncementGraphic draws no subtitle line.

  // --- Art-backed single-column geometry (rundown-orange; onyx-green uses the
  // template-level `announcementLayout` override on TemplateConfig) ---
  // These optional fields are additive: every existing template keeps the
  // auto-fit P6 behaviour below. They exist so an art-backed announcement can
  // lock EVERY row to a baked divider line regardless of team count (1–24).
  singleColumn?: boolean; // one full-width band column; rows never split
  fixedRowPitch?: boolean; // true → rows use the art's measured lines verbatim
  rowY0?: number; // canvas y of the first baked divider (= row 0 top)
  rowPitch?: number; // nominal pitch between baked dividers (canvas px)
  rowsPerColumn?: number; // number of row bands baked into the art (24)
  leftX?: number; // canvas x of the baked lines' left edge (212)
  rightX?: number; // canvas x of the baked lines' right edge (868)
  colWidth?: number; // full single-column width (rightX − leftX = 656)
  lineYs?: readonly number[]; // exact measured divider centres (zero drift)
  rankFont?: string; // slot '#' font (prompt vocabulary; alias of slotFont)
  inkColor?: string; // slot + name ink (pure white on the orange art)
  accentColor?: string;
  mutedColor?: string;
  cardBg?: string; // transparent → baked dividers/gradient stay unobstructed
  tracking?: string; // optional letter-spacing override for the single-column
  // spans (varsity-yellow's 0.05em athletic tracking); the renderer keeps its
  // existing 0.06em default when absent, so onyx-green / rundown-orange are
  // pixel-identical.
  uppercaseNames?: boolean; // true → uppercase names on bar-backed art that
  // has no alternating `rowColors` (varsity-yellow); onyx-green keeps its
  // rowColors-driven uppercase unchanged.

  // --- Two-column art-backed badge/bar treatment (cardinal-gold) ---
  // Additive: absent on every existing template so their markup is unchanged.
  // The slot badge is a high-contrast matte-black cell; the name bar is a dark
  // cardinal plate that keeps white 800 glyphs legible over bright art ink.
  slotBadgeBg?: string;
  teamBarBg?: string;
  nameTextShadow?: string; // subtle legibility shadow for white names over art

  // --- varsity-purple painted-bar geometry (additive) ---
  // Exact measured vertical midpoints of the painted bars. When present with
  // fixedRowPitch, `announcementRowLayout` seats row i so its box midpoint IS
  // barCenters[i] — zero cumulative pitch drift, even when the art's spacing
  // is not perfectly uniform.
  barCenterYs?: readonly number[];
  barCells?: readonly [AnnouncementBarCell, AnnouncementBarCell, AnnouncementBarCell];
  overflowNameFont?: string; // narrower stacked right cell (varsity-purple)
  overflowTracking?: string; // lighter tracking there so names fit beside slots

  // --- Pipe-split two-column geometry (varsity-orange) ---------------------
  // On the baked "team Announcement" art each column is divided by a dashed
  // orange pipe: the TEAM NAME sits LEFT of it, the SLOT NUMBER RIGHT of it.
  // Additive — absent on every existing template so their markup is unchanged.
  slotPosition?: "left" | "right"; // default "left" (legacy: slot then name)
  // When "right", `leftX`/`rightX` are the measured PIPE x positions. The name
  // box is [pipe − pipeGap − teamW, pipe − pipeGap] (right-aligned) and the slot
  // box is [pipe + pipeGap, pipe + pipeGap + slotW] (left-aligned), so both ink
  // columns snug the pipe and long names ellipsize without crossing it.
  pipeGap?: number; // px between the pipe and each ink column (default 12)
};

/** One compartment of a painted 3-cell announcement bar (canvas px). */
export type AnnouncementBarCell = { x: number; w: number };

/** varsity-purple — the measured 13 painted 3-cell bars of announcement.png.
 *  Pure data: `lib/graphics/layout.ts` turns it into row slots and the renderer
 *  only paints them. `barCenterYs` is authoritative for Y centring; `rowY0` /
 *  `rowPitch` / `rowHeight` are the nominal values kept for config consumers.
 *  Teams 1..13 use the left slot cell + centre name cell; teams 14..25 reuse
 *  those same painted bars in the narrow right cell so EVERY team sits on a
 *  painted bar at any valid session count (4–25). */
export type AnnouncementBarLayout = {
  barCenterYs: readonly number[]; // exact measured bar midlines (canvas px)
  rowY0: number; // nominal first bar top (canvas px)
  rowPitch: number; // nominal bar pitch (canvas px)
  rowHeight: number; // painted bar interior height (canvas px)
  rowsBottom: number; // last painted bar bottom (canvas px)
  cells: readonly [AnnouncementBarCell, AnnouncementBarCell, AnnouncementBarCell];
};

/** One row slot derived from an AnnouncementBarLayout (pure data). */
export type AnnouncementBarRow = {
  bar: number; // zero-based painted bar index (0..12)
  kind: "primary" | "overflow"; // primary = left+centre cells, overflow = right cell
  y: number; // exact row-box top = barCenters[bar] − rowHeight / 2
  rowH: number;
  pitch: number;
};

/** Art-backed ANNOUNCEMENT-only geometry override. This lives at the
 *  TEMPLATE level (not inside `StandingsTableSpec`) so a single-column
 *  participation art can lock 24 rows to its baked divider lines without
 *  touching the 2-column standings geometry that
 *  `tests/onyx-standings.test.ts` pins on `TemplateConfig.standings`.
 *  Pure data — `effectiveAnnouncementSpec()` folds it into the renderer's
 *  announcement spec; no renderer contains business logic. */
export type AnnouncementLayout = {
  singleColumn?: boolean;
  fixedRowPitch?: boolean;
  rowsPerColumn?: number;
  leftX: number;
  rightX?: number;
  colWidth: number;
  rowY0: number;
  rowPitch: number;
  rowHeight: number;
  rowsBottom: number;
  slotColWidth?: number; // width of the left Slot '#' column (falls back to spec.slotW)
  rankFont?: string;
  nameFont?: string;
  rowColors?: [string, string]; // alternating row ink: [even rows, odd rows]
  lineYs?: readonly number[]; // exact measured divider centres (zero drift)
};

export type Palette = {
  accent: string;
  text: string;
  textMuted: string;
  rowAlt: string;
  rowAltOpacity: number;
  wwcdBg: string;
  wwcdText: string;
  watermarkColor: string; // per-theme watermark ink (position/text stay fixed brand law)
  plateBg: string; // circular logo-plate fill (standings rows, announcement cells)
  plateRing: string; // logo-plate hairline ring; rank-1 plates use accent instead
  medalGold: string; // MVP rank-1 medallion fill
  medalSilver: string; // MVP rank-2 medallion fill
  medalBronze: string; // MVP rank-3 medallion fill
  medalText: string; // MVP rank 1–3 medallion digit ink (large text)
};

export type GraphicVariant = "standings" | "mvp" | "announcement";

export type HeaderSpec = {
  title: Slot;
  subtitle: Slot;
  organizer: Slot;
  titleFont: string;
  subtitleFont: string;
  subtitleColor?: string; // optional per-variant ink override for the subtitle
  // (challengers-red standings: black digits inside the baked cyan MATCH chip)
  organizerFont: string;
  // Typographic ink tokens for art-backed athletic headers (varsity-purple).
  // Additive: every existing template keeps the renderer's previous defaults.
  titleLetterSpacing?: string;
  subtitleLetterSpacing?: string;
  titleTextShadow?: string;
  titleTextTransform?: "uppercase"; // athletic display lockups (cardinal-gold)
  subtitleTextTransform?: "uppercase";
};

export type TemplateConfig = {
  id: AestheticId;
  name: string;
  canvas: { w: number; h: number };
  backgrounds: {
    standings: Background;
    mvp: Background;
    announcement: Background;
  };
  labelsBakedIn?: boolean; // true → code draws NO label row (art has it)
  variantLabelsBakedIn?: Partial<Record<GraphicVariant, boolean>>; // per-variant
  // override (grunge-red: the MVP art bakes its own labels/header)
  subtitleMode?: "full" | "matchNumber"; // matchNumber → subtitle slot renders only the digits
  subtitleBakedIn?: Partial<Record<GraphicVariant, boolean>>; // per-variant: the art already
  // prints the subtitle LABEL (pmgc-aqua's baked "MATCH #"); the slot renders
  // only the digits. Mirrors variantLabelsBakedIn / variantHideScrimName.
  hideScrimName?: boolean; // true → renderers skip the scrim-name (title) slot
  // entirely (neon-green: the art's title band is intentionally blank)
  variantHideScrimName?: Partial<Record<GraphicVariant, boolean>>; // per-variant
  // override of hideScrimName (challengers-red: the standings art bakes its
  // own title, but the MVP art still wants the session name)
  uniformMvpRows?: boolean; // true → MvpGraphic renders all 5 rows identically:
  // neutral plates, text ink, no rank-1 accent, no metal medallions (P7)
  mvpLayoutStyle?: "standard" | "starting-five-brush" | "esports-card" | "paper-banner" | "draft-parchment-bars" | "starting-five-crimson" | "supercross-row-list" | "starting-five-slate-pills";
  // → framed rank badge + block-white name + overlapping crimson brush kills
  // + giant ghost numeral; the PUBGM characters are baked into the art.
  // esports-clash → italic rank + heavy slanted white name + English kills
  // block in the left safe zone of each painted red/blue card.
  // court-orange → five cream/marigold paper banners with burnt-orange rank
  // squares; tall condensed Rajdhani ink centred on each painted midline.
  mvpShowTeam?: boolean; // false → never render teamName/logo on the MVP art
  canvasBackground?: string; // fill behind a uniformly fitted portrait art when
  // its native ratio differs from the 2:3 canvas (letterbox bars, no distortion)
  watermarkYOffset?: number; // extra px added to the fixed brand-law watermark y
  // (announcement variant only; default 0). pmpl-light: drops the watermark
  // into the art's clear footer strip, below its border line (P7)
  header: HeaderSpec;
  variantHeaders?: Partial<Record<GraphicVariant, Partial<HeaderSpec>>>; // per-variant
  // header overrides, merged over `header` by headerFor() (pmpl-light
  // announcement: the scrim name sits in the art's top strip, not the
  // standings strip).
  standings: StandingsTableSpec;
  mvp: MvpSpec;
  announcement: AnnouncementSpec;
  announcementLayout?: AnnouncementLayout; // art-backed announcement override
  // (onyx-green's 24-row single-column participation art); Standings is untouched.
  announcementBarLayout?: AnnouncementBarLayout; // varsity-purple's measured
  // 13 painted 3-cell bars; pure geometry consumed by announcementBarRows().
  palette: Palette;
};
