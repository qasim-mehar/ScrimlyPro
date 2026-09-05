import type { MvpEntry } from "@/lib/db/schema";
import type { TeamRow } from "@/lib/scoring";

export const MVP_SUBTITLE = "TOP 5 FRAGGERS";

export type MvpDisplayEntry = {
  rank: number;
  name: string;
  teamName: string;
  kills: number;
};

/**
 * Join locked MVP entries with team names. ORDER PRESERVED: the locked list
 * is the sole authority (ERD §5 iron rule 2) — never re-sorted, never
 * sliced. Unknown teamId → throw naming it (fail loud, same doctrine as
 * computeStandings). Empty entries → [] (the graphic then renders header +
 * watermark only).
 */
export function toMvpDisplay(
  entries: ReadonlyArray<MvpEntry>,
  teams: ReadonlyArray<Pick<TeamRow, "id" | "name">>,
): MvpDisplayEntry[] {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  return entries.map((entry) => {
    const teamName = teamNames.get(entry.teamId);
    if (teamName === undefined) {
      throw new Error(`toMvpDisplay: entry references unknown teamId "${entry.teamId}"`);
    }
    return { rank: entry.rank, name: entry.name, teamName, kills: entry.kills };
  });
}
