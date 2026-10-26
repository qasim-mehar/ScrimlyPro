import { createHash } from "node:crypto";

import { getAdminSql } from "@/lib/db/admin";
import { withRanks } from "@/lib/graphics/standings";
import {
  computeStandings,
  type ResultRow,
  type StandingRow,
  type TeamRow,
} from "@/lib/scoring";

/**
 * THE one request-path consumer of the admin client (RLS-bypassing), per the
 * M2 brief. The ESLint no-restricted-imports exception for this file is
 * recorded as an integration note in docs/reports/M2-orgs-report.md
 * (eslint.config.* belongs to Lane A / Lane C).
 *
 * Contract: given a raw share token, return EXACTLY the public standings
 * projection of that one session — scrim name, template id, confirmed/planned
 * match counts, and the ranked standings rows (team names + numbers). No
 * emails, no user ids, no org ids, no other sessions, no raw_squad_data, no
 * team logos. Unknown / expired / revoked tokens are indistinguishable (null).
 */
export type SharedStandingsRow = Omit<StandingRow, "logoUrl"> & { rank: number };

export type SharedStandings = {
  scrimName: string;
  templateId: string;
  confirmedCount: number;
  plannedMatches: number;
  standings: SharedStandingsRow[];
};

export async function getSharedStandings(
  rawToken: string,
): Promise<SharedStandings | null> {
  const sql = getAdminSql();

  const linkRows = await sql`
    select s.id, s.name, s.template_id, s.planned_matches, s.scoring_rules
    from public.share_links l
    join public.sessions s on s.id = l.session_id
    where l.token_hash = ${tokenHash(rawToken)}
      and l.revoked_at is null
      and (l.expires_at is null or l.expires_at > now())
    limit 1`;
  const link = linkRows[0];
  if (!link) return null;

  // Logos are deliberately NOT projected (data-URL bulk; names + numbers are
  // the public surface).
  const teamRows: TeamRow[] = (
    await sql`select id, name, logo_url from public.teams where session_id = ${link.id}`
  ).map((t) => ({ id: t.id, name: t.name, logoUrl: null }));

  const resultRows: ResultRow[] = (
    await sql`
      select r.team_id, r.placement, r.kills, r.placement_points
      from public.match_results r
      join public.matches m on m.id = r.match_id
      where m.session_id = ${link.id} and m.status = 'confirmed'`
  ).map((r) => ({
    teamId: r.team_id,
    placement: r.placement,
    kills: r.kills,
    placementPoints: r.placement_points,
  }));

  const confirmedCount = Number(
    (
      await sql`select count(*)::int as n from public.matches where session_id = ${link.id} and status = 'confirmed'`
    )[0]!.n,
  );

  const ranked = withRanks(
    computeStandings(resultRows, teamRows, link.scoring_rules),
  );
  // Minimal projection: only names + numbers (StandingRow's logoUrl key
  // deliberately omitted).
  const standings = ranked.map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    wwcd: row.wwcd,
    pp: row.pp,
    kp: row.kp,
    total: row.total,
    rank: row.rank,
  }));

  return {
    scrimName: link.name,
    templateId: link.template_id,
    confirmedCount,
    plannedMatches: link.planned_matches,
    standings,
  };
}

function tokenHash(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
