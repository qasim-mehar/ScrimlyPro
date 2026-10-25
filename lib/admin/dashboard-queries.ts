import { sql, type SQL } from "drizzle-orm";

import { computeStandings, type ResultRow, type TeamRow } from "@/lib/scoring/standings";
import type { ScoringRules } from "@/lib/db/schema";

import { getAdminDb } from "./admin-db";

/**
 * M6 super-admin dashboard data module (read-only).
 *
 * Confinement: runs on the admin service client (getAdminDb) and is
 * importable ONLY from app/admin/** (the eslint perimeter already covers
 * this module — no allowlist entry required; canary-proven in
 * tests/api/admin-guard.test.ts). Callers have passed requireAdmin().
 *
 * Honesty rules: every number comes from a query; nothing is hardcoded or
 * simulated. Failed AI reads are NOT metered by usage_events (rows are
 * written only after a successful ingest — app/api/ocr/route.ts), so
 * failure-derived widgets use honest fallbacks instead of inventing data:
 * the "failed AI reads by a user" attention rule is DROPPED and the success-
 * rate gauge renders "—" (see the report's deviation table). Reads never
 * write to audit_log.
 */

/**
 * Reserved global flag name the sidebar system card mirrors. Presence of
 * ('global', 'ai_disabled') = platform AI off; absence = on. Wave-1 ships no
 * global flag convention, so in practice this reads "On" — the card links to
 * /admin/flags (the real editor) rather than faking a toggle.
 */
export const GLOBAL_AI_FLAG = "ai_disabled";

/* ============================== Nav / shell ============================== */

export type AdminNavData = {
  orgs: number;
  users: number;
  /** Every feature_flags row is a non-default setting (default = no row). */
  flags: number;
  activeImpersonations: number;
  aiOn: boolean;
  reads7d: number;
  /** Users carrying the reserved kill-switch marker. */
  usersFlagged: number;
};

/**
 * One round trip for the shell chrome (sidebar badges + system card).
 * Scalar subqueries on pilot-scale tables — clarity over cleverness.
 */
export async function getAdminNavData(): Promise<AdminNavData> {
  const db = getAdminDb();
  const res = (await db.execute(sql`
    select
      (select count(*)::int from organizations) as orgs,
      (select count(*)::int from auth.users) as users,
      (select count(*)::int from feature_flags) as flags,
      (select count(*)::int from impersonation_sessions
        where revoked_at is null and expires_at > now()) as active_impersonations,
      (select not exists(
        select 1 from feature_flags
        where subject_type = 'global' and flag = ${GLOBAL_AI_FLAG}
      )) as ai_on,
      (select count(*)::int from usage_events
        where kind = 'ocr' and created_at >= now() - interval '7 days') as reads_7d,
      (select count(distinct subject_id)::int from feature_flags
        where subject_type = 'user' and flag = 'disabled') as users_flagged
  `)) as unknown as
    | Array<Record<string, unknown>>
    | { rows?: Array<Record<string, unknown>> };
  const row = (Array.isArray(res) ? res : res.rows ?? [])[0] ?? {};
  return {
    orgs: Number(row.orgs ?? 0),
    users: Number(row.users ?? 0),
    flags: Number(row.flags ?? 0),
    activeImpersonations: Number(row.active_impersonations ?? 0),
    aiOn: row.ai_on === true,
    reads7d: Number(row.reads_7d ?? 0),
    usersFlagged: Number(row.users_flagged ?? 0),
  };
}

/* ============================== Dashboard ================================ */

export type RangeKey = "today" | "7d" | "30d";

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
};

/** Accepts the raw `range` search-param; anything unknown → 7d. */
export function parseRange(value: unknown): RangeKey {
  return value === "today" || value === "30d" || value === "7d" ? value : "7d";
}

function rangeStartSql(range: RangeKey): SQL {
  if (range === "today") return sql`date_trunc('day', now())`;
  if (range === "30d") return sql`now() - interval '30 days'`;
  return sql`now() - interval '7 days'`;
}

/**
 * The prior window of the same length (for the sessions delta). Today →
 * yesterday; 7d → the week before; 30d → the month before.
 */
function priorStartSql(range: RangeKey): SQL {
  if (range === "today") return sql`date_trunc('day', now()) - interval '1 day'`;
  if (range === "30d") return sql`now() - interval '60 days'`;
  return sql`now() - interval '14 days'`;
}

export type AttentionSeverity = "high" | "medium";

