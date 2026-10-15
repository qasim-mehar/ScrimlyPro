import { announcementRowLayout } from "./layout";
import type { AnnouncementSpec } from "./types";

export const PARTICIPATING_TEAMS = "PARTICIPATING TEAMS";

export type AnnounceRow = { y: number; pitch: number };

/**
 * Row-major list rows for n teams: wraps P6's announcementRowLayout
 * (y = rowsTop + i*pitch, pitch auto-fitted to the list panel).
 */
export function announcementRows(n: number, spec: AnnouncementSpec): AnnounceRow[] {
  return announcementRowLayout(n, spec);
}
