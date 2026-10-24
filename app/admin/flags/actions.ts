"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { auditIpHash, insertAuditRow } from "@/lib/admin/audit";
import { getAdminDb } from "@/lib/admin/admin-db";
import { requireAdmin } from "@/lib/admin/require-admin";

/**
 * Feature-flag editor server actions (admin console). Each action:
 * requireAdmin() (404 for non-admins) → strict validation → upsert/delete on
 * the service-role admin-db → audited admin.flag.set / admin.flag.delete.
 *
 * The `disabled` flag on a user is RESERVED (kill switch): the tenants
 * console's disable/enable API is the intended writer; the editor may set
 * it but the UI labels it reserved and the semantics are documented here:
 * presence of the row = account locked out everywhere (requireUser choke
 * point), value carries metadata only.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FLAG_RE = /^[a-z0-9_.-]{1,100}$/;
const SUBJECT_TYPES = new Set(["user", "org", "global"]);

export type FlagActionResult = { ok: true } | { ok: false; error: string };

export async function setFlagAction(
  _prev: FlagActionResult | null,
  formData: FormData,
): Promise<FlagActionResult> {
  const admin = await requireAdmin();

  const subjectType = String(formData.get("subjectType") ?? "");
  const subjectIdRaw = String(formData.get("subjectId") ?? "").trim();
  const flag = String(formData.get("flag") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "{}").trim();

  if (!SUBJECT_TYPES.has(subjectType)) return { ok: false, error: "subject_type must be user|org|global" };
  if (!FLAG_RE.test(flag)) return { ok: false, error: "flag must match [a-z0-9_.-]{1,100}" };
  let subjectId: string | null = null;
  if (subjectType === "global") {
    if (subjectIdRaw) return { ok: false, error: "global flags have no subject_id" };
  } else {
    if (!UUID_RE.test(subjectIdRaw)) return { ok: false, error: "subject_id must be a uuid for user/org flags" };
    subjectId = subjectIdRaw;
  }
  let value: unknown;
  try {
    value = JSON.parse(valueRaw || "{}");
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("obj");
  } catch {
    return { ok: false, error: "value must be a JSON object" };
  }
  if (valueRaw.length > 4096) return { ok: false, error: "value too large (4KB max)" };

  const db = getAdminDb();
  if (subjectType !== "global") {
    const t = await db.execute(sql`select id from auth.users where id = ${subjectId}::uuid`);
    const rows = Array.isArray(t) ? t : (t as { rows?: unknown[] }).rows ?? [];
    if (rows.length === 0) return { ok: false, error: "subject user does not exist" };
  }

  await db.execute(sql`
    insert into feature_flags (id, subject_type, subject_id, flag, value, updated_by)
    values (gen_random_uuid(), ${subjectType}, ${subjectId}::uuid, ${flag},
            ${JSON.stringify(value)}::jsonb, ${admin.id}::uuid)
    on conflict (subject_type, subject_id, flag)
    do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
  `);

  await insertAuditRow({
    actorUserId: admin.id,
    effectiveUserId: admin.id,
    action: "admin.flag.set",
    targetType: "feature_flag",
    targetId: null,
    metadata: { flag, subject_type: subjectType, subject_id: subjectId, value },
    ipHash: auditIpHash(null),
  });

  revalidatePath("/admin/flags");
  return { ok: true };
}

export async function deleteFlagAction(
  _prev: FlagActionResult | null,
  formData: FormData,
): Promise<FlagActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_RE.test(id)) return { ok: false, error: "bad flag id" };

  const db = getAdminDb();
  const existing = await db.execute(
    sql`select flag, subject_type, subject_id from feature_flags where id = ${id}::uuid`,
  );
  const rows = Array.isArray(existing)
    ? (existing as unknown as Array<{ flag: string; subject_type: string; subject_id: string | null }>)
    : (existing as { rows?: Array<{ flag: string; subject_type: string; subject_id: string | null }> }).rows ?? [];
  const row = rows[0];
  if (!row) return { ok: false, error: "flag not found" };

  await db.execute(sql`delete from feature_flags where id = ${id}::uuid`);

  await insertAuditRow({
    actorUserId: admin.id,
    effectiveUserId: admin.id,
    action: "admin.flag.delete",
    targetType: "feature_flag",
    targetId: null,
    metadata: { flag: row.flag, subject_type: row.subject_type, subject_id: row.subject_id },
    ipHash: auditIpHash(),
  });

  revalidatePath("/admin/flags");
  return { ok: true };
}