/**
 * One flagged entity. The needs-attention table and the ranked attention
 * list are two projections of the same deterministic rules (§5):
 *   HIGH: user disabled (kill switch); user ≥ 90% of monthly reads; an
 *         impersonation that expired without being stopped.
 *   MEDIUM: user 80–89% of monthly reads; org with zero activity for 30+
 *         days; invite pending ≥ 7 days.
 * ("Failed AI reads by a user in an active session" is DROPPED — failed
 * reads are not metered anywhere; never simulated.)
 */
export type AttentionEntity = {
  key: string;
  severity: AttentionSeverity;
  /** Bold first table line: email or org name. */
  entityName: string;
  /** Muted second table line: org or role context. */
  entitySub: string;
  detail: string;
  detailSub: string;
  /** Right chip label: Disabled / High / Quota / Stale. */
  status: string;
  /** The honest date each rule implies (quota → month end, etc.). */
  dueAt: string | null;
  /** Severity date (sorting + "since" copy). */
  at: string;
  href: string;
};

export type FeaturedOrg = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  monogram: string;
  membersTotal: number;
  membersActive: number;
  sessionsInRange: number;
  readsInRange: number;
  /** Active | Quota warnings | Disabled (per §5 status rules). */
  status: "active" | "quota" | "disabled";
  /** Month reads vs the org's quota (0–∞, honest). */
  quotaPct: number;
  hero: {
    sessionName: string;
    /** True standings rows exist (confirmed matches); else monogram hero. */
    hasResults: boolean;
    top: Array<{ teamName: string; points: number }>;
  } | null;
};

export type HumanizedEvent = {
  id: string;
  createdAt: string;
  text: string;
};

export type ActiveImpersonationRow = {
  id: string;
  targetEmail: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  range: RangeKey;
  adminFirstName: string;
  stats: {
    users: number;
    orgs: number;
    sessionsInRange: number;
    /** in-range minus prior-window (negative = decline). */
    sessionsDelta: number | null;
    readsInRange: number;
    attentionCount: number;
  };
  lifecycle: {
    signups: number;
    joinedOrg: number;
    activeInRange: number;
    nearQuota: number;
    disabled: number;
    averageActivationDays: number | null;
  };
  featured: FeaturedOrg | null;
  attention: AttentionEntity[];
  ai: {
    reads7d: number;
    users7d: number;
    orgs7d: number;
    draftMatches7d: number;
    lastReadAt: string | null;
    /** Relative label computed at query time (components stay pure). */
    lastReadAgo: string;
    nearQuotaCount: number;
  };
  gauge: {
    readsInRange: number;
    /** False until failed reads are metered — the % is never invented. */
    successRateComputable: false;
  };
  events: HumanizedEvent[];
  activeImpersonations: ActiveImpersonationRow[];
};

type Rows = Array<Record<string, unknown>>;

async function query(stmt: SQL): Promise<Rows> {
  const db = getAdminDb();
  const res = (await db.execute(stmt)) as unknown as Rows | { rows?: Rows };
  return Array.isArray(res) ? res : res.rows ?? [];
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const iso = (v: unknown): string | null => {
  if (v == null) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Greeting name from the admin's real email local-part (profiles has no
 * display name). Picks the LONGEST alphabetic chunk so tagged addresses
 * like "m6.dev.admin@" humanize to "Admin", not "M".
 */
export function firstNameFromEmail(email: string | null): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const chunks = local.split(/[._\-+0-9]+/).filter(Boolean);
  const pick =
    chunks.length === 0
      ? ""
      : chunks.reduce((best, cur) => (cur.length > best.length ? cur : best));
  if (!pick) return "Admin";
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase();
}

