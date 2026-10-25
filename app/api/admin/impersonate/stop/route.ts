import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { auditIpHash, insertAuditRow } from "@/lib/admin/audit";
import { getAdminDb } from "@/lib/admin/admin-db";
import { getActiveImpersonation, IMP_COOKIE } from "@/lib/admin/impersonation";
import { requireAdminApi } from "@/lib/admin/require-admin";
import { parseJsonObject } from "@/lib/auth/validate";
import { noStore } from "@/lib/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/impersonate/stop  { id? }
 *
 * Two sanctioned callers (M3 brief rule 6):
 *  - the cookie holder: validates the IMP cookie against the ledger row and
 *    revokes it (the banner's "Exit impersonation");
 *  - a DB-verified real admin, by row id (the dashboard's global stop).
 *
 * Anyone else — including a stolen cookie held by a different account —
 * gets 403; the row stays live. Validated from the COOKIE (not the current
 * effective identity), so stopping works while impersonating. Audited as
 * admin.impersonation.stop.
 */
export async function POST(req: Request) {
  const real = await requireAdminApi(req); // REAL identity, always

  const body = await req
    .json()
    .then((v) => parseJsonObject(v))
    .catch(() => null);
  const bodyId = typeof body?.id === "string" ? body.id : "";

  let impId: string;
  let targetUserId: string;
  let viaCookie = false;

  if (bodyId) {
    // Global stop by row id — real admin only (requireAdminApi above).
    if (!UUID_RE.test(bodyId)) return noStore({ error: "bad_request" }, { status: 400 });
    impId = bodyId;
    const db = getAdminDb();
    const res = (await db.execute(
      sql`select target_user_id from impersonation_sessions where id = ${impId}::uuid`,
    )) as unknown as Array<{ target_user_id: string }> | { rows?: Array<{ target_user_id: string }> };
    const rows = Array.isArray(res) ? res : res.rows ?? [];
    const row = rows[0];
    if (!row) return noStore({ error: "not_found" }, { status: 404 });
    targetUserId = row.target_user_id;
  } else {
    // Cookie-holder stop: validate the cookie against the ledger.
    const active = await getActiveImpersonation();
    if (!active) {
      // No valid impersonation for this caller → 403 (they are neither the
      // cookie holder of a live session nor stopping by id as an admin
      // path would have required a valid id).
      return noStore({ error: "forbidden" }, { status: 403 });
    }
    if (active.adminUserId !== real.id) {
      return noStore({ error: "forbidden" }, { status: 403 });
    }
    impId = active.id;
    targetUserId = active.targetUserId;
    viaCookie = true;
  }

  const db = getAdminDb();
  const revoked = await db.execute(sql`
    update impersonation_sessions
    set revoked_at = now()
    where id = ${impId}::uuid and revoked_at is null
  `);

  await insertAuditRow({
    actorUserId: real.id,
    effectiveUserId: viaCookie ? targetUserId : real.id,
    action: "admin.impersonation.stop",
    targetType: "impersonation",
    targetId: null,
    metadata: { impersonation_id: impId, stopped_target: targetUserId, via_cookie: viaCookie },
    ipHash: auditIpHash(req),
  });

  if (viaCookie) {
    const store = await cookies();
    store.set(IMP_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  }

  const count = (revoked as unknown as { count?: number; rowCount?: number }).count ??
    (revoked as unknown as { rowCount?: number }).rowCount ?? 0;
  return noStore({ ok: true, revoked: count > 0 });
}
