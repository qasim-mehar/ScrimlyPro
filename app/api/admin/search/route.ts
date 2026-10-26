import { adminSearch } from "@/lib/admin/dashboard-queries";
import { requireAdminApi } from "@/lib/admin/require-admin";
import { noStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/search?q= — grouped user/org search for the admin ⌘K
 * palette and the impersonation dialog. Same guard as every admin API:
 * non-admins (and cross-origin probes) get the standard 404 — the route is
 * indistinguishable from a missing one.
 */
export async function GET(req: Request) {
  await requireAdminApi(req);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await adminSearch(q);
  return noStore(results);
}
