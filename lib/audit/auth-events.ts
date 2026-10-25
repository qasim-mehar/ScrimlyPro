import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { clientIpKey } from "@/lib/auth/rate-limit";
import { withUserDb } from "@/lib/db/user";

/**
 * Auth-event audit sink (M3 brief §5): one call per /api/auth/* event.
 *
 * Writes go through the `audit_auth_event` SECURITY DEFINER function
 * (migration 0020): the auth routes run before (signup/forgot) or outside
 * (login password check) any RLS user context, while audit_log's insert
 * policy requires actor_user_id = auth.uid(). The function derives the
 * actor ONLY from the server-verified claims (never a parameter) and
 * whitelists the four auth actions. For pre-auth events (forgot-password)
 * a nil sub is used and the function stores a NULL actor.
 *
 * This module intentionally lives OUTSIDE lib/admin: the auth routes are
 * shared with Lane A territory and must not import the admin layer
 * (eslint-perimeter tested). It uses only the RLS-sanctioned withUserDb.
 */

const AUTH_ACTIONS = ["auth.login", "auth.signup", "auth.forgot", "auth.reset"] as const;
export type AuthAuditAction = (typeof AUTH_ACTIONS)[number];

const NIL_SUB = "00000000-0000-0000-0000-000000000000";

export function authIpHash(req: Request): string | null {
  const salt = process.env.AUDIT_SALT;
  if (!salt) return null; // fail-closed on correlation data, not on the flow
  const ip = clientIpKey(req);
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(ip + salt).digest("hex");
}

export async function auditAuthEvent(
  action: AuthAuditAction,
  req: Request,
  opts?: { userId?: string | null; metadata?: Record<string, unknown> },
): Promise<void> {
  const sub = opts?.userId ?? NIL_SUB;
  try {
    await withUserDb({ sub }, async (db) => {
      await db.execute(sql`
        select audit_auth_event(
          ${action},
          ${JSON.stringify(opts?.metadata ?? {})}::jsonb,
          ${authIpHash(req)}
        )
      `);
    });
  } catch (e) {
    // Auditing must never break the auth flow; the failure is visible in
    // server logs. (The definer function can only reject non-whitelisted
    // actions — a programming error.)
    console.warn("audit_auth_event failed:", action, String(e));
  }
}
