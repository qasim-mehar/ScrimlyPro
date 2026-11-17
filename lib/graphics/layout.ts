import type { CSSProperties } from "react";
import type { AnnouncementSpec, GraphicVariant, Slot, TemplateConfig } from "./types";

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
 * Announcement list: n rows auto-fitted between rowsTop and rowsBottom.
 * pitch = (rowsBottom − rowsTop) / n; row i sits at rowsTop + i*pitch.
 * n ≤ 0 → []. Works 4–25 (rowHeight bounds the card; pitch stretches).
 */
export function announcementRowLayout(
  n: number,
  spec: AnnouncementSpec,
): Array<{ y: number; pitch: number }> {
  if (n <= 0) return [];
  const pitch = (spec.rowsBottom - spec.rowsTop) / n;
  return Array.from({ length: n }, (_, i) => ({ y: spec.rowsTop + i * pitch, pitch }));
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
