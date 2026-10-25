import { sql } from "drizzle-orm";

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
 * failure-derived widgets use their honest fallbacks instead of inventing
 * data. Reads never write to audit_log.
 */

/**
 * Reserved global flag name the sidebar system card mirrors. Presence of
 * ('global', 'ai_disabled') = platform AI off; absence = on. Wave-1 ships no
 * global flag convention, so in practice this reads "On" — the card links to
 * /admin/flags (the real editor) rather than faking a toggle.
 */
export const GLOBAL_AI_FLAG = "ai_disabled";

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
