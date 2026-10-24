import { and, eq, gte, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { orgQuotas, sessions, usageEvents } from "@/lib/db/schema";

/**
 * Per-org quotas (M2). Advisory-HARD: enforced on write paths only, never on
 * a read path. Both checkers are cheap COUNTs meant to run INSIDE the
 * caller's withUserDb request transaction — no long transactions, no
 * external calls anywhere near them.
 *
 * OCR meter choice: a `usage_events` row per /api/ocr invocation (NOT a
 * match count). Rondo lobby exports inflate matches without OCR calls, and
 * re-OCR of the same draft match re-invokes the paid Gemini API — the route
 * invocation is the thing being limited. The meter is per-USER (month-total
 * across all orgs); the LIMIT is read from the org that owns the resource.
 * See M2 report §6 and the 0014 hardening migration.
 */

export type QuotaName = "max_sessions" | "monthly_ocr_calls";

/** Pilot upgrade copy (M2 brief): friendly, non-blocking, support contact. */
export const QUOTA_UPGRADE_COPY =
  "You've reached this organization's scrim limit. Contact support to raise limits.";

export class QuotaExceededError extends Error {
  constructor(public quota: QuotaName) {
    super(`quota exceeded: ${quota}`);
  }
}

export type OrgQuota = {
  maxSessions: number;
  monthlyOcrCalls: number;
};

const DEFAULTS: OrgQuota = { maxSessions: 100, monthlyOcrCalls: 300 };

/**
 * The org's quota row (defaults when missing — pilot quotas are uniform;
 * owners/support raise them per org).
 */
export async function getOrgQuota(db: Db, orgId: string): Promise<OrgQuota> {
  const row = (
    await db
      .select({
        maxSessions: orgQuotas.maxSessions,
        monthlyOcrCalls: orgQuotas.monthlyOcrCalls,
      })
      .from(orgQuotas)
      .where(eq(orgQuotas.orgId, orgId))
      .limit(1)
  )[0];
  return row ?? { ...DEFAULTS };
}

/** Session-create gate: COUNT sessions for the org, reject at the limit. */
export async function assertSessionQuota(
  db: Db,
  orgId: string,
): Promise<OrgQuota> {
  const quota = await getOrgQuota(db, orgId);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sessions)
    .where(eq(sessions.orgId, orgId));
  if ((rows[0]?.n ?? 0) >= quota.maxSessions) {
    throw new QuotaExceededError("max_sessions");
  }
  return quota;
}

/**
 * Calendar-month OCR usage count for ONE USER across ALL their orgs
 * (date_trunc on the server clock). Per-user, not per-org: a per-org COUNT
 * is evaded by creating a fresh org and restarting the meter at zero —
 * unlimited org creation would make the paid-API cap unenforceable.
 * usage_events pins user_id at insert and is append-only under RLS, so the
 * user-total COUNT is tamper-proof. The RLS select policy includes own rows,
 * so usage in orgs the user has since left still counts.
 */
export async function monthlyOcrCount(db: Db, userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, "ocr"),
        gte(usageEvents.createdAt, sql`date_trunc('month', now())`),
      ),
    );
  return rows[0]?.n ?? 0;
}

/**
 * OCR-route gate: the limit comes from the org that owns the resource
 * (display/budget surface), the COUNT is the user's month-total across all
 * orgs. Reject at the limit.
 */
export async function assertOcrQuota(
  db: Db,
  orgId: string,
  userId: string,
): Promise<OrgQuota> {
  const quota = await getOrgQuota(db, orgId);
  if ((await monthlyOcrCount(db, userId)) >= quota.monthlyOcrCalls) {
    throw new QuotaExceededError("monthly_ocr_calls");
  }
  return quota;
}

/** Append one usage row (the OCR meter). Runs in the caller's tx. */
export async function recordUsage(
  db: Db,
  orgId: string,
  userId: string,
  kind = "ocr",
): Promise<void> {
  await db.insert(usageEvents).values({ id: crypto.randomUUID(), orgId, userId, kind });
}
