import type { CSSProperties } from "react";
import type { AnnouncementSpec, Slot } from "./types";

/**
 * Two-column split for n teams: [left, right].
 * left = min(13, ceil(n/2)); right = n - left. 16→[8,8], 25→[13,12].
 */
export function splitRows(n: number): [number, number] {
  const left = Math.min(13, Math.ceil(n / 2));
  return [left, n - left];
}

/**
 * Announcement grid: cols = clamp(ceil(sqrt(n)), 4, 6);
 * rows = ceil(n/cols); x0 = round((1080 - cols*cellW)/2).
 */
export function announcementGrid(
  n: number,
  spec: AnnouncementSpec,
): { cols: number; rows: number; x0: number; y0: number; cellW: number; cellH: number } {
  const cols = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  const x0 = Math.round((1080 - cols * spec.cellW) / 2);
  return { cols, rows, x0, y0: spec.y0, cellW: spec.cellW, cellH: spec.cellH };
}

/** Slot → absolute-position style. width only when slot.w defined. */
export function slotToStyle(slot: Slot): CSSProperties {
  const style: CSSProperties = { position: "absolute", left: slot.x, top: slot.y };
  if (slot.w !== undefined) style.width = slot.w;
  if (slot.align !== undefined) style.textAlign = slot.align;
  return style;
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
 * rowsBottom, else the template's fixed rowPitch.
 */
export function effectivePitch(
  rowY0: number,
  fallbackPitch: number,
  rowsBottom: number | undefined,
  rowsInColumn: number,
): number {
  if (rowsBottom === undefined) return fallbackPitch;
  return columnPitch(rowY0, rowsBottom, rowsInColumn);
}
