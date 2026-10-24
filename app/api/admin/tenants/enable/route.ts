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
 * POST /api/admin/tenants/enable { userId }
 *
 * Removes the RESERVED `disabled` marker; the tenant can use authed surfaces
 * again immediately (requireUser() choke point re-evaluates per request).
 * Audited as admin.tenant.enable.
 */
export async function POST(req: Request) {
  const admin = await requireAdminApi(req);

  const body = parseJsonObject(await req.json().catch(() => null));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!UUID_RE.test(userId)) return badRequest();

  const db = getAdminDb();
  const target = (await db.execute(
    sql`select id from auth.users where id = ${userId}::uuid`,
  )) as unknown as { rows?: unknown[] };
  const rows = Array.isArray(target) ? target : target.rows ?? [];
  if (rows.length === 0) return noStore({ error: "not_found" }, { status: 404 });

  await db.execute(sql`
    delete from feature_flags
    where subject_type = 'user' and subject_id = ${userId}::uuid and flag = 'disabled'
  `);

  await insertAuditRow({
    actorUserId: admin.id,
    effectiveUserId: admin.id,
    action: "admin.tenant.enable",
    targetType: "user",
    targetId: userId,
    metadata: {},
    ipHash: auditIpHash(req),
  });

  return noStore({ ok: true });
}
