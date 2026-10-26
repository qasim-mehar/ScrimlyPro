import { AdminShell } from "@/components/admin/shell/AdminShell";
import { getAdminNavData, getRecentAuditEvents } from "@/lib/admin/dashboard-queries";
import { requireAdmin } from "@/lib/admin/require-admin";

import "@/styles/admin-theme.css";

/**
 * M6 light admin chrome (design spec §4). The layout guard is defense in
 * depth — every page under /admin ALSO calls requireAdmin() itself. Non-
 * admins never see this chrome: the guard 404s identically to a missing
 * route. The admin theme stylesheet is imported HERE only, so member
 * surfaces never load it; the global stylesheet stays untouched.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();

  const [nav, events] = await Promise.all([
    getAdminNavData(),
    getRecentAuditEvents(10),
  ]);
  const envLabel =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";

  return (
    <AdminShell
      envLabel={envLabel}
      counts={{
        orgs: nav.orgs,
        users: nav.users,
        flags: nav.flags,
        activeImpersonations: nav.activeImpersonations,
      }}
      system={{ aiOn: nav.aiOn, reads7d: nav.reads7d, usersFlagged: nav.usersFlagged }}
      events={events}
      email={user.email}
    >
      {children}
    </AdminShell>
  );
}
