export type AestheticId = "dark-gold" | "purple-butterfly" | "pink-blossom";

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

export type StatColumnKey = "wwcd" | "pp" | "kp" | "total";

export type StandingsColumnSpec = {
  rankX: number; // left edge of rank box (48 wide, centered text)
  teamX: number; // left edge of name (logo renders AT teamX when present, name shifts +52)
  teamW: number; // max name width before CSS ellipsis
  statsX: Record<StatColumnKey, number>; // left edges; each stat box 58 wide, centered
  stripX: number; // row background strip
  stripW: number;
};

export type StandingsTableSpec = {
  columns: [StandingsColumnSpec, StandingsColumnSpec];
  headerLabelsY: number; // top edge of RANK/TEAM/... label row
  rowY0: number; // TOP edge of first data row
  rowPitch: number;
  rowHeight: number;
  maxRowsLeft: number;
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
};

export type AnnouncementSpec = {
  y0: number;
  cellW: number;
  cellH: number;
  logoSize: number;
  nameFont: string;
};

export type Palette = {
  accent: string;
  text: string;
  textMuted: string;
  rowAlt: string;
  rowAltOpacity: number;
  wwcdBg: string;
  wwcdText: string;
};

export type TemplateConfig = {
  id: AestheticId;
  name: string;
  canvas: { w: number; h: number };
  background: Background;
  header: {
    title: Slot;
    subtitle: Slot;
    organizer: Slot;
    titleFont: string;
    subtitleFont: string;
    organizerFont: string;
  };
  standings: StandingsTableSpec;
  mvp: MvpSpec;
  announcement: AnnouncementSpec;
  palette: Palette;
};
