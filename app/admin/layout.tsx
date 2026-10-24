import Link from "next/link";

import { requireAdmin } from "@/lib/admin/require-admin";

/**
 * Operator console chrome. The layout guard is defense in depth — every
 * page under /admin ALSO calls requireAdmin() itself (rule 3: every admin
 * route re-checks server-side). Non-admins never see this chrome: the
 * guard 404s identically to a missing route.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/tenants", label: "Tenants" },
    { href: "/admin/flags", label: "Flags" },
    { href: "/admin/audit", label: "Audit" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="font-display text-lg font-bold tracking-widest text-gold">
            SCRIMLY<span className="text-white">//ADMIN</span>
          </span>
          <nav className="flex gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
