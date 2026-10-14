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

/** Export filename for a standings graphic. Explicit props win (P5 Fix A):
 * when the session page threads matchCount/isFinal through, the filename is
 * derived from them — never from subtitle parsing. Absent props → the legacy
 * subtitle-parsing fallback (gradient templates, dev routes). */
export function resolveStandingsFilename(
  subtitle: string,
  matchCount?: number,
  isFinal?: boolean,
): string {
  if (matchCount !== undefined || isFinal === true) {
    return isFinal === true
      ? "scrimlypro-final-standings.png"
      : `scrimlypro-standings-after-match-${matchCount}.png`;
  }
  if (subtitle === "FINAL RESULTS") return "scrimlypro-final-standings.png";
  const matchNo = /^AFTER MATCH (\d+)$/.exec(subtitle)?.[1];
  return matchNo ? `scrimlypro-standings-after-match-${matchNo}.png` : "scrimlypro-standings.png";
}

/** Standings + derived display rank (index+1). Pure map — input rows untouched. */
export function withRanks(standings: StandingRow[]): Array<StandingRow & { rank: number }> {
  return standings.map((row, i) => ({ ...row, rank: i + 1 }));
}
