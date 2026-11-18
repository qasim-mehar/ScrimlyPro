import { announcementRowLayout } from "./layout";
import type { AnnouncementSpec } from "./types";

export const PARTICIPATING_TEAMS = "PARTICIPATING TEAMS";

export type AnnounceRow = { y: number; pitch: number; x?: number; rowH?: number };

/**
 * Row-major list rows for n teams: wraps announcementRowLayout. Callers pass
 * the template's EFFECTIVE announcement spec (effectiveAnnouncementSpec):
 * gradient templates auto-fit P6's pitch, art-backed ones (rundown-orange,
 * onyx-green) lock rows to baked divider lines.
 */
export function announcementRows(n: number, spec: AnnouncementSpec): AnnounceRow[] {
  return announcementRowLayout(n, spec);
}
