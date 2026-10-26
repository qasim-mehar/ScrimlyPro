import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import {
  matches,
  matchResults,
  orgInvites,
  sessions,
  teams,
} from "@/lib/db/schema";
import { getOrgQuota } from "@/lib/orgs/quotas";
import { computeStandings } from "@/lib/scoring";
import type { StandingRow } from "@/lib/scoring";

/**
 * Dashboard data module (M5 WP3). READ-ONLY over the existing wave-1
 * tables — no writes, no new indexes, no denormalized counters. Every
 * function runs inside the caller's withUserDb transaction (org-scoped RLS
 * is the backstop; the explicit org predicates below are the belt).
 *
 * Honesty law: every number returned is computed from real columns here —
 * the mapping table in docs/reports/M5-dashboard-report.md §8 is generated
 * from this file. Where the reference design assumes a datum that does not
 * exist (session "code", lobby/format, OCR-failure state, per-match
 * schedule), the gap is documented in the report §3 — nothing is invented.
 */

export type DashboardRange = "today" | "7d" | "30d";

export const RANGES: readonly DashboardRange[] = ["today", "7d", "30d"];

export function parseRange(value: string | undefined): DashboardRange {
  return RANGES.find((r) => r === value) ?? "7d";
}

/** Display code derived from the session id (no code column exists) —
 *  stable, honest, and links straight back to the real row. */
export function sessionCode(sessionId: string): string {
  return `SCR-${sessionId.replace(/-/g, "").slice(-6).toUpperCase()}`;
}

export type FeaturedSession = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  status: "active" | "completed";
  plannedMatches: number;
  teamCount: number;
  confirmedCount: number;
  draftCount: number;
  /** Top-3 standings over CONFIRMED matches only; empty when no matches. */
  topStandings: Array<{ teamName: string; total: number }>;
};

export type AttentionLevel = "high" | "medium";

export type AttentionItem = {
  key: string;
  blocker: string;
  risk: AttentionLevel;
  /** ISO timestamp of when the rule says this is due; null → rendered "—". */
  due: string | null;
  /** Present when the item links to a session detail page. */
  sessionId?: string;
  sessionName?: string;
};

export type AttentionSessionRow = {
  sessionId: string;
  code: string;
  name: string;
  primary: string;
  secondary: string;
  stage: "ocr-pending" | "read-failed" | "finalizing";
};

export type DashboardStats = {
  activeSessions: number;
  matchesInPlay: number;
  matchesProcessed: number;
  /** Delta of confirmed matches vs the previous window of equal length. */
  matchesDelta: number;
  draftsAwaiting: number;
  /** Hours since the oldest current draft; null when no drafts. */
  oldestDraftHours: number | null;
  needsAttention: number;
};

export type PipelineCounts = {
  upcoming: number;
  drafts: number;
  scored: number;
};

export type DashboardNotification = {
  kind: "match_confirmed" | "invite_accepted" | "share_created";
  label: string;
  at: string;
  sessionId?: string;
};

export type DashboardData = {
  featured: FeaturedSession | null;
  attentionSessions: AttentionSessionRow[];
  attentionList: AttentionItem[];
  stats: DashboardStats;
  pipeline: PipelineCounts;
  /** avg(confirmed_at − created_at) over confirmed matches created in
   *  range; null when there are none (honest "—"). */
  avgProcessingSeconds: number | null;
  quota: {
    limit: number;
    userMonthCount: number;
    readsLeft: number;
    /** consumed ratio of the ACTIVE ORG's limit by THIS user's month meter. */
    consumedRatio: number;
  };
  nav: {
    sessions: number;
    matchesWeek: number;
    drafts: number;
    attention: number;
  };
  notifications: DashboardNotification[];
  invitesPending: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function rangeStart(range: DashboardRange, now: Date): Date {
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getTime() - (range === "7d" ? 7 : 30) * DAY_MS);
}

function windowLengthMs(range: DashboardRange, now: Date): number {
  return now.getTime() - rangeStart(range, now).getTime();
}

function iso(d: Date): string {
  return d.toISOString();
}

