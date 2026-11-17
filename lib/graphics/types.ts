export type AestheticId =
  | "dark-gold"
  | "purple-butterfly"
  | "pink-blossom"
  | "pmpl-light"
  | "neon-green"
  | "challengers-red"
  | "ewc-yellow"
  | "onyx-green"
  | "pmgc-crimson";

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

export type Background =
  | { type: "gradient"; css: string; decor: DecorShape[] }
  | { type: "image"; src: string }; // future real PNG templates — config-only swap

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
  subtitleMode?: "full" | "matchNumber"; // matchNumber → subtitle slot renders only the digits
  hideScrimName?: boolean; // true → renderers skip the scrim-name (title) slot
  // entirely (neon-green: the art's title band is intentionally blank)
  variantHideScrimName?: Partial<Record<GraphicVariant, boolean>>; // per-variant
  // override of hideScrimName (challengers-red: the standings art bakes its
  // own title, but the MVP art still wants the session name)
  uniformMvpRows?: boolean; // true → MvpGraphic renders all 5 rows identically:
  // neutral plates, text ink, no rank-1 accent, no metal medallions (P7)
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
