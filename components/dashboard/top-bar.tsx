import Link from "next/link";

import { BellIcon, PlusIcon, SearchIcon } from "@/components/dashboard/icons";

/**
 * Dashboard top bar (M5 §4.4). The search button and bell become interactive
 * in WP10 (⌘K palette + notifications); New session links to the existing
 * /sessions/new flow (live route, inspection #1).
 */
export function TopBar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        aria-label="Search sessions, matches, team (Command K)"
        className="flex h-11 w-full max-w-[340px] items-center gap-3 rounded-dash-sm border border-dash-line bg-dash-surface px-4 text-sm text-dash-ink4 hover:bg-dash-subtle"
      >
        <SearchIcon width="18" height="18" />
        <span className="flex-1 text-left">Search sessions, matches, team</span>
        <kbd className="rounded-md bg-dash-lime px-1.5 py-0.5 font-sans text-xs font-semibold text-dash-ink">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-11 items-center justify-center rounded-full text-dash-ink2 hover:bg-dash-surface"
        >
          <BellIcon />
        </button>
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
