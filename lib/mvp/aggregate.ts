/**
 * Per-player kill aggregation for the Top-5 MVP feature (PRD §F5).
 * Pure + deterministic (PRD R7): no DB, fs, Date, or randomness.
 *
 * Merging rules (PRD §F5, ERD §5):
 * - Rows are processed in matchNo ASC order (stable sort).
 * - Players merge WITHIN a team only — identical names on different
 *   teams are different people and must never merge.
 * - Two names merge when their normalized forms match exactly, OR when
 *   Levenshtein distance ≤ 2 AND the shorter normalized form is ≥ 4
 *   chars (mild OCR drift). Heavy drift stays split; the MVP editor
 *   (C6) resolves it manually.
 * - Empty normalized forms (emoji-only names) are unmergeable: every
 *   occurrence becomes its own standalone entry.
 *
 * Kill counts here come from CONFIRMED matches only — filtering is the
 * caller's job (C6 wires that up); this module aggregates what it is
 * given.
 */
import { normalizeName } from "@/lib/matching/normalize";

export type MvpSourceRow = {
  teamId: string;
  matchNo: number;
  players: ReadonlyArray<{ name: string; kills: number }>;
};

export type PlayerAggregate = {
  teamId: string;
  displayName: string; // canonical raw spelling
  norm: string; // normalized key ("" = unmergeable)
  kills: number; // summed across matches
  variants: string[]; // distinct raw spellings, first-seen order, incl. canonical
};

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function mergeable(candidate: string, existing: string): boolean {
  if (candidate === existing) return true;
  return (
    levenshtein(candidate, existing) <= 2 &&
    Math.min(candidate.length, existing.length) >= 4
  );
}

/** Most frequent raw spelling; frequency ties → earliest first-seen. */
function canonicalSpelling(variants: string[]): string {
  const counts = new Map<string, number>();
  let best = variants[0];
  let bestCount = 0;
  for (const variant of variants) {
    const count = (counts.get(variant) ?? 0) + 1;
    counts.set(variant, count);
    if (count > bestCount) {
      bestCount = count;
      best = variant;
    }
  }
  return best;
}

/** kills DESC → displayName codepoint ASC. Never localeCompare/Intl. */
function compareAggregates(a: PlayerAggregate, b: PlayerAggregate): number {
  if (a.kills !== b.kills) return b.kills - a.kills;
  return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

export function aggregatePlayers(rows: MvpSourceRow[]): PlayerAggregate[] {
  const ordered = rows.slice().sort((a, b) => a.matchNo - b.matchNo);
  const teams = new Map<string, PlayerAggregate[]>();
  for (const row of ordered) {
    let team = teams.get(row.teamId);
    if (!team) {
      team = [];
      teams.set(row.teamId, team);
    }
    for (const player of row.players) {
      const norm = normalizeName(player.name);
      if (norm === "") {
        // Emoji-only names are unmergeable — every occurrence stands alone.
        team.push({
          teamId: row.teamId,
          displayName: player.name,
          norm: "",
          kills: player.kills,
          variants: [player.name],
        });
        continue;
      }
      let target: PlayerAggregate | undefined;
      for (const existing of team) {
        if (existing.norm !== "" && mergeable(norm, existing.norm)) {
          target = existing;
          break;
        }
      }
      if (target) {
        target.kills += player.kills;
        if (!target.variants.includes(player.name)) target.variants.push(player.name);
      } else {
        team.push({
          teamId: row.teamId,
          displayName: player.name,
          norm,
          kills: player.kills,
          variants: [player.name],
        });
      }
    }
  }
  const all: PlayerAggregate[] = [];
  for (const team of teams.values()) {
    for (const aggregate of team) {
      aggregate.displayName = canonicalSpelling(aggregate.variants);
      all.push(aggregate);
    }
  }
  return all.sort(compareAggregates);
}

export function draftMvpTop5(players: PlayerAggregate[]): PlayerAggregate[] {
  return players
    .slice()
    .sort(compareAggregates)
    .slice(0, 5);
}
