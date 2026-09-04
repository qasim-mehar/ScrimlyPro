import { normalizeName } from "./normalize";

/**
 * Squad→team suggestion engine. Binding principle (PRD §F3): the engine only
 * SUGGESTS — a human confirms every mapping, every match. Squad tags and
 * learned rosters are hints, not truth; substitutes and tag-less teams are
 * normal and always resolve through the human-confirmed dropdown.
 *
 * Pure and deterministic per PRD R7: no DB, fs, env, Date, or randomness;
 * every ordering uses explicit codepoint comparators, never localeCompare.
 */

export type SquadLike = {
  placement: number;
  squadTag: string;
  players: ReadonlyArray<{ name: string }>;
};

export type TeamInfo = { id: string; name: string };

export type RosterEntry = {
  teamId: string;
  playerNorm: string;
  displayName: string;
};

export type SuggestionTier = "strong" | "weak" | "none";

export type Suggestion = {
  teamId: string | null;
  score: number;
  tier: SuggestionTier;
};

/** tag affinity adds a flat bonus when the squad tag matches a team-name token */
const TAG_BONUS = 0.3;
/** minimum score for a (squad, team) pair to become a greedy candidate */
const CANDIDATE_MIN = 0.3;
/** scores at or above this are "strong"; [0.3, 0.6) are "weak" */
const STRONG_MIN = 0.6;

type Candidate = {
  squadIndex: number;
  placement: number;
  teamId: string;
  teamName: string;
  score: number;
};

/** Unique non-empty normalized names of a squad, first-seen order preserved. */
function uniqueNormPlayers(players: ReadonlyArray<{ name: string }>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const player of players) {
    const norm = normalizeName(player.name);
    if (norm === "" || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/**
 * Tag affinity (PLAN C2.2): Gemini's squadTag vs team-name tokens — never
 * derived by stripping player names. Tokens are normalized before the
 * equality/prefix comparison so tag "ROX" matches team "ROX Gaming"
 * (README Assumptions, C2.2).
 */
function tagMatches(squadTag: string, teamName: string): boolean {
  const tag = normalizeName(squadTag);
  if (tag.length < 2) return false;
  const tokens = teamName
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== "")
    .map((token) => normalizeName(token));
  return tokens.some((token) => token === tag || token.startsWith(tag));
}

/** Deterministic codepoint-order comparator (Array#sort is stable in Node). */
function compareByCodepoint(a: string, b: string): number {
  if (a === b) return 0;
  const aPoints = Array.from(a);
  const bPoints = Array.from(b);
  const limit = Math.min(aPoints.length, bPoints.length);
  for (let i = 0; i < limit; i++) {
    const x = aPoints[i].codePointAt(0) ?? 0;
    const y = bPoints[i].codePointAt(0) ?? 0;
    if (x !== y) return x - y;
  }
  return aPoints.length - bPoints.length;
}

export function suggestMappings(
  squads: SquadLike[],
  teams: TeamInfo[],
  rosters: RosterEntry[],
): Suggestion[] {
  // per team: Set of its learned roster norms; rows for unknown teams are
  // ignored (their squads cannot be suggested onto an unregistered team)
  const teamSets = new Map<string, Set<string>>();
  for (const team of teams) teamSets.set(team.id, new Set<string>());
  for (const entry of rosters) {
    if (entry.playerNorm === "") continue;
    teamSets.get(entry.teamId)?.add(entry.playerNorm);
  }

  const candidates: Candidate[] = [];
  for (const [squadIndex, squad] of squads.entries()) {
    const normPlayers = uniqueNormPlayers(squad.players);
    for (const team of teams) {
      const teamSet = teamSets.get(team.id) ?? new Set<string>();
      let overlap = 0;
      for (const norm of normPlayers) {
        if (teamSet.has(norm)) overlap++;
      }
      const base =
        normPlayers.length > 0 ? overlap / normPlayers.length : 0;
      const score =
        base + (tagMatches(squad.squadTag, team.name) ? TAG_BONUS : 0);
      if (score >= CANDIDATE_MIN) {
        candidates.push({
          squadIndex,
          placement: squad.placement,
          teamId: team.id,
          teamName: team.name,
          score,
        });
      }
    }
  }

  // score DESC → squad placement ASC → team name codepoint ASC
  candidates.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.placement !== b.placement) return a.placement - b.placement;
    return compareByCodepoint(a.teamName, b.teamName);
  });

  // greedy one-to-one: each squad gets at most one suggestion, each team is
  // suggested at most once — the highest scores claim their team first
  const suggestions: Suggestion[] = squads.map(() => ({
    teamId: null,
    score: 0,
    tier: "none",
  }));
  const usedTeams = new Set<string>();
  for (const candidate of candidates) {
    if (suggestions[candidate.squadIndex].teamId !== null) continue;
    if (usedTeams.has(candidate.teamId)) continue;
    usedTeams.add(candidate.teamId);
    suggestions[candidate.squadIndex] = {
      teamId: candidate.teamId,
      score: candidate.score,
      tier: candidate.score >= STRONG_MIN ? "strong" : "weak",
    };
  }
  return suggestions;
}

/** Roster upserts for one confirmed match's mapping. Skips names that
 *  normalize to "" (unmatchable). displayName = raw name, first seen. */
export function learnRosterDelta(
  teamId: string,
  players: ReadonlyArray<{ name: string }>,
): RosterEntry[] {
  const seen = new Set<string>();
  const delta: RosterEntry[] = [];
  for (const player of players) {
    const playerNorm = normalizeName(player.name);
    if (playerNorm === "" || seen.has(playerNorm)) continue;
    seen.add(playerNorm);
    delta.push({ teamId, playerNorm, displayName: player.name });
  }
  return delta;
}

/** Full roster rebuild from confirmed matches (matchNo ASC = first-seen
 *  order). Dedup by (teamId, playerNorm); earliest displayName wins.
 *  Output sorted by (teamId, playerNorm) codepoint for determinism. */
export function rebuildRosters(
  confirmed: ReadonlyArray<{
    teamId: string;
    matchNo: number;
    players: ReadonlyArray<{ name: string }>;
  }>,
): RosterEntry[] {
  const byTeam = new Map<string, Map<string, string>>();
  const firstSeenFirst = [...confirmed].sort((a, b) => a.matchNo - b.matchNo);
  for (const match of firstSeenFirst) {
    let teamRoster = byTeam.get(match.teamId);
    if (!teamRoster) {
      teamRoster = new Map<string, string>();
      byTeam.set(match.teamId, teamRoster);
    }
    for (const entry of learnRosterDelta(match.teamId, match.players)) {
      if (!teamRoster.has(entry.playerNorm)) {
        teamRoster.set(entry.playerNorm, entry.displayName);
      }
    }
  }

  const rosters: RosterEntry[] = [];
  for (const [teamId, teamRoster] of byTeam) {
    for (const [playerNorm, displayName] of teamRoster) {
      rosters.push({ teamId, playerNorm, displayName });
    }
  }
  rosters.sort(
    (a, b) =>
      compareByCodepoint(a.teamId, b.teamId) ||
      compareByCodepoint(a.playerNorm, b.playerNorm),
  );
  return rosters;
}
