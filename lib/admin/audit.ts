import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { clientIpKey } from "@/lib/auth/rate-limit";

import { getAdminDb } from "./admin-db";

/**
 * Audit-log writer for admin actions (M3 brief rule 6/9). Rows are
 * append-only at the RLS level (no update/delete policies for anyone); the
 * service-role path used here is the only writer and nothing rewrites.
 *
 * PII discipline: no tokens, no emails, no raw IPs — the client IP is stored
 * as sha256(ip + AUDIT_SALT) so ops can correlate without storing PII.
 */
export function auditIpHash(req?: Request | null): string | null {
  if (!req) return null; // server actions: no request object → no ip correlation
  const salt = process.env.AUDIT_SALT;
  if (!salt) {
    // Fail-closed on correlation data, not on the action itself: without the
    // salt we simply record no ip_hash rather than a hashable-by-anyone one.
    return null;
  }
  const ip = clientIpKey(req);
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(ip + salt).digest("hex");
}

export type AuditEntry = {
  actorUserId: string;
  effectiveUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
};

export async function insertAuditRow(entry: AuditEntry): Promise<void> {
  const db = getAdminDb();
  await db.execute(sql`
    insert into audit_log
      (id, actor_user_id, effective_user_id, action, target_type, target_id, metadata, ip_hash)
    values (
      gen_random_uuid(),
      ${entry.actorUserId}::uuid,
      ${entry.effectiveUserId ?? null}::uuid,
      ${entry.action},
      ${entry.targetType ?? null},
      ${entry.targetId ?? null}::uuid,
      ${JSON.stringify(entry.metadata ?? {})}::jsonb,
      ${entry.ipHash ?? null}
    )
  `);
}
