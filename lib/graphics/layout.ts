import type { CSSProperties } from "react";
import type {
  AnnouncementBarLayout,
  AnnouncementBarRow,
  AnnouncementSpec,
  Background,
  GraphicVariant,
  Slot,
  TemplateConfig,
} from "./types";

/**
 * Two-column split for n teams: [left, right].
 * left = min(maxLeft, ceil(n/2)); right = n - left.
 * Default maxLeft 13: 16→[8,8], 25→[13,12].
 * Art with 12 bars per side passes 12: 24→[12,12], 25→[12,13].
 */
export function splitRows(n: number, maxLeft = 13): [number, number] {
  const left = Math.min(maxLeft, Math.ceil(n / 2));
  return [left, n - left];
}

/**
 * Fixed-capacity two-column split for tables whose ranks are baked into the
 * art: the left column fills first up to `rowsPerColumn` (12 on
 * challengers-red), then the rest go right. 24 → [12,12], 16 → [12,4],
 * 25 → [12,13] (the overflow row renders below the painted table, never
 * dropped). n ≤ 0 → [0,0].
 */
export function splitRowsAt(n: number, rowsPerColumn: number): [number, number] {
  if (n <= 0 || rowsPerColumn <= 0) return [0, 0];
  const left = Math.min(n, rowsPerColumn);
  return [left, n - left];
}

/**
 * Announcement list rows.
 *
 * P6 default: n rows auto-fitted between rowsTop and rowsBottom
 * (pitch = (rowsBottom − rowsTop) / n; row i sits at rowsTop + i*pitch).
 *
 * Art-backed single-column templates (rundown-orange, and onyx-green via its
 * template-level `announcementLayout`) set `fixedRowPitch`:
 * rows never stretch with team count. When `lineYs` is present it holds the
 * measured canvas centres of the baked white divider lines, so row i spans
 * line i → line i+1 and its text-box centre lands on the EXACT pixel midpoint
 * between those two lines with zero cumulative pitch drift (the art's line
 * spacing is not perfectly uniform — a single average pitch would drift up
 * to ~5.5px by row 24). Without `lineYs`, nominal `rowY0`/`rowPitch` are used.
 *
 * n ≤ 0 → [].
 */
export function announcementRowLayout(
  n: number,
  spec: AnnouncementSpec,
): Array<{ y: number; pitch: number; x?: number; rowH?: number }> {
  if (n <= 0) return [];

  // Art-backed TWO-column announcement (royal-blue): the left column fills
  // first up to `rowsPerColumn` (12), then the overflow goes right via
  // `splitRowsAt`. Every row keeps the art's fixed `rowPitch`/`rowHeight`
  // regardless of team count — rows never stretch down into the baked
  // soldier/parachute art when fewer than 24 teams are present. The returned
  // `x` is the column origin so the renderer can offset slot/name cells.
  // Beyond two painted columns the pitch auto-fits inside `rowsBottom`.
  if (
    spec.fixedRowPitch &&
    !spec.singleColumn &&
    spec.rowY0 !== undefined &&
    spec.rowPitch !== undefined &&
    spec.rowsPerColumn !== undefined &&
    spec.rowsPerColumn > 0 &&
    spec.leftX !== undefined &&
    spec.rightX !== undefined
  ) {
    const [leftCount, rightCount] = splitRowsAt(n, spec.rowsPerColumn);
    const pitchFor = (count: number): number =>
      Math.min(
        spec.rowPitch!,
        (spec.rowsBottom - spec.rowHeight - spec.rowY0!) / Math.max(1, count - 1),
      );
    const rows: Array<{ y: number; pitch: number; x?: number; rowH?: number }> = [];
    for (const [x, count] of [
      [spec.leftX, leftCount],
      [spec.rightX, rightCount],
    ] as const) {
      if (count <= 0) continue;
      const pitch = pitchFor(count);
      for (let j = 0; j < count; j++) {
        rows.push({ x, y: spec.rowY0 + j * pitch, pitch, rowH: spec.rowHeight });
      }
    }
    return rows;
  }

  // Painted-bar art (varsity-purple): `barCenterYs` holds the exact measured
  // midlines of the painted bars. Row i's box TOP is centre − rowHeight/2, so
  // its midpoint is dead-on bar i — zero drift even where the art's pitch is
  // not perfectly uniform (the last two varsity-purple bars are wider).
  if (spec.fixedRowPitch && spec.barCenterYs && spec.barCenterYs.length > 0) {
    const bars = spec.barCenterYs.length;
    return Array.from({ length: n }, (_, i) => {
      // Overflow teams reuse the same painted bars (bar 0, 1, …) exactly as
      // announcementBarRows does, so rows never drift below the last bar.
      const bar = i < bars ? i : Math.min(i - bars, bars - 1);
      const center = spec.barCenterYs![bar]!;
      const next = spec.barCenterYs![bar + 1];
      return {
        y: center - spec.rowHeight / 2,
        pitch: next !== undefined ? next - center : (spec.rowPitch ?? spec.rowHeight),
        rowH: spec.rowHeight,
      };
    });
  }

  const lines = spec.lineYs;
  if (spec.fixedRowPitch && lines && lines.length >= n + 1) {
    return Array.from({ length: n }, (_, i) => ({
      y: lines[i],
      pitch: lines[i + 1] - lines[i],
    }));
  }
  const rowY0 = spec.rowY0;
  const rowPitch = spec.rowPitch;
  if (spec.fixedRowPitch && rowY0 !== undefined && rowPitch !== undefined) {
    // Bar-backed single-column art (varsity-yellow): the row box IS the painted
    // white bar, so its height is `rowHeight` — the text centre is rowY0 +
    // i*rowPitch + rowHeight/2. Divider-line arts (rundown-orange, onyx-green)
    // take the `lineYs` branch above and keep the pitch-height behaviour.
    return Array.from({ length: n }, (_, i) => ({
      y: rowY0 + i * rowPitch,
      pitch: rowPitch,
      rowH: spec.rowHeight,
    }));
  }
  const pitch = (spec.rowsBottom - spec.rowsTop) / n;
  return Array.from({ length: n }, (_, i) => ({ y: spec.rowsTop + i * pitch, pitch }));
}

