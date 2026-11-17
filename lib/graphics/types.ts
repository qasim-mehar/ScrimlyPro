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
  | "rundown-orange";

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
  nameFont: string;
  statFont: string;
  labelFont: string;
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
  esports?: MvpEsportsSpec; // esports-clash English-only card lockup
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

  // --- Art-backed single-column geometry (rundown-orange) ---
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
  mvpLayoutStyle?: "standard" | "starting-five-brush" | "esports-card"; // starting-five-brush
  // → framed rank badge + block-white name + overlapping crimson brush kills
  // + giant ghost numeral; the PUBGM characters are baked into the art.
  // esports-clash → italic rank + heavy slanted white name + English kills
  // block in the left safe zone of each painted red/blue card.
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
  palette: Palette;
};
