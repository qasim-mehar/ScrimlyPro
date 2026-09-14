import type { RawSquad } from "@/lib/db/schema";

export type ValidationFailure =
  | { code: "MISSING_SQUADS"; extracted: number; expected: number }
  | { code: "BAD_PLACEMENTS"; detail: string }
  | { code: "BAD_KILLS"; detail: string };

export type ValidationWarning = {
  code: "LOBBY_KILLS_HIGH";
  total: number;
};

export type ValidationResult =
  | { ok: true; squads: RawSquad[]; warnings: ValidationWarning[] }
  | { ok: false; failure: ValidationFailure }; // failures = V1–V3 only

const MAX_PLAYERS = 4;
const MAX_NAME_LENGTH = 30;
// Rondo recalls inflate individual totals — legit 16–19s must pass;
// 77/99 digit misreads are still caught above 20.
export const MAX_PLAYER_KILLS = 20;
// Soft V4: lobby kills > 99 means Rondo recalls OR OCR double-count;
// a human judges, the validator doesn't.
export const LOBBY_KILLS_WARN_THRESHOLD = 99;

/**
 * PRD §F2 V1–V4, checked in order. Pure: failures are returned as values,
 * never thrown. V4 is a soft warning (LOBBY_KILLS_HIGH), never a failure.
 */
export function validateSquads(
  squads: RawSquad[],
  teamCount: number,
): ValidationResult {
  // V1: squad count
  if (squads.length !== teamCount) {
    return {
      ok: false,
      failure: {
        code: "MISSING_SQUADS",
        extracted: squads.length,
        expected: teamCount,
      },
    };
  }

  // V2: placements exactly 1..N, unique, no gaps
  const seen = new Set<number>();
  for (const squad of squads) {
    if (seen.has(squad.placement)) {
      return {
        ok: false,
        failure: {
          code: "BAD_PLACEMENTS",
          detail: `duplicate placement ${squad.placement}`,
        },
      };
    }
    seen.add(squad.placement);
  }
  for (let placement = 1; placement <= squads.length; placement++) {
    if (!seen.has(placement)) {
      return {
        ok: false,
        failure: {
          code: "BAD_PLACEMENTS",
          detail: `missing placement ${placement}`,
        },
      };
    }
  }

  // V3: squad size 1–4, name 1–30 chars (trimmed), kills 0–MAX_PLAYER_KILLS
  for (const squad of squads) {
    const label = `squad placement ${squad.placement}`;
    if (squad.players.length < 1 || squad.players.length > MAX_PLAYERS) {
      return {
        ok: false,
        failure: {
          code: "BAD_KILLS",
          detail: `${label}: ${squad.players.length} players (expected 1–${MAX_PLAYERS})`,
        },
      };
    }
    for (const player of squad.players) {
      const name = player.name.trim();
      if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
        return {
          ok: false,
          failure: {
            code: "BAD_KILLS",
            detail: `${label}, player "${player.name}": name is ${name.length} characters (expected 1–${MAX_NAME_LENGTH})`,
          },
        };
      }
      if (
        !Number.isInteger(player.kills) ||
        player.kills < 0 ||
        player.kills > MAX_PLAYER_KILLS
      ) {
        return {
          ok: false,
          failure: {
            code: "BAD_KILLS",
            detail: `${label}, player "${player.name}": kills ${player.kills} (expected 0–${MAX_PLAYER_KILLS})`,
          },
        };
      }
    }
  }

  // V4-as-warning: lobby-wide total kills > threshold → warning, never failure
  const totalKills = squads.reduce(
    (sum, squad) => sum + squad.players.reduce((s, p) => s + p.kills, 0),
    0,
  );
  const warnings: ValidationWarning[] = [];
  if (totalKills > LOBBY_KILLS_WARN_THRESHOLD) {
    warnings.push({ code: "LOBBY_KILLS_HIGH", total: totalKills });
  }

  return { ok: true, squads, warnings };
}
