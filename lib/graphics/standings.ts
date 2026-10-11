import type { StandingRow } from "@/lib/scoring";

export const STANDINGS_LABELS = {
  rank: "RANK",
  team: "TEAM",
  wwcd: "WWCD",
  pp: "PP",
  kp: "KP",
  total: "TOTAL",
} as const;

/** "FINAL RESULTS" when isFinal, else "AFTER MATCH N".
 * (0, false) yields "AFTER MATCH 0" — documented edge; callers avoid it. */
export function standingsSubtitle(confirmedMatches: number, isFinal: boolean): string {
  return isFinal ? "FINAL RESULTS" : `AFTER MATCH ${confirmedMatches}`;
}

/** Art-backed templates (subtitleMode "matchNumber") bake "MATCH #" into the
 * art — the subtitle slot renders ONLY the confirmed-count digits. The caller
 * still passes the full subtitle; the number is derived here ("AFTER MATCH 6"
 * → "6"; "FINAL RESULTS" → "" — a final session's number comes from its
 * matchCount prop at the preview layer). */
export function subtitleMatchNumber(subtitle: string): string {
  return subtitle.match(/\d+/)?.[0] ?? "";
}

/** Standings + derived display rank (index+1). Pure map — input rows untouched. */
export function withRanks(standings: StandingRow[]): Array<StandingRow & { rank: number }> {
  return standings.map((row, i) => ({ ...row, rank: i + 1 }));
}
