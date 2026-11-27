import type { StandingRow } from "@/lib/scoring";

/**
 * 24-team calibration fixture transcribed from the 2024 EWC cyber-teal
 * broadcast standings reference (`public/templates/ewc-teal/refrence-image/
 * overall-ref.png`). Values are already-derived DISPLAY data for DEV
 * INSPECTION ONLY — production standings always come from confirmed
 * `match_results` via `computeStandings` (ERD §5, R3: no stored aggregates).
 *
 * `pp + kp === total` for every row; `wwcd` is the separate chicken column;
 * rows are in strict R7 order (total DESC → wwcd DESC → kp DESC → pp DESC →
 * name ASC). The long "REGNUM CARYA ESPORTS" name exercises ellipsis before
 * the baked WWCD divider.
 */
const EWC_TEAL_TEAMS: ReadonlyArray<readonly [string, number, number, number]> = [
  // [teamName, PLACE PTS, ELIMS, WWCD] — TOTAL PTS = pp + kp, MATCHES = 6.
  ["4THRIVES ESPORTS", 22, 34, 1],
  ["ALPHA7 ESPORTS", 21, 34, 2],
  ["DRX", 25, 29, 2],
  ["TEAM SECRET", 18, 32, 0],
  ["REGNUM CARYA ESPORTS", 16, 26, 1],
  ["YANGON GALACTICOS", 11, 31, 0],
  ["WEIBO GAMING", 13, 27, 0],
  ["HORAA ESPORTS", 12, 26, 0],
  ["VOIN ESPORTS", 15, 21, 0],
  ["BOOM ESPORTS", 12, 22, 1],
  ["RRQ ATHLETIC", 11, 21, 0],
  ["FAZE CLAN", 10, 20, 0],
  ["DRS GAMING", 9, 19, 0],
  ["SEM9 SQUAD", 8, 18, 0],
  ["BTR ESPORTS", 9, 15, 0],
  ["NKT LEGENDS", 7, 15, 0],
  ["VPE GAMING", 6, 14, 0],
  ["TALN ESPORTS", 5, 13, 0],
  ["HYDRA OPS PAK", 4, 12, 0],
  ["GEEK FAM", 3, 11, 0],
  ["STX ESPORTS", 2, 10, 0],
  ["MRPX SQUAD", 1, 9, 0],
  ["PGMY ESPORTS", 1, 7, 0],
  ["DX RAIDERS", 0, 6, 0],
];

/** The full 24-team reference board. */
export const EWC_TEAL_STANDINGS: readonly StandingRow[] = EWC_TEAL_TEAMS.map(
  ([teamName, pp, kp, wwcd], i) => ({
    teamId: `ewc-teal-${i + 1}`,
    teamName,
    logoUrl: null,
    pp,
    kp,
    total: pp + kp,
    wwcd,
    matches: 6,
  }),
);

/** Truncated fixture for 16/20-team SSR smoke checks (ranks stay contiguous). */
export function ewcTealStandings(count: number): StandingRow[] {
  return EWC_TEAL_STANDINGS.slice(0, Math.max(0, Math.min(count, 24))).map((row) => ({ ...row }));
}
