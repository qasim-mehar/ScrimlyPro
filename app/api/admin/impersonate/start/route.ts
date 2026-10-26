import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { auditIpHash, insertAuditRow } from "@/lib/admin/audit";
import { getAdminDb } from "@/lib/admin/admin-db";
import {
  getActiveImpersonation,
  IMP_COOKIE,
  IMP_TTL_MS,
  impCookieValue,
} from "@/lib/admin/impersonation";
import { requireAdminApi } from "@/lib/admin/require-admin";
import { badRequest } from "@/lib/auth/route-helpers";
import { parseJsonObject } from "@/lib/auth/validate";
import { noStore } from "@/lib/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/impersonate/start { targetUserId, reason }
 *
 * Creates an impersonation_sessions row (30-minute expiry) and sets the
 * signed HttpOnly cookie `${id}.${hmac(id|admin|target|exp)}`. Refuses:
 * double impersonation (a valid impersonation already active on this
 * request), self-target, admin targets, unknown targets. Audited as
 * admin.impersonation.start. 404 for anyone but a DB-verified admin.
 */
export async function POST(req: Request) {
  const admin = await requireAdminApi(req); // REAL identity, always

  // Rule: cannot start while already impersonating.
  const already = await getActiveImpersonation().catch(() => "err");
  if (already !== null) {
    if (already === "err") return noStore({ error: "internal error" }, { status: 500 });
    return noStore({ error: "already_impersonating" }, { status: 403 });
  }

  const body = parseJsonObject(await req.json().catch(() => null));
  const targetUserId =
    typeof body?.targetUserId === "string" ? body.targetUserId : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!UUID_RE.test(targetUserId) || reason.length === 0 || reason.length > 500) {
    return badRequest();
  }
  if (targetUserId === admin.id) return badRequest();

  const db = getAdminDb();
  const targetRes = (await db.execute(sql`
    select u.id, u.email, (select role from profiles p where p.id = u.id) as role
    from auth.users u where u.id = ${targetUserId}::uuid
  `)) as unknown as
    | Array<{ id: string; email: string | null; role: string | null }>
    | { rows?: Array<{ id: string; email: string | null; role: string | null }> };
  const targetRows = Array.isArray(targetRes) ? targetRes : targetRes.rows ?? [];
  const target = targetRows[0];
  if (!target) return noStore({ error: "not_found" }, { status: 404 });
  // Admins are not impersonatable tenants (operator safety, no confusion
  // about which admin surface an admin-cookie context may reach).
  if (target.role === "admin") return noStore({ error: "forbidden" }, { status: 403 });

  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + IMP_TTL_MS);
  const targetEmail = target.email ?? "(no email)";

  await db.execute(sql`
    insert into impersonation_sessions
      (id, admin_user_id, target_user_id, target_email, reason, expires_at)
    values (${id}::uuid, ${admin.id}::uuid, ${targetUserId}::uuid,
            ${targetEmail}, ${reason}, ${expiresAt.toISOString()})
  `);

  await insertAuditRow({
    actorUserId: admin.id,
    effectiveUserId: admin.id,
    action: "admin.impersonation.start",
    targetType: "user",
    targetId: targetUserId,
    metadata: { reason, impersonation_id: id, expires_at: expiresAt.toISOString() },
    ipHash: auditIpHash(req),
  });

  const store = await cookies();
  store.set(IMP_COOKIE, impCookieValue(id, admin.id, targetUserId, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(IMP_TTL_MS / 1000),
  });

  return noStore({ ok: true });
}
