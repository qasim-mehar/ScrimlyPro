"use client";

import Link from "next/link";

import { AccountMenu } from "@/components/app/AccountMenu";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { Notifications } from "@/components/dashboard/notifications";
import { PlusIcon } from "@/components/dashboard/icons";
import type { DashboardNotification } from "@/lib/dashboard/queries";

/**
 * Dashboard top bar (M5 §4.4): ⌘K search palette (server-backed, org
 * scoped), notifications dropdown (derived events; dot = localStorage
 * last-seen), the New session button → the existing /sessions/new flow, and
 * the account menu (sign-out — the dashboard shell has no other exit).
 */
export function TopBar({
  orgParam,
  notifications,
  email,
  drawer,
}: {
  orgParam?: string;
  notifications: DashboardNotification[];
  /** Display-only account email; drives the avatar + sign-out menu. */
  email?: string | null;
  /** Mobile navigation (the drawer-wrapped sidebar); rendered <lg only. */
  drawer?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {drawer}
        <CommandPalette orgParam={orgParam} />
      </div>

      <div className="flex items-center gap-3">
        <Notifications notifications={notifications} />
        <Link
          href="/sessions/new"
          className="flex h-11 items-center gap-2 rounded-full bg-dash-ink px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          <PlusIcon width="18" height="18" />
          New session
        </Link>
        <AccountMenu email={email ?? null} />
      </div>
    </div>
  );
}