/**
 * Painted 3-cell bar rows for varsity-purple. The first `barCenterYs.length`
 * teams occupy the painted bars top-down using the left slot cell + centre
 * name cell; any remaining teams (14–25) reuse those SAME painted bars in the
 * narrow right cell. Because every row's box is exactly `rowHeight` tall and
 * starts at `barCenters[bar] − rowHeight/2`, its text midpoint lands on the
 * measured painted-bar centre — no team ever floats between bars, at any
 * valid session count. `n ≤ 0` → [].
 */
export function announcementBarRows(
  n: number,
  layout: AnnouncementBarLayout,
): AnnouncementBarRow[] {
  if (n <= 0) return [];
  const bars = layout.barCenterYs.length;
  if (bars === 0) return [];
  const primary = Math.min(n, bars);
  const rows: AnnouncementBarRow[] = [];
  for (let i = 0; i < primary; i++) {
    const center = layout.barCenterYs[i]!;
    const next = layout.barCenterYs[i + 1];
    rows.push({
      bar: i,
      kind: "primary",
      y: center - layout.rowHeight / 2,
      rowH: layout.rowHeight,
      pitch: next !== undefined ? next - center : layout.rowPitch,
    });
  }
  for (let i = primary; i < n; i++) {
    const bar = Math.min(i - primary, bars - 1);
    const center = layout.barCenterYs[bar]!;
    const next = layout.barCenterYs[bar + 1];
    rows.push({
      bar,
      kind: "overflow",
      y: center - layout.rowHeight / 2,
      rowH: layout.rowHeight,
      pitch: next !== undefined ? next - center : layout.rowPitch,
    });
  }
  return rows;
}

/**
 * Effective announcement geometry for one template. When `announcementLayout`
 * is present (onyx-green's 24-row single-column participation art) it overrides
 * the shared announcement spec's art-backed fields; otherwise the spec is
 * returned unchanged (royal-blue's two-column art, rundown-orange, and every
 * gradient fallback). `slotColWidth` maps onto the spec's slot box and the font
 * aliases land on the canonical `rankFont`/`nameFont` fields. `rowColors` is
 * consumed by the renderer directly — it is not a geometry field.
 *
 * The two-column / line-locked algorithm in `announcementRowLayout` is left
 * completely intact — this helper only chooses WHICH spec it is given.
 */
export function effectiveAnnouncementSpec(config: TemplateConfig): AnnouncementSpec {
  const layout = config.announcementLayout;
  const bar = config.announcementBarLayout;
  if (!layout && !bar) return config.announcement;
  // A `announcementBarLayout` (varsity-purple's painted bars) is folded in the
  // same way so the pure helper and the 3-cell renderer share one source of
  // truth.
  const barFields = bar
    ? {
        barCenterYs: bar.barCenterYs,
        barCells: bar.cells,
        rowY0: bar.rowY0,
        rowPitch: bar.rowPitch,
        rowHeight: bar.rowHeight,
        rowsBottom: bar.rowsBottom,
      }
    : {};
  if (!layout) return { ...config.announcement, ...barFields };
  return {
    ...config.announcement,
    ...barFields,
    singleColumn: layout.singleColumn ?? config.announcement.singleColumn,
    fixedRowPitch: layout.fixedRowPitch ?? config.announcement.fixedRowPitch,
    rowsPerColumn: layout.rowsPerColumn ?? config.announcement.rowsPerColumn,
    rowY0: layout.rowY0,
    rowPitch: layout.rowPitch,
    rowHeight: layout.rowHeight,
    rowsBottom: layout.rowsBottom,
    leftX: layout.leftX,
    rightX: layout.rightX ?? config.announcement.rightX,
    colWidth: layout.colWidth,
    lineYs: layout.lineYs ?? config.announcement.lineYs,
    slotW: layout.slotColWidth ?? config.announcement.slotW,
    rankFont: layout.rankFont ?? config.announcement.rankFont,
    nameFont: layout.nameFont ?? config.announcement.nameFont,
  };
}

