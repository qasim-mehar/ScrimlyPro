"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { ImpersonateDialog } from "./ImpersonateDialog";
import { NotificationsBell, type BellEvent } from "./NotificationsBell";
import { SearchField } from "./SearchField";
import {
  IconBuilding,
  IconChart,
  IconDashboard,
  IconEye,
  IconFlag,
  IconMenu,
  IconScroll,
  IconSliders,
  IconSparkles,
  IconUsers,
  IconX,
  LogoMark,
  type IconProps,
} from "./icons";

/**
 * M6 admin chrome (design spec §4.4/§4.5): floating white sidebar with the
 * Platform HQ block + nav groups + lime system card, top bar with search /
 * bell / "+ Impersonate", and the two-column content slot. Client component
 * only because of the mobile drawer + active-route highlight; all DATA
 * arrives via props from the server layout (guard + queries live there).
 */

export type ShellCounts = {
  orgs: number;
  users: number;
  flags: number;
  activeImpersonations: number;
};

export type ShellEvents = BellEvent[];

export type ShellSystemCard = {
  aiOn: boolean;
  reads7d: number;
  usersFlagged: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  badge?: number;
  /** Route not built yet — rendered disabled with a "Soon" tooltip. */
  soon?: boolean;
};

function navGroups(counts: ShellCounts): Array<{ title: string; items: NavItem[] }> {
  return [
    {
      title: "Platform",
      items: [
        { href: "/admin", label: "Overview", icon: IconDashboard },
        {
          href: "/admin/orgs",
          label: "Organizations",
          icon: IconBuilding,
          badge: counts.orgs,
        },
        { href: "/admin/tenants", label: "Users", icon: IconUsers, badge: counts.users },
      ],
    },
    {
      title: "Control",
      items: [
        { href: "/admin/flags", label: "AI & Flags", icon: IconFlag, badge: counts.flags },
        { href: "/admin/audit", label: "Audit Log", icon: IconScroll },
        { href: "/admin#impersonations", label: "Impersonations", icon: IconEye, badge: counts.activeImpersonations },
      ],
    },
    {
      title: "Workspace",
      items: [
        { href: "/admin/reports", label: "Reports", icon: IconChart, soon: true },
        { href: "/admin/settings", label: "Settings", icon: IconSliders, soon: true },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({
  envLabel,
  counts,
  system,
  onNavigate,
}: {
  envLabel: string;
  counts: ShellCounts;
  system: ShellSystemCard;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[var(--hq-ink)] text-white">
          <LogoMark size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[18px] font-bold leading-tight">
            ScrimlyPro
          </span>
          <span className="block truncate text-[12px] text-[var(--hq-ink-3)]">
            Platform HQ · {envLabel}
          </span>
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-5" aria-label="Admin">
        {navGroups(counts).map((group) => (
          <div key={group.title}>
            <p className="hq-nav-group px-3 pb-2">{group.title}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) =>
                item.soon ? (
                  <li key={item.label}>
                    <span
                      className="hq-nav-item"
                      aria-disabled="true"
                      title="Soon — this surface is not built yet"
                    >
                      <item.icon size={20} />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="hq-nav-badge">{item.badge}</span>
                      ) : (
                        <span className="hq-nav-badge" data-soon>
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="hq-nav-item"
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <item.icon size={20} />
                      <span className="truncate">{item.label}</span>
                      {!!item.badge && (
                        <span className="hq-nav-badge">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </nav>

      {/* System card — mirrors the global AI flag; click-through to the real
          editor. Not a toggle. */}
      <Link
        href="/admin/flags"
        className="mt-auto block rounded-2xl bg-[var(--hq-lime)] p-4 text-[var(--hq-ink)]"
        title="Manage platform flags"
      >
        <span className="flex items-center gap-2">
          <IconSparkles size={18} />
          <span className="text-[14px] font-bold">Scrimly AI</span>
          <span className="hq-switch ml-auto" data-off={system.aiOn ? undefined : "true"} />
        </span>
        <span className="mt-1.5 block text-[12px] font-semibold text-[var(--hq-lime-ink)]">
          {system.aiOn ? "On" : "Off"} · {system.reads7d.toLocaleString()} reads · 7 days
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--hq-ink-2)]">
          {system.usersFlagged > 0
            ? `${system.usersFlagged} user${system.usersFlagged === 1 ? "" : "s"} flagged`
            : "All clear"}
        </span>
      </Link>
    </>
  );
}

export function AdminShell({
  envLabel,
  counts,
  system,
  events,
  children,
}: {
  envLabel: string;
  counts: ShellCounts;
  system: ShellSystemCard;
  events: ShellEvents;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="admin-scope min-h-dvh">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[var(--hq-ink)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px] gap-6 p-4 lg:p-6">
        {/* Desktop sidebar — floating white panel (24px radius, 24px rhythm). */}
        <aside className="sticky top-6 hidden max-h-[calc(100dvh-48px)] w-[264px] flex-none flex-col gap-6 overflow-y-auto rounded-[24px] bg-[var(--hq-surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:flex">
          <SidebarContent envLabel={envLabel} counts={counts} system={system} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar (§4.4): search field, bell, primary action. Search /
              bell / impersonation behaviors land with WP10/WP11; the chrome
              is present from WP1. */}
          <header className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface)] lg:hidden"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <IconMenu />
            </button>

            <SearchField />

            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell events={events} />
              <ImpersonateDialog />
            </div>
          </header>

          <main id="admin-main" className="mt-6 min-w-0 flex-1 pb-4">{children}</main>
        </div>
      </div>

      {/* Mobile drawer (<1024px): same sidebar content, overlaid. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col gap-6 overflow-y-auto bg-[var(--hq-surface)] p-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[18px] font-bold">ScrimlyPro</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)]"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              >
                <IconX />
              </button>
            </div>
            <SidebarContent
              envLabel={envLabel}
              counts={counts}
              system={system}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
