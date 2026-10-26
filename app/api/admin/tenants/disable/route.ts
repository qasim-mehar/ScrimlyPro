import { sql } from "drizzle-orm";

import { auditIpHash, insertAuditRow } from "@/lib/admin/audit";
import { getAdminDb } from "@/lib/admin/admin-db";
import { requireAdminApi } from "@/lib/admin/require-admin";
import { badRequest } from "@/lib/auth/route-helpers";
import { parseJsonObject } from "@/lib/auth/validate";
import { noStore } from "@/lib/http";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/tenants/disable { userId, reason }
 *
 * Kill switch (M3 brief §5/rule 8): writes the RESERVED `disabled` marker on
 * the user; requireUser() locks the tenant out of every authed surface at
 * the next request. Audited as admin.tenant.disable (actor + target). 404
 * for anyone but a DB-verified admin — indistinguishable from a missing
 * route.
 */
export async function POST(req: Request) {
  const admin = await requireAdminApi(req);

  const body = parseJsonObject(await req.json().catch(() => null));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const reason =
    typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!UUID_RE.test(userId) || reason.length === 0 || reason.length > 500) {
    return badRequest();
  }

  const db = getAdminDb();
  const target = (await db.execute(
    sql`select id from auth.users where id = ${userId}::uuid`,
  )) as unknown as { rows?: unknown[] };
  const rows = Array.isArray(target) ? target : target.rows ?? [];
  if (rows.length === 0) return noStore({ error: "not_found" }, { status: 404 });

  await db.execute(sql`
    insert into feature_flags (id, subject_type, subject_id, flag, value, updated_by)
    values (gen_random_uuid(), 'user', ${userId}::uuid, 'disabled',
            ${JSON.stringify({ reason, disabled_at: new Date().toISOString() })}::jsonb,
            ${admin.id}::uuid)
    on conflict (subject_type, subject_id, flag)
    do update set value = excluded.value, updated_by = excluded.updated_by,
                  updated_at = now()
  `);

  await insertAuditRow({
    actorUserId: admin.id,
    effectiveUserId: admin.id,
    action: "admin.tenant.disable",
    targetType: "user",
    targetId: userId,
    metadata: { reason },
    ipHash: auditIpHash(req),
  });

  return noStore({ ok: true });
}
