"use client";

import Link from "next/link";

import { CommandPalette } from "@/components/dashboard/command-palette";
import { Notifications } from "@/components/dashboard/notifications";
import { PlusIcon } from "@/components/dashboard/icons";
import type { DashboardNotification } from "@/lib/dashboard/queries";

/**
 * Dashboard top bar (M5 §4.4): ⌘K search palette (server-backed, org
 * scoped), notifications dropdown (derived events; dot = localStorage
 * last-seen), and the New session button → the existing /sessions/new flow.
 */
export function TopBar({
  orgParam,
  notifications,
}: {
  orgParam?: string;
  notifications: DashboardNotification[];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <CommandPalette orgParam={orgParam} />

      <div className="flex items-center gap-3">
        <Notifications notifications={notifications} />
        <Link
          href="/sessions/new"
          className="flex h-11 items-center gap-2 rounded-full bg-dash-ink px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          <PlusIcon width="18" height="18" />
          New session
        </Link>
      </div>
    </div>
  );
}
