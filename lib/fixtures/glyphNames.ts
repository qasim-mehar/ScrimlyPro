/**
 * Sourced verbatim from the live OCR extraction on real WhatsApp-compressed
 * screenshots. The lone CJK sample 乡 is included because the C7.1a audit brief
 * names it as a glyph class to report (the live list itself carried 卍).
 *
 * These strings are the torture set for the C7.1a glyph audit: Rajdhani and
 * Noto Sans Symbols 2 cover neither Arabic, katakana, CJK, fullwidth forms nor
 * Greek, so those code points exercise the browser's system-font fallback — and
 * whether that fallback survives html-to-image's foreignObject export is
 * exactly what the audit measures. Do NOT "fix" or normalize these strings.
 */

/** 16 realistic organizer team names (~5 with non-Latin/symbol code points). */
export const GLYPH_TEAM_NAMES: string[] = [
  "TRB Gaming",
  "ínvaders",
  "533 Squad",
  "SNOW ツ",
  "KHΛN Esports",
  "Ahmad★ Gaming",
  "TF Squad",
  "4NM Esports",
  "Zero Degree Esports",
  "Karachi Snipers",
  "Lahore Lions",
  "Nova Legends",
  "CRUSH Gaming",
  "AKM Esports",
  "ROX Gaming",
  "Voltage Esports",
];

/** 7 wild MVP rows; teamIdx indexes GLYPH_TEAM_NAMES. */
export const GLYPH_MVP_PLAYERS: Array<{
  name: string;
  teamIdx: number;
  kills: number;
}> = [
  { name: "TFXMAنSOOR", teamIdx: 0, kills: 24 },
  { name: "invハナン", teamIdx: 1, kills: 21 },
  { name: "SNOW | أحمد", teamIdx: 3, kills: 19 },
  { name: "ＮＣＴ FEAr", teamIdx: 4, kills: 17 },
  { name: "ŠlayerツMERCY", teamIdx: 5, kills: 15 },
  { name: "ínvSYÇØ", teamIdx: 2, kills: 12 },
  { name: "SUPRΔ", teamIdx: 13, kills: 10 },
];

/**
 * Every raw string once — the on-screen baseline rendered as plain text beside
 * the exported-PNG comparison. Union of the fixture names above plus additional
 * live-extraction strings covering the remaining glyph classes (CJK, symbols,
 * fullwidth, Greek, diacritics, middot).
 */
export const GLYPH_REFERENCE: string[] = [
  // MVP rows
  "TFXMAنSOOR",
  "invハナン",
  "SNOW | أحمد",
  "ＮＣＴ FEAr",
  "ŠlayerツMERCY",
  "ínvSYÇØ",
  "SUPRΔ",
  // Team names with non-Latin/symbol code points
  "ínvaders",
  "SNOW ツ",
  "KHΛN Esports",
  "Ahmad★ Gaming",
  // Extra live-extraction strings
  "SNOW | حسیب",
  "『卍lhp』",
  "乡",
  "RED〆EYES",
  "∠XAUUSD∠",
  "M★S★K",
  "Bawa · Qadra",
  "It's→DANI",
  "Fł〆Wahab",
  "Ahmad | 533",
  "C m〆QADEER",
  "NMS · TITANIUM",
  "〆FREAK",
  "amgHANIA★",
];
