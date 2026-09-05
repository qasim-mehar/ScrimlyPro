import { announcementGrid } from "./layout";
import type { AnnouncementSpec } from "./types";

export const PARTICIPATING_TEAMS = "PARTICIPATING TEAMS";

export type AnnounceCell = { x: number; y: number; w: number; h: number };

/**
 * Row-major cells for n teams: wraps C3.1's announcementGrid + index math
 * (x = x0 + col*cellW, y = y0 + row*cellH).
 */
export function announcementCells(n: number, spec: AnnouncementSpec): AnnounceCell[] {
  const grid = announcementGrid(n, spec);
  return Array.from({ length: n }, (_, i) => ({
    x: grid.x0 + (i % grid.cols) * grid.cellW,
    y: grid.y0 + Math.floor(i / grid.cols) * grid.cellH,
    w: grid.cellW,
    h: grid.cellH,
  }));
}