/** Relative-time label for the AI card ("12 min ago" / "No reads yet"). */
function agoLabel(iso: string | null): string {
  if (!iso) return "No reads yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Month-end date (quota rules are monthly): the honest "due" for quota rows. */
function monthEndIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function getAdminDashboardData(
  range: RangeKey,
  adminEmail: string | null,
): Promise<AdminDashboardData> {
  const start = rangeStartSql(range);
  const priorStart = priorStartSql(range);

  const [statRow] = await query(sql`
    select
      (select count(*)::int from auth.users) as users,
      (select count(*)::int from organizations) as orgs,
      (select count(*)::int from sessions where created_at >= ${start}) as sessions_in_range,
      (select count(*)::int from sessions
        where created_at >= ${priorStart} and created_at < ${start}) as sessions_prior,
      (select count(*)::int from usage_events
        where kind = 'ocr' and created_at >= ${start}) as reads_in_range,
      (select count(*)::int from usage_events
        where kind = 'ocr' and created_at >= now() - interval '7 days') as reads_7d,
      (select count(distinct user_id)::int from usage_events
        where kind = 'ocr' and created_at >= now() - interval '7 days') as users_7d,
      (select count(distinct org_id)::int from usage_events
        where kind = 'ocr' and created_at >= now() - interval '7 days') as orgs_7d,
      (select count(*)::int from matches
        where status = 'draft' and created_at >= now() - interval '7 days') as draft_matches_7d,
      (select max(created_at) from usage_events where kind = 'ocr') as last_read_at
  `);

  const [lifecycleRow] = await query(sql`
    select
      (select count(*)::int from profiles where created_at >= ${start}) as signups,
      (select count(*)::int from org_members where joined_at >= ${start}) as joined_org,
      (select count(distinct user_id)::int from usage_events
        where kind = 'ocr' and created_at >= ${start}) as active_in_range,
      (select count(distinct subject_id)::int from feature_flags
        where subject_type = 'user' and flag = 'disabled') as disabled,
      (select avg(extract(epoch from (om.joined_at - p.created_at)) / 86400)
        from org_members om join profiles p on p.id = om.user_id
        where om.joined_at >= ${start}) as avg_activation_days
  `);

  /* ---- attention rules (deterministic) ---- */

  const disabledUsers = await query(sql`
    select u.email, f.updated_at
    from feature_flags f
    join auth.users u on u.id = f.subject_id
    where f.subject_type = 'user' and f.flag = 'disabled'
    order by f.updated_at desc
    limit 50
  `);

  // Monthly quota pressure per user: reads vs the TIGHTEST monthly cap among
  // the user's orgs (the first quota that would actually block them — the
  // meter is per-user across orgs, the limit is per-org).
  const quotaUsers = await query(sql`
    with m as (
      select user_id, count(*)::int as n
      from usage_events
      where kind = 'ocr' and created_at >= date_trunc('month', now())
      group by user_id
    ), cap as (
      select om.user_id, min(coalesce(oq.monthly_ocr_calls, 300)) as cap
      from org_members om
      left join org_quotas oq on oq.org_id = om.org_id
      group by om.user_id
    )
    select u.email, m.n, coalesce(cap.cap, 300) as cap
    from m
    join auth.users u on u.id = m.user_id
    left join cap on cap.user_id = m.user_id
    where m.n >= 0.8 * coalesce(cap.cap, 300)
    order by m.n desc
  `);

  const expiredImpersonations = await query(sql`
    select id, target_email, expires_at, created_at
    from impersonation_sessions
    where revoked_at is null and expires_at < now()
    order by expires_at desc
    limit 20
  `);

  const staleOrgs = await query(sql`
    select o.id, o.name,
           greatest(
             coalesce((select max(created_at) from sessions where sessions.org_id = o.id), o.created_at),
             coalesce((select max(created_at) from usage_events where usage_events.org_id = o.id), o.created_at)
           ) as last_activity
    from organizations o
    where o.created_at < now() - interval '30 days'
      and greatest(
             coalesce((select max(created_at) from sessions where sessions.org_id = o.id), o.created_at),
             coalesce((select max(created_at) from usage_events where usage_events.org_id = o.id), o.created_at)
           ) < now() - interval '30 days'
    order by last_activity desc
    limit 20
  `);

  const staleInvites = await query(sql`
    select i.id, i.email, i.created_at, o.name as org_name
    from org_invites i
    join organizations o on o.id = i.org_id
    where i.accepted_at is null and i.created_at <= now() - interval '7 days'
    order by i.created_at
    limit 20
  `);

  const attention: AttentionEntity[] = [];

  for (const r of disabledUsers) {
    attention.push({
      key: `disabled:${String(r.email)}`,
      severity: "high",
      entityName: String(r.email ?? "(no email)"),
      entitySub: "User · platform",
      detail: "Account disabled (kill switch)",
      detailSub: "Access blocked",
      status: "Disabled",
      dueAt: null,
      at: iso(r.updated_at) ?? new Date().toISOString(),
      href: "/admin/tenants",
    });
  }

  for (const r of quotaUsers) {
    const pct = Math.round((num(r.n) / num(r.cap, 300)) * 100);
    attention.push({
      key: `quota:${String(r.email)}`,
      severity: pct >= 90 ? "high" : "medium",
      entityName: String(r.email ?? "(no email)"),
      entitySub: "User · monthly quota",
      detail: `${pct}% of monthly reads used`,
      detailSub: `AI reads · ${num(r.n)} of ${num(r.cap, 300)} this month`,
      status: pct >= 90 ? "High" : "Quota",
      dueAt: monthEndIso(),
      at: new Date().toISOString(),
      href: "/admin/tenants",
    });
  }

  for (const r of expiredImpersonations) {
    attention.push({
      key: `imp:${String(r.id)}`,
      severity: "high",
      entityName: String(r.target_email ?? "(no email)"),
      entitySub: "Impersonation target",
      detail: "Impersonation expired — never stopped",
      detailSub: `Support session · expired ${iso(r.expires_at)?.slice(0, 10) ?? "—"}`,
      status: "High",
      dueAt: iso(r.expires_at),
      at: iso(r.expires_at) ?? new Date().toISOString(),
      href: "/admin/tenants",
    });
  }

  for (const r of staleOrgs) {
    const lastActivity = iso(r.last_activity);
    const due = lastActivity
      ? new Date(new Date(lastActivity).getTime() + 30 * 86400_000).toISOString()
      : null;
    attention.push({
      key: `org:${String(r.id)}`,
      severity: "medium",
      entityName: String(r.name),
      entitySub: "Organization",
      detail: "No activity for 30+ days",
      detailSub: `Last activity ${lastActivity?.slice(0, 10) ?? "—"}`,
      status: "Stale",
      dueAt: due,
      at: lastActivity ?? new Date().toISOString(),
      href: "/admin/orgs",
    });
  }

  for (const r of staleInvites) {
    attention.push({
      key: `invite:${String(r.id)}`,
      severity: "medium",
      entityName: String(r.email ?? "(no email)"),
      entitySub: `Invite · ${String(r.org_name)}`,
      detail: "Invite pending 7+ days",
      detailSub: `Sent ${iso(r.created_at)?.slice(0, 10) ?? "—"}`,
      status: "Stale",
      dueAt: iso(r.created_at),
      at: iso(r.created_at) ?? new Date().toISOString(),
      href: "/admin/orgs",
    });
  }

  // Sort: High before Medium, then by severity date (oldest first — the
  // longest-standing issue leads).
  attention.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });

  /* ---- featured org (most active in range; tie → newest) ---- */

  const [featuredRow] = await query(sql`
    select o.id, o.name, o.slug, o.created_at,
      (select count(*)::int from org_members m where m.org_id = o.id) as members_total,
      (select count(distinct user_id)::int from usage_events ue
        where ue.org_id = o.id and ue.kind = 'ocr' and ue.created_at >= ${start}) as members_active,
      (select count(*)::int from sessions s
        where s.org_id = o.id and s.created_at >= ${start}) as sessions_in_range,
      (select count(*)::int from usage_events ue
        where ue.org_id = o.id and ue.kind = 'ocr' and ue.created_at >= ${start}) as reads_in_range,
      (select count(*)::int from usage_events ue
        where ue.org_id = o.id and ue.kind = 'ocr'
        and ue.created_at >= date_trunc('month', now())) as reads_month,
      coalesce((select q.monthly_ocr_calls from org_quotas q where q.org_id = o.id), 300) as quota,
      exists(select 1 from feature_flags f
        where f.subject_type = 'org' and f.subject_id = o.id and f.flag = 'disabled') as org_disabled
    from organizations o
    order by reads_in_range desc, sessions_in_range desc, o.created_at desc
    limit 1
  `);

  let featured: FeaturedOrg | null = null;
  if (featuredRow) {
    const orgId = String(featuredRow.id);
    const [sessionRow] = await query(sql`
      select id, name, created_at, scoring_rules
      from sessions
      where org_id = ${orgId}::uuid
      order by created_at desc
      limit 1
    `);
    let hero: FeaturedOrg["hero"] = null;
    if (sessionRow) {
      const teamRows = await query(sql`
        select id, name from teams where session_id = ${String(sessionRow.id)}
      `);
      const resultRows = await query(sql`
        select r.team_id, r.placement, r.kills, r.placement_points
        from match_results r
        join matches m on m.id = r.match_id
        where m.session_id = ${String(sessionRow.id)} and m.status = 'confirmed'
      `);
      const hasResults = resultRows.length > 0;
      let top: Array<{ teamName: string; points: number }> = [];
      if (hasResults) {
        const teams: TeamRow[] = teamRows.map((t) => ({
          id: String(t.id),
          name: String(t.name),
          logoUrl: null,
        }));
        const results: ResultRow[] = resultRows.map((r) => ({
          teamId: String(r.team_id),
          placement: num(r.placement),
          kills: num(r.kills),
          placementPoints: num(r.placement_points),
        }));
        top = computeStandings(
          results,
          teams,
          sessionRow.scoring_rules as ScoringRules,
        )
          .slice(0, 3)
          .map((s) => ({ teamName: s.teamName, points: s.total }));
      }
      hero = { sessionName: String(sessionRow.name), hasResults, top };
    }
    const readsMonth = num(featuredRow.reads_month);
    const quota = num(featuredRow.quota, 300);
    featured = {
      id: orgId,
      name: String(featuredRow.name),
      slug: String(featuredRow.slug),
      createdAt: iso(featuredRow.created_at) ?? new Date().toISOString(),
      monogram: String(featuredRow.name ?? "?").trim().charAt(0).toUpperCase() || "?",
      membersTotal: num(featuredRow.members_total),
      membersActive: num(featuredRow.members_active),
      sessionsInRange: num(featuredRow.sessions_in_range),
      readsInRange: num(featuredRow.reads_in_range),
      status:
        featuredRow.org_disabled === true
          ? "disabled"
          : readsMonth >= 0.8 * quota
            ? "quota"
            : "active",
      quotaPct: quota > 0 ? Math.round((readsMonth / quota) * 100) : 0,
      hero,
    };
  }

  /* ---- notifications (latest audit events, humanized) ---- */

  const events = await getRecentAuditEvents(10);

  const impersonationRows = await query(sql`
    select id, target_email, reason, created_at, expires_at
    from impersonation_sessions
    where revoked_at is null and expires_at > now()
    order by created_at desc
    limit 10
  `);

  const sessionsDelta =
    statRow?.sessions_prior === undefined || statRow?.sessions_prior === null
      ? null
      : num(statRow.sessions_in_range) - num(statRow.sessions_prior);

  return {
    generatedAt: new Date().toISOString(),
    range,
    adminFirstName: firstNameFromEmail(adminEmail),
    stats: {
      users: num(statRow?.users),
      orgs: num(statRow?.orgs),
      sessionsInRange: num(statRow?.sessions_in_range),
      sessionsDelta,
      readsInRange: num(statRow?.reads_in_range),
      attentionCount: attention.length,
    },
    lifecycle: {
      signups: num(lifecycleRow?.signups),
      joinedOrg: num(lifecycleRow?.joined_org),
      activeInRange: num(lifecycleRow?.active_in_range),
      nearQuota: quotaUsers.length,
      disabled: num(lifecycleRow?.disabled),
      averageActivationDays:
        lifecycleRow?.avg_activation_days == null
          ? null
          : Math.round(num(lifecycleRow.avg_activation_days) * 10) / 10,
    },
    featured,
    attention,
    ai: {
      reads7d: num(statRow?.reads_7d),
      users7d: num(statRow?.users_7d),
      orgs7d: num(statRow?.orgs_7d),
      draftMatches7d: num(statRow?.draft_matches_7d),
      lastReadAt: iso(statRow?.last_read_at),
      lastReadAgo: agoLabel(iso(statRow?.last_read_at)),
      nearQuotaCount: quotaUsers.length,
    },
    gauge: {
      readsInRange: num(statRow?.reads_in_range),
      successRateComputable: false,
    },
    events,
    activeImpersonations: impersonationRows.map((r) => ({
      id: String(r.id),
      targetEmail: String(r.target_email ?? "(no email)"),
      reason: String(r.reason ?? ""),
      createdAt: iso(r.created_at) ?? new Date().toISOString(),
      expiresAt: iso(r.expires_at) ?? new Date().toISOString(),
    })),
  };
}

