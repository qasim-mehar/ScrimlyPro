import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { withUserDb } from "@/lib/db/user";
import { getAuthedUser, type AuthedUser } from "@/lib/supabase/server";

/**
 * Support impersonation (M3 brief §5/rule 6).
 *
 * Cookie contract: `imp=<session id>.<hmac>` where the HMAC-SHA256
 * (IMP_SECRET, server-only env) covers id|admin|target|expiry — all four
 * read back from the impersonation_sessions ROW, never from the cookie, so
 * a tampered or stale cookie cannot outlive the ledger. HttpOnly, SameSite
 * Lax, 30-minute max-age, Secure in production.
 *
 * Validation happens SERVER-SIDE on every request (getEffectiveUser): row
 * exists, not revoked, not expired, cookie holder is the row's admin AND
 * still an admin, HMAC matches. Any miss → the impersonation is treated as
 * absent and the REAL identity flows through.
 *
 * Admin routes and auth routes always use the REAL identity (getAuthedUser /
 * requireAdmin) — an impersonated context can never act as the admin, and a
 * stolen cookie without the admin's auth session is worthless.
 */

export const IMP_COOKIE = "imp";
export const IMP_TTL_MS = 30 * 60 * 1000;

function impSecret(): string {
  const secret = process.env.IMP_SECRET;
  if (!secret) {
    // Fail-closed: no secret → nothing can be signed or validated. In
    // production a missing IMP_SECRET means impersonation is unusable
    // (start refuses; validation never trusts an unsigned cookie).
    throw new Error("IMP_SECRET is not set (impersonation unavailable)");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", impSecret()).update(payload).digest("hex");
}

export function impSignature(
  id: string,
  adminUserId: string,
  targetUserId: string,
  expiresAtMs: number,
): string {
  return signPayload(`${id}|${adminUserId}|${targetUserId}|${expiresAtMs}`);
}

export function impCookieValue(
  id: string,
  adminUserId: string,
  targetUserId: string,
  expiresAt: Date,
): string {
  return `${id}.${impSignature(id, adminUserId, targetUserId, expiresAt.getTime())}`;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

async function readCookieValue(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(IMP_COOKIE)?.value ?? null;
  } catch {
    // No request scope (tests, background) — no cookie, no impersonation.
    return null;
  }
}

export type ActiveImpersonation = {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetEmail: string;
};

type ImpersonationRow = {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  target_email: string;
  expires_at: string;
  revoked_at: string | null;
};

/**
 * The active impersonation for THIS request, or null. Null means the REAL
 * identity applies. Every claim is re-derived from the DB row; the cookie
 * only names the row and carries the signature.
 */
export async function getActiveImpersonation(): Promise<ActiveImpersonation | null> {
  const raw = await readCookieValue();
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id) || sig.length !== 64) return null;

  const real = await getAuthedUser();
  if (!real) return null;

  return withUserDb({ sub: real.id }, async (db) => {
    const res = (await db.execute(sql`
      select id, admin_user_id, target_user_id, target_email, expires_at, revoked_at
      from impersonation_sessions
      where id = ${id}::uuid
    `)) as unknown as
      | Array<ImpersonationRow>
      | { rows?: ImpersonationRow[] };
    const rows = Array.isArray(res) ? res : res.rows ?? [];
    const row = rows[0];
    if (!row) return null;
    // The cookie holder must BE the row's admin (the browser holds the
    // admin's auth session); a stolen cookie alone grants nothing.
    if (row.admin_user_id !== real.id) return null;
    // The holder must still be an admin — role revocation mid-session kills
    // active impersonations on the next request.
    const roleRes = (await db.execute(
      sql`select role from profiles where id = ${real.id}::uuid`,
    )) as unknown as Array<{ role: string }> | { rows?: Array<{ role: string }> };
    const role = (Array.isArray(roleRes) ? roleRes : roleRes.rows ?? [])[0]?.role;
    if (role !== "admin") return null;
    // Expired or revoked → treated as absent (fail-closed).
    if (row.revoked_at !== null) return null;
    const expiresAtMs = new Date(row.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return null;
    // HMAC covers id|admin|target|expiry as stored in the ROW.
    const expected = impSignature(
      row.id,
      row.admin_user_id,
      row.target_user_id,
      expiresAtMs,
    );
    if (!safeEqual(sig, expected)) return null;
    return {
      id: row.id,
      adminUserId: row.admin_user_id,
      targetUserId: row.target_user_id,
      targetEmail: row.target_email,
    };
  });
}

/**
 * Effective identity for tenant pages/actions/APIs: the impersonation
 * target when validly impersonating, otherwise the real user. This is the
 * ONLY seam where the effective identity is produced; admin and auth routes
 * never call it.
 */
export async function getEffectiveUser(): Promise<AuthedUser | null> {
  const real = await getAuthedUser();
  if (!real) return null;
  try {
    const imp = await getActiveImpersonation();
    if (!imp) return real;
    return { id: imp.targetUserId, email: imp.targetEmail };
  } catch {
    // Fail-closed: any misconfiguration (e.g. missing IMP_SECRET in a
    // mis-deployed production) means NO effective identity switching.
    return real;
  }
}