/** Type-cast helper: drizzle's db.execute returns driver-shaped results. */
function rowsOf<T>(res: unknown): T[] {
  const r = res as { rows?: T[] } | T[];
  return Array.isArray(r) ? r : (r.rows ?? []);
}

/**
 * One typed object for the whole dashboard. `now` is injectable so tests
 * pin time (windows, "oldest draft", month meter).
 */
export async function getDashboardData(
  db: Db,
  orgId: string,
  userId: string,
  range: DashboardRange,
  now: Date = new Date(),
): Promise<DashboardData> {
  const cutoff = iso(rangeStart(range, now));
  const prevStart = iso(
    new Date(now.getTime() - 2 * windowLengthMs(range, now)),
  );
  const dayAgo = iso(new Date(now.getTime() - DAY_MS));
  const threeDaysAgo = iso(new Date(now.getTime() - 3 * DAY_MS));
  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));

  const orgSessions = await db
    .select({
      id: sessions.id,
      name: sessions.name,
      status: sessions.status,
      createdAt: sessions.createdAt,
      plannedMatches: sessions.plannedMatches,
      teamCount: sessions.teamCount,
      scoringRules: sessions.scoringRules,
    })
    .from(sessions)
    .where(eq(sessions.orgId, orgId))
    .orderBy(desc(sessions.createdAt));

  // Per-session match aggregates (one pass).
  const perSession = rowsOf<{
    session_id: string;
    n: number;
    drafts: number;
    confirmed: number;
    oldest_draft: string | null;
    last_confirmed: string | null;
  }>(
    await db.execute(sql`
      select m.session_id,
             count(*)::int as n,
             count(*) filter (where m.status = 'draft')::int as drafts,
             count(*) filter (where m.status = 'confirmed')::int as confirmed,
             min(m.created_at) filter (where m.status = 'draft') as oldest_draft,
             max(m.confirmed_at) as last_confirmed
      from matches m
      join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid
      group by m.session_id`),
  );
  const bySession = new Map(perSession.map((r) => [r.session_id, r]));

  // Range-scoped match counts + previous-window confirmed count.
  const rangeAgg = rowsOf<{ status: string; n: number }>(
    await db.execute(sql`
      select m.status, count(*)::int as n
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.created_at >= ${cutoff}
      group by m.status`),
  );
  const prevConfirmed = rowsOf<{ n: number }>(
    await db.execute(sql`
      select count(*)::int as n
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.status = 'confirmed'
        and m.created_at >= ${prevStart} and m.created_at < ${cutoff}`),
  )[0]?.n ?? 0;
  const rangeDrafts = rangeAgg.find((r) => r.status === "draft")?.n ?? 0;
  const rangeScored = rangeAgg.find((r) => r.status === "confirmed")?.n ?? 0;

  const avgRow = rowsOf<{ avg_s: string | null }>(
    await db.execute(sql`
      select avg(extract(epoch from (m.confirmed_at - m.created_at))) as avg_s
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.status = 'confirmed'
        and m.confirmed_at is not null and m.created_at >= ${cutoff}`),
  )[0];
  const avgProcessingSeconds =
    avgRow?.avg_s != null ? Math.round(Number(avgRow.avg_s)) : null;

  // --- Quota (per-USER month meter across orgs vs THIS org's limit). ---
  const quota = await getOrgQuota(db, orgId);
  const usageRows = rowsOf<{ n: number }>(
    await db.execute(sql`
      select count(*)::int as n from usage_events
      where user_id = ${userId}::uuid and created_at >= ${monthStart}`),
  );
  const userMonthCount = usageRows[0]?.n ?? 0;
  const readsLeft = Math.max(0, quota.monthlyOcrCalls - userMonthCount);
  const consumedRatio =
    quota.monthlyOcrCalls > 0
      ? userMonthCount / quota.monthlyOcrCalls
      : 0;

  // --- Invites (pending = unaccepted, unexpired). ---
  const pendingInvites = await db
    .select({ id: orgInvites.id, createdAt: orgInvites.createdAt })
    .from(orgInvites)
    .where(
      and(
        eq(orgInvites.orgId, orgId),
        isNull(orgInvites.acceptedAt),
        gte(orgInvites.expiresAt, iso(now)),
      ),
    )
    .orderBy(asc(orgInvites.createdAt));
  const invitesPending = pendingInvites.length;

  // --- Active share links per session (completed-unshared rule). ---
  const activeShares = new Set(
    rowsOf<{ session_id: string }>(
      await db.execute(sql`
        select sl.session_id from share_links sl
        join sessions s on s.id = sl.session_id
        where s.org_id = ${orgId}::uuid
          and sl.revoked_at is null
          and (sl.expires_at is null or sl.expires_at > now())`),
    ).map((r) => r.session_id),
  );

  // --- Featured session: newest ACTIVE session (spec §5). ---
  const activeSessions = orgSessions.filter((s) => s.status === "active");
  const featuredRow = activeSessions[0] ?? null;
  let featured: FeaturedSession | null = null;
  if (featuredRow) {
    const agg = bySession.get(featuredRow.id);
    const confirmedCount = agg?.confirmed ?? 0;
    let topStandings: Array<{ teamName: string; total: number }> = [];
    if (confirmedCount > 0) {
      const sessTeams = await db
        .select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl })
        .from(teams)
        .where(eq(teams.sessionId, featuredRow.id));
      const results = await db
        .select({
          teamId: matchResults.teamId,
          placement: matchResults.placement,
          kills: matchResults.kills,
          placementPoints: matchResults.placementPoints,
        })
        .from(matchResults)
        .innerJoin(matches, eq(matches.id, matchResults.matchId))
        .where(
          and(eq(matches.sessionId, featuredRow.id), eq(matches.status, "confirmed")),
        );
      const standings: StandingRow[] = computeStandings(
        results,
        sessTeams,
        featuredRow.scoringRules,
      );
      topStandings = standings
        .slice()
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((r) => ({ teamName: r.teamName, total: r.total }));
    }
    featured = {
      id: featuredRow.id,
      code: sessionCode(featuredRow.id),
      name: featuredRow.name,
      createdAt: featuredRow.createdAt,
      status: featuredRow.status,
      plannedMatches: featuredRow.plannedMatches,
      teamCount: featuredRow.teamCount,
      confirmedCount,
      draftCount: agg?.drafts ?? 0,
      topStandings,
    };
  }

  // --- Attention rules (deterministic; drops documented in report §3). ---
  const attentionList: AttentionItem[] = [];

  // HIGH: quota ≥ 80% consumed while an active session exists; due = month end.
  if (activeSessions.length > 0 && consumedRatio >= 0.8) {
    attentionList.push({
      key: "quota",
      blocker: "OCR quota nearly used up",
      risk: "high",
      due: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    });
  }

  // MEDIUM: current drafts pending ≥ 24h (one item per stale draft, oldest
  // first); due = when the 24h threshold was crossed.
  const staleDrafts = rowsOf<{
    id: string;
    match_no: number;
    created_at: string;
    session_id: string;
    session_name: string;
  }>(
    await db.execute(sql`
      select m.id, m.match_no, m.created_at, s.id as session_id, s.name as session_name
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.status = 'draft'
        and m.created_at <= ${dayAgo}
      order by m.created_at asc`),
  );
  for (const d of staleDrafts) {
    attentionList.push({
      key: `draft:${d.id}`,
      blocker: `Match ${d.match_no} draft not reviewed`,
      risk: "medium",
      due: iso(new Date(new Date(d.created_at).getTime() + DAY_MS)),
      sessionId: d.session_id,
      sessionName: d.session_name,
    });
  }

  // MEDIUM: invites pending ≥ 3 days; due = created+3d.
  for (const inv of pendingInvites) {
    if (inv.createdAt <= threeDaysAgo) {
      attentionList.push({
        key: `invite:${inv.id}`,
        blocker: "Team invite still pending",
        risk: "medium",
        due: iso(new Date(new Date(inv.createdAt).getTime() + 3 * DAY_MS)),
      });
    }
  }

  // MEDIUM: completed session with no active share link whose last
  // confirmed match (proxy for "ended" — no completed_at column exists) is
  // ≥ 24h old; due = proxy+1d.
  for (const s of orgSessions) {
    if (s.status !== "completed" || activeShares.has(s.id)) continue;
    const agg = bySession.get(s.id);
    const lastActivity = agg?.last_confirmed ?? s.createdAt;
    if (lastActivity <= dayAgo) {
      attentionList.push({
        key: `unshared:${s.id}`,
        blocker: "Final standings not shared",
        risk: "medium",
        due: iso(new Date(new Date(lastActivity).getTime() + DAY_MS)),
        sessionId: s.id,
        sessionName: s.name,
      });
    }
  }

  attentionList.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === "high" ? -1 : 1;
    const ad = a.due ? new Date(a.due).getTime() : Infinity;
    const bd = b.due ? new Date(b.due).getTime() : Infinity;
    return ad - bd;
  });
  const attentionListCapped = attentionList.slice(0, 6);

  // --- Needs-attention TABLE rows (session-scoped items only). ---
  const attentionSessions: AttentionSessionRow[] = [];
  const staleBySession = new Map<string, { matchNo: number; createdAt: string }[]>();
  for (const d of staleDrafts) {
    const list = staleBySession.get(d.session_id) ?? [];
    list.push({ matchNo: d.match_no, createdAt: d.created_at });
    staleBySession.set(d.session_id, list);
  }
  for (const s of orgSessions) {
    const stale = staleBySession.get(s.id);
    if (stale?.length) {
      const oldest = stale[0];
      const hours = Math.max(
        1,
        Math.round((now.getTime() - new Date(oldest.createdAt).getTime()) / 3_600_000),
      );
      attentionSessions.push({
        sessionId: s.id,
        code: sessionCode(s.id),
        name: s.name,
        primary: `Match ${oldest.matchNo} · in review ${hours}h`,
        secondary: "Draft older than 24 hours",
        stage: "ocr-pending",
      });
      continue;
    }
    if (s.status === "completed" && !activeShares.has(s.id)) {
      const agg = bySession.get(s.id);
      const lastActivity = agg?.last_confirmed ?? s.createdAt;
      if (lastActivity <= dayAgo) {
        attentionSessions.push({
          sessionId: s.id,
          code: sessionCode(s.id),
          name: s.name,
          primary: `${agg?.confirmed ?? 0} of ${s.plannedMatches} matches scored`,
          secondary: "Completed · final standings not shared",
          stage: "finalizing",
        });
      }
    }
  }

  // --- Stats. ---
  const matchesInPlay = activeSessions.reduce(
    (n, s) => n + (bySession.get(s.id)?.n ?? 0),
    0,
  );
  const currentDrafts = perSession.reduce((n, r) => n + r.drafts, 0);
  const oldestDraftAll = perSession
    .map((r) => r.oldest_draft)
    .filter((d): d is string => d != null)
    .sort()[0];
  const oldestDraftHours = oldestDraftAll
    ? Math.max(
        1,
        Math.round(
          (now.getTime() - new Date(oldestDraftAll).getTime()) / 3_600_000,
        ),
      )
    : null;

  const stats: DashboardStats = {
    activeSessions: activeSessions.length,
    matchesInPlay,
    matchesProcessed: rangeScored,
    matchesDelta: rangeScored - prevConfirmed,
    draftsAwaiting: currentDrafts,
    oldestDraftHours,
    needsAttention: attentionList.length,
  };

  // --- Pipeline: upcoming is plan-based (no timestamps exist for planned
  // matches — not range-scoped); drafts/scored are range-scoped by createdAt.
  const pipeline: PipelineCounts = {
    upcoming: activeSessions.reduce(
      (n, s) =>
        n +
        Math.max(0, s.plannedMatches - (bySession.get(s.id)?.n ?? 0)),
      0,
    ),
    drafts: rangeDrafts,
    scored: rangeScored,
  };

  // --- Notifications: latest real events (derived, no new tables). ---
  const confirmedRecent = rowsOf<{
    match_no: number;
    confirmed_at: string;
    session_id: string;
    session_name: string;
  }>(
    await db.execute(sql`
      select m.match_no, m.confirmed_at, s.id as session_id, s.name as session_name
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.confirmed_at is not null
      order by m.confirmed_at desc limit 10`),
  );
  const invitesAcceptedRecent = rowsOf<{
    accepted_at: string;
    email: string | null;
  }>(
    await db.execute(sql`
      select accepted_at, email from org_invites
      where org_id = ${orgId}::uuid and accepted_at is not null
      order by accepted_at desc limit 5`),
  );
  const sharesRecent = rowsOf<{
    created_at: string;
    session_id: string;
    session_name: string;
  }>(
    await db.execute(sql`
      select sl.created_at, s.id as session_id, s.name as session_name
      from share_links sl join sessions s on s.id = sl.session_id
      where s.org_id = ${orgId}::uuid
      order by sl.created_at desc limit 5`),
  );

  const notifications: DashboardNotification[] = [
    ...confirmedRecent.map((r) => ({
      kind: "match_confirmed" as const,
      label: `Match ${r.match_no} scored · ${r.session_name}`,
      at: r.confirmed_at,
      sessionId: r.session_id,
    })),
    ...invitesAcceptedRecent.map((r) => ({
      kind: "invite_accepted" as const,
      label: `Invite accepted · ${r.email ?? "teammate"}`,
      at: r.accepted_at,
    })),
    ...sharesRecent.map((r) => ({
      kind: "share_created" as const,
      label: `Share link created · ${r.session_name}`,
      at: r.created_at,
      sessionId: r.session_id,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  // --- Nav badge counts. ---
  const weekAgo = iso(new Date(now.getTime() - 7 * DAY_MS));
  const matchesWeek = rowsOf<{ n: number }>(
    await db.execute(sql`
      select count(*)::int as n
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid and m.created_at >= ${weekAgo}`),
  )[0]?.n ?? 0;

  return {
    featured,
    attentionSessions,
    attentionList: attentionListCapped,
    stats,
    pipeline,
    avgProcessingSeconds,
    quota: {
      limit: quota.monthlyOcrCalls,
      userMonthCount,
      readsLeft,
      consumedRatio,
    },
    nav: {
      sessions: activeSessions.length,
      matchesWeek,
      drafts: currentDrafts,
      attention: attentionList.length,
    },
    notifications,
    invitesPending,
  };
}

/** Org search for the ⌘K palette API (WP10): sessions + matches, limit 10. */
export type DashboardSearchResults = {
  sessions: Array<{ id: string; name: string; code: string; status: string }>;
  matches: Array<{
    sessionId: string;
    sessionName: string;
    matchNo: number;
    status: string;
  }>;
};

export async function dashboardSearch(
  db: Db,
  orgId: string,
  query: string,
): Promise<DashboardSearchResults> {
  const q = query.trim();
  if (q.length === 0) return { sessions: [], matches: [] };
  const like = `%${q.toLowerCase()}%`;

  const sess = rowsOf<{
    id: string;
    name: string;
    status: string;
  }>(
    await db.execute(sql`
      select id, name, status from sessions
      where org_id = ${orgId}::uuid and lower(name) like ${like}
      order by created_at desc limit 10`),
  );

  // Match labels are derived ("Match N of <session>") — match on the
  // session name + match number text.
  const matchNo = /^\d+$/.test(q) ? Number(q) : null;
  const byMatchNo = matchNo !== null ? sql`or m.match_no = ${matchNo}` : sql.empty();
  const mts = rowsOf<{
    session_id: string;
    session_name: string;
    match_no: number;
    status: string;
  }>(
    await db.execute(sql`
      select m.session_id, s.name as session_name, m.match_no, m.status
      from matches m join sessions s on s.id = m.session_id
      where s.org_id = ${orgId}::uuid
        and (lower(s.name) like ${like} ${byMatchNo})
      order by m.created_at desc limit 10`),
  );

  return {
    sessions: sess.map((r) => ({
      id: r.id,
      name: r.name,
      code: sessionCode(r.id),
      status: r.status,
    })),
    matches: mts.map((r) => ({
      sessionId: r.session_id,
      sessionName: r.session_name,
      matchNo: r.match_no,
      status: r.status,
    })),
  };
}