/**
 * Latest audit events, humanized (the notification bell). Shared by the
 * admin layout (bell) and the dashboard data pass. Read-only — silent.
 */
export async function getRecentAuditEvents(limit = 10): Promise<HumanizedEvent[]> {
  const rows = await query(sql`
    select a.id, a.action, a.created_at, a.metadata,
           au.email as actor_email, tu.email as target_email
    from audit_log a
    left join auth.users au on au.id = a.actor_user_id
    left join auth.users tu on tu.id = a.target_id
    order by a.created_at desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
    text: humanizeEvent(r),
  }));
}

/**
 * Audit-event humanizer (§5 bell mapping). Deterministic sentences from the
 * recorded action vocabulary; unknown actions render their raw action —
 * honest, never invented.
 */
export function humanizeEvent(row: {
  action?: unknown;
  actor_email?: unknown;
  target_email?: unknown;
  metadata?: unknown;
}): string {
  const action = String(row.action ?? "unknown");
  const actor = String(row.actor_email ?? "Someone");
  const target = row.target_email ? String(row.target_email) : null;
  const meta = (row.metadata ?? {}) as Record<string, unknown>;

  switch (action) {
    case "admin.impersonation.start":
      return `${actor} started impersonating ${target ?? "a user"}`;
    case "admin.impersonation.stop":
      return `${actor} stopped an impersonation`;
    case "admin.tenant.disable":
      return `${actor} disabled ${target ?? "a user"}`;
    case "admin.tenant.enable":
      return `${actor} enabled ${target ?? "a user"}`;
    case "admin.flag.set":
      return `${actor} set flag ${String(meta.flag ?? "?")} (${String(meta.subject_type ?? "?")})`;
    case "admin.flag.delete":
      return `${actor} deleted flag ${String(meta.flag ?? "?")}`;
    case "auth.login":
      return `${actor} signed in`;
    case "auth.signup":
      return `${actor} signed up`;
    case "auth.forgot":
      return `Password reset requested for ${actor}`;
    case "auth.reset":
      return `${actor} changed their password`;
    default:
      return action;
  }
}

/* ============================== Orgs page (WP13) ========================== */

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  createdAt: string;
  members: number;
  sessionsInRange: number;
  readsInRange: number;
  status: "active" | "quota" | "disabled";
};

/** Read-only org table (sorted by in-range activity, newest tiebreak). */
export async function getOrgRows(range: RangeKey): Promise<OrgRow[]> {
  const start = rangeStartSql(range);
  const rows = await query(sql`
    select o.id, o.name, o.slug, o.created_at, ou.email as owner_email,
      (select count(*)::int from org_members m where m.org_id = o.id) as members,
      (select count(*)::int from sessions s
        where s.org_id = o.id and s.created_at >= ${start}) as sessions_in_range,
      (select count(*)::int from usage_events ue
        where ue.org_id = o.id and ue.kind = 'ocr' and ue.created_at >= ${start}) as reads_in_range,
      (select count(*)::int from usage_events ue
        where ue.org_id = o.id and ue.kind = 'ocr'
        and ue.created_at >= date_trunc('month', now())) as reads_month,
      coalesce((select q.monthly_ocr_calls from org_quotas q where q.org_id = o.id), 300) as quota,
      exists(select 1 from feature_flags f
        where f.subject_type = 'org' and f.subject_id = o.id and f.flag = 'disabled') as org_disabled
    from organizations o
    left join auth.users ou on ou.id = o.created_by
    order by reads_in_range desc, sessions_in_range desc, o.created_at desc
    limit 200
  `);
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    ownerEmail: r.owner_email ? String(r.owner_email) : null,
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
    members: num(r.members),
    sessionsInRange: num(r.sessions_in_range),
    readsInRange: num(r.reads_in_range),
    status:
      r.org_disabled === true
        ? "disabled"
        : num(r.reads_month) >= 0.8 * num(r.quota, 300)
          ? "quota"
          : "active",
  }));
}

/* ============================== Search (WP10) ============================= */

export type AdminSearchResult = {
  users: Array<{ id: string; email: string | null }>;
  orgs: Array<{ id: string; name: string }>;
};

/** Grouped search for the ⌘K palette (emails/names + org names, limit 10). */
export async function adminSearch(q: string): Promise<AdminSearchResult> {
  const needle = q.trim().slice(0, 100);
  if (needle.length === 0) return { users: [], orgs: [] };
  const like = `%${needle}%`;
  const [userRows, orgRows] = await Promise.all([
    query(sql`
      select id, email from auth.users
      where email ilike ${like}
      order by created_at desc
      limit 10
    `),
    query(sql`
      select id, name from organizations
      where name ilike ${like} or slug ilike ${like}
      order by created_at desc
      limit 10
    `),
  ]);
  return {
    users: userRows.map((r) => ({ id: String(r.id), email: r.email ? String(r.email) : null })),
    orgs: orgRows.map((r) => ({ id: String(r.id), name: String(r.name) })),
  };
}
