import { sql } from "drizzle-orm";

import { getAdminDb } from "./admin-db";

/**
 * Read-side queries for the admin panel. Every query:
 * - runs on the service-role admin-db (callers passed requireAdmin first),
 * - is parameterized (drizzle sql templates — no string interpolation of
 *   user input),
 * - exposes only what an operator legitimately needs (emails/ids shown in
 *   the console; never tokens, never ip_hash, never flag values beyond the
 *   disabled marker).
 *
 * M3-INT: org-aware after M2 merge — org metrics (users per org, org-scoped
 * counts) hook in here once sessions carry org_id; the subject_type='org'
 * branch of feature_flags is already in the schema.
 */

export type DashboardMetrics = {
  users: number;
  sessions: number;
  matches: number;
  ocrCalls7d: number | null; // null = not metered (no persisted OCR usage table)
  activeImpersonations: ActiveImpersonation[];
};

export type ActiveImpersonation = {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetEmail: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getAdminDb();

  const countOf = async (stmt: ReturnType<typeof sql>): Promise<number> => {
    const res = (await db.execute(stmt)) as unknown as {
      rows?: Array<{ n: number }>;
    };
    const rows = Array.isArray(res)
      ? (res as unknown as Array<{ n: number }>)
      : res.rows ?? [];
    return rows[0]?.n ?? 0;
  };

  const [users, sessions, matches] = await Promise.all([
    countOf(sql`select count(*)::int as n from auth.users`),
    countOf(sql`select count(*)::int as n from sessions`),
    countOf(sql`select count(*)::int as n from matches`),
  ]);

  // M3-INT: OCR call metering needs a persisted usage table (M-next);
  // OCR requests are not stored today, so the metric reports null and the
  // dashboard renders "not metered" instead of a misleading 0.
  const ocrCalls7d: number | null = null;

  const impRes = (await db.execute(sql`
    select id, admin_user_id, target_user_id, target_email, reason,
           created_at, expires_at
    from impersonation_sessions
    where revoked_at is null and expires_at > now()
    order by created_at desc
    limit 50
  `)) as unknown as { rows?: ActiveImpersonation[] };
  const activeImpersonations = Array.isArray(impRes) ? (impRes as unknown as ActiveImpersonation[]) : impRes.rows ?? [];

  return { users, sessions, matches, ocrCalls7d, activeImpersonations };
}

export type TenantRow = {
  id: string;
  email: string | null;
  createdAt: string;
  sessionCount: number;
  matchCount: number;
  disabled: boolean;
};

/** Searchable tenant list (email/id substring match, newest first). */
export async function getTenantList(query: string): Promise<TenantRow[]> {
  const db = getAdminDb();
  const needle = query.trim();
  const res = (await db.execute(sql`
    select u.id,
           u.email,
           u.created_at,
           (select count(*) from sessions s where s.user_id = u.id)::int as session_count,
           (select count(*) from matches m
              join sessions s2 on s2.id = m.session_id
              where s2.user_id = u.id)::int as match_count,
           exists (
             select 1 from feature_flags f
             where f.subject_type = 'user' and f.subject_id = u.id and f.flag = 'disabled'
           ) as disabled
    from auth.users u
    where ${needle}::text = ''
       or u.email ilike ${"%" + needle + "%"}
       or u.id::text = ${needle}
    order by u.created_at desc
    limit 200
  `)) as unknown as { rows?: Array<Record<string, unknown>> };
  const rows = Array.isArray(res)
    ? (res as unknown as Array<Record<string, unknown>>)
    : res.rows ?? [];
  return rows.map((r) => ({
    id: String(r.id),
    email: (r.email as string | null) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
    sessionCount: Number(r.session_count ?? 0),
    matchCount: Number(r.match_count ?? 0),
    disabled: Boolean(r.disabled),
  }));
}
