import type { Db } from "@/lib/db/client";
import { getActiveOrgs, type ActiveOrg } from "@/lib/orgs/orgs";

/**
 * Active-org resolution for the dashboard (M5). There is NO active-org
 * cookie in this codebase (pre-flight inspection #2) — org context is the
 * existing explicit pattern: derive the first org (oldest membership, the
 * same ordering getActiveOrgs/ensurePersonalOrg use) or honor an explicit
 * `?org=<uuid>` param.
 *
 * Membership is proven BY getActiveOrgs (it selects only the caller's
 * memberships under RLS): a param value absent from that list is foreign or
 * malformed, and the caller renders notFound() — the 404 law (foreign org
 * access is indistinguishable from not-found; existence never confirmed to
 * non-members).
 */
export async function resolveActiveOrg(
  db: Db,
  userId: string,
  orgParam: string | undefined,
): Promise<{ orgs: ActiveOrg[]; active: ActiveOrg | null }> {
  const orgs = await getActiveOrgs(db, userId);
  if (orgParam !== undefined) {
    return { orgs, active: orgs.find((o) => o.id === orgParam) ?? null };
  }
  return { orgs, active: orgs[0] ?? null };
}
