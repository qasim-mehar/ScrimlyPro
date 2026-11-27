import type { StandingRow } from "@/lib/scoring";

/**
 * 24-team calibration fixture transcribed from the 2024 PMSL SEA Spring
 * "OVERALL RANKINGS" broadcast reference (`public/templates/pmsl-cobalt/
 * refrence-image/overall-ref.png`). Values are already-derived display data
 * for DEV INSPECTION ONLY — production standings always come from confirmed
 * `match_results` via `computeStandings` (ERD §5, R3: no stored aggregates).
 *
 * `pp + kp === total` for every row; `wwcd` is the separate chicken column.
 */
const PMSL_COBALT_TEAMS: ReadonlyArray<readonly [string, number, number, number]> = [
  // [teamName, PLACE PTS, ELIMS, WWCD] — TOTAL PTS = pp + kp, MATCHES = 12.
  ["VOIN", 36, 74, 2],
  ["YALL", 41, 60, 1],
  ["FaZe", 31, 63, 2],
  ["BOOM", 39, 52, 1],
  ["RRQ", 24, 65, 1],
  ["BTR", 23, 62, 1],
  ["NKT", 39, 42, 1],
  ["TALN", 20, 58, 0],
  ["AE", 22, 54, 0],
  ["VPE", 25, 50, 0],
  ["SEM9", 23, 50, 1],
  ["DX", 30, 42, 1],
  ["PGMY", 26, 42, 1],
  ["FL", 29, 37, 2],
  ["INFI", 25, 41, 1],
  ["GEEK", 28, 33, 1],
  ["STX", 23, 38, 1],
  ["MRPX", 14, 43, 0],
  ["TDK", 12, 40, 0],
  ["CRVP", 14, 37, 0],
  ["XIA", 19, 31, 1],
  ["ROY. ROY", 15, 22, 0],
  ["PEA", 13, 15, 0],
  ["YO2", 5, 22, 0],
];

/** The full 24-team reference board. */
export const PMSL_COBALT_STANDINGS: readonly StandingRow[] = PMSL_COBALT_TEAMS.map(
  ([teamName, pp, kp, wwcd], i) => ({
    teamId: `pmsl-cobalt-${i + 1}`,
    teamName,
    logoUrl: null,
    pp,
    kp,
    total: pp + kp,
    wwcd,
    matches: 12,
  }),
);

/** Truncated fixture for 16/20-team SSR smoke checks (ranks stay contiguous). */
export function pmslCobaltStandings(count: number): StandingRow[] {
  return PMSL_COBALT_STANDINGS.slice(0, Math.max(0, Math.min(count, 24))).map((row) => ({ ...row }));
}
