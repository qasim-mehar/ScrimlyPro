import { noStore } from "@/lib/http";
import { withTenantRoute } from "@/lib/auth/route-guard";
import { withUserDb } from "@/lib/db/user";
import { dashboardSearch } from "@/lib/dashboard/queries";
import { resolveActiveOrg } from "@/lib/dashboard/org";

/**
 * GET /api/dashboard/search?q=&org= (M5 §6): org-scoped ⌘K search over
 * sessions + matches (member names/emails are NOT searchable — profiles is
 * self-rows-only under RLS; documented deviation, report §3). Runs entirely
 * through the one true guard stack (withTenantRoute: origin → identity →
 * kill switch → rate limit) and the RLS client. 404 law: an org param that
 * is not one of the caller's memberships is indistinguishable from
 * not-found. Response is always no-store.
 */
export const GET = withTenantRoute(async (request, { user }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const orgParam = url.searchParams.get("org") ?? undefined;

  const { active } = await withUserDb({ sub: user.id }, (userDb) =>
    resolveActiveOrg(userDb, user.id, orgParam),
  );
  if (orgParam !== undefined && !active) {
    return noStore({ error: "not found" }, { status: 404 });
  }
  if (!active) {
    return noStore({ sessions: [], matches: [] });
  }

  const results = await withUserDb({ sub: user.id }, (userDb) =>
    dashboardSearch(userDb, active.id, q),
  );
  return noStore(results);
});