/** Slot → absolute-position style. width only when slot.w defined. */
export function slotToStyle(slot: Slot): CSSProperties {
  const style: CSSProperties = { position: "absolute", left: slot.x, top: slot.y };
  if (slot.w !== undefined) style.width = slot.w;
  if (slot.align !== undefined) style.textAlign = slot.align;
  return style;
}

/** Effective header for one variant: the shared header with the variant's
 * partial override merged on top (pmpl-light announcement). No override →
 * the shared header object itself. */
export function headerFor(config: TemplateConfig, variant: GraphicVariant): TemplateConfig["header"] {
  const override = config.variantHeaders?.[variant];
  return override ? { ...config.header, ...override } : config.header;
}

/** Per-variant scrim-name visibility: the variant flag wins when present,
 * otherwise the template-wide flag applies (neon-green hides it everywhere). */
export function hideScrimNameFor(config: TemplateConfig, variant: GraphicVariant): boolean {
  return config.variantHideScrimName?.[variant] ?? config.hideScrimName === true;
}

/** Per-variant label-row visibility: the variant flag wins when present,
 * otherwise the template-wide flag applies. grunge-red bakes its MVP header
 * into the art but keeps its clean gradient standings/announcement labels. */
export function labelsBakedInFor(config: TemplateConfig, variant: GraphicVariant): boolean {
  return config.variantLabelsBakedIn?.[variant] ?? config.labelsBakedIn === true;
}

/** Per-variant subtitle-label visibility: the variant flag wins when present.
 *  subtitles baked into the art (pmgc-aqua's "MATCH #") still render their
 *  digits via `subtitleMode: "matchNumber"` — this only records the fact. */
export function subtitleBakedInFor(config: TemplateConfig, variant: GraphicVariant): boolean {
  return config.subtitleBakedIn?.[variant] === true;
}

/** Background image style for one variant. `fit` (when present) is a uniformly
 *  pre-scaled image box: the art keeps its native ratio and its measured slots
 *  land exactly on the config coordinates — zero stretch, zero distortion.
 *  Without `fit` the established object-fit: cover behaviour is unchanged. */
export function imageFitStyle(background: Background): CSSProperties {
  if (background.type !== "image" || !background.fit) {
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
    };
  }
  const { width, height, left, top } = background.fit;
  return {
    position: "absolute",
    left,
    top,
    width,
    height,
    objectFit: "fill", // width/height are uniform multiples of the art pixels
  };
}

/**
 * Row auto-fit pitch for art-backed templates (P4): rows stretch to fill the
 * column's table area for ANY team count.
 * pitch = (rowsBottom − rowY0) / rowsInColumn. rowsInColumn ≤ 0 falls back.
 */
export function columnPitch(rowY0: number, rowsBottom: number, rowsInColumn: number): number {
  if (rowsInColumn <= 0) return 0;
  return (rowsBottom - rowY0) / rowsInColumn;
}

/**
 * Effective pitch for one standings column: auto-fit when the column sets
 * rowsBottom, else the template's fixed rowPitch. `fixed` (baked-slot art)
 * always keeps the fixed pitch so rows stay dead-center in painted bars.
 */
export function effectivePitch(
  rowY0: number,
  fallbackPitch: number,
  rowsBottom: number | undefined,
  rowsInColumn: number,
  fixed = false,
): number {
  if (fixed || rowsBottom === undefined) return fallbackPitch;
  return columnPitch(rowY0, rowsBottom, rowsInColumn);
}

export type Rgb = { r: number; g: number; b: number };

/** Parse a #rgb or #rrggbb hex color. Throws naming the bad value. */
export function parseHexColor(hex: string): Rgb {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`parseHexColor: not a #rgb/#rrggbb color: "${hex}"`);
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** WCAG 2.x relative luminance of an sRGB color (0–1). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const linear = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.x contrast ratio of two sRGB colors (1–21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Hex color stops found in a gradient css string, in order. */
export function gradientStopColors(css: string): Rgb[] {
  const stops = css.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) ?? [];
  return stops.map(parseHexColor);
}

/** Worst-case contrast of a text color against every hex stop in a
 * gradient css string. Empty (no hex stops) → 1, never a false pass. */
export function minContrastAgainstStops(text: Rgb, css: string): number {
  const stops = gradientStopColors(css);
  if (stops.length === 0) return 1;
  return Math.min(...stops.map((stop) => contrastRatio(text, stop)));
}
