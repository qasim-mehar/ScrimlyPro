import Link from "next/link";

import type { ActiveOrg } from "@/lib/orgs/orgs";
import {
  AlertIcon,
  CameraIcon,
  ChartIcon,
  ChevronDownIcon,
  FolderIcon,
  GridIcon,
  LinkIcon,
  ListIcon,
  LogoMark,
  PanelIcon,
  SettingsIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/dashboard/icons";

/**
 * Floating dashboard sidebar (M5 §4.4). Live links only where the route
 * exists (pre-flight inspection #1); everything else renders disabled with
 * a "Soon" tooltip — no invented pages.
 */

export type NavCounts = {
  sessions: number;
  matches: number;
  drafts: number;
  attention: number;
};

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="rounded-full bg-dash-bg px-2 py-0.5 text-xs font-semibold text-dash-ink3">
      {n}
    </span>
  );
}

function NavItem({
  icon,
  label,
  href,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  count?: number;
  active?: boolean;
}) {
  if (active) {
    return (
      <span
        aria-current="page"
        className="flex min-h-[40px] items-center gap-3 rounded-dash-sm bg-dash-ink px-3 py-2 text-sm font-medium text-white"
      >
        {icon}
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
            {count}
          </span>
        )}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex min-h-[40px] items-center gap-3 rounded-dash-sm px-3 py-2 text-sm font-medium text-dash-ink2 hover:bg-dash-subtle"
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <CountBadge n={count} />}
    </Link>
  );
}

function SoonItem({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <span
      aria-disabled="true"
      title="Soon"
      className="flex min-h-[40px] cursor-default items-center gap-3 rounded-dash-sm px-3 py-2 text-sm font-medium text-dash-ink4"
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <CountBadge n={count} />}
      <span className="sr-only">(coming soon)</span>
    </span>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-dash-ink4">
      {children}
    </p>
  );
}

export function Sidebar({
  orgs,
  activeOrg,
  counts,
  readsLeft,
}: {
  orgs: ActiveOrg[];
  activeOrg: ActiveOrg | null;
  counts: NavCounts;
  /** Real OCR reads left this month (org limit − user meter); null hides
   *  the count (quota unknown is not representable today — the org quota
   *  row always exists — but the prop keeps the honest fallback open). */
  readsLeft: number | null;
}) {
  return (
    <aside className="sticky top-6 flex h-[calc(100dvh-48px)] w-[264px] shrink-0 flex-col rounded-dash-lg bg-dash-surface p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-dash-sm bg-dash-ink text-white">
            <LogoMark />
          </span>
          <span className="text-lg font-bold">ScrimlyPro</span>
        </span>
        <span aria-hidden="true" className="text-dash-ink4">
          <PanelIcon />
        </span>
      </div>

      {/* Org switcher — reuses the explicit-org pattern (lib/dashboard/org.ts):
          each entry links /dashboard?org=<id>; foreign ids 404 on the page. */}
      <details className="group mt-5">
        <summary
          className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 rounded-dash-sm bg-dash-bg p-2 [&::-webkit-details-marker]:hidden"
          aria-label={
            activeOrg
              ? `Active organization ${activeOrg.name} (${activeOrg.role})`
              : "Choose organization"
          }
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dash-line bg-dash-surface text-dash-ink2">
            <UsersIcon width="16" height="16" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-dash-ink">
              {activeOrg ? activeOrg.name : "No organization"}
            </span>
            <span className="block truncate text-[13px] capitalize text-dash-ink4">
              {activeOrg ? activeOrg.role : "not a member yet"}
            </span>
          </span>
          <span className="text-dash-ink4 transition-transform group-open:rotate-180">
            <ChevronDownIcon width="16" height="16" />
          </span>
        </summary>
        <div className="mt-2 rounded-dash-sm border border-dash-line bg-dash-surface p-1">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard?org=${org.id}`}
              className={`flex min-h-[40px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-dash-subtle ${
                activeOrg?.id === org.id
                  ? "font-semibold text-dash-ink"
                  : "text-dash-ink2"
              }`}
            >
              <span className="truncate">{org.name}</span>
              <span className="text-[11px] capitalize text-dash-ink4">
                {org.role}
              </span>
            </Link>
          ))}
          <Link
            href="/orgs/new"
            className="flex min-h-[40px] items-center rounded-lg px-3 py-2 text-sm font-medium text-dash-lime-ink hover:bg-dash-subtle"
          >
            + New organization
          </Link>
        </div>
      </details>

      <nav aria-label="Dashboard" className="mt-3 flex-1 overflow-y-auto">
        <NavItem
          icon={<GridIcon />}
          label="Dashboard"
          href="/dashboard"
          active
        />

        <GroupHeader>Scrim</GroupHeader>
        {/* No sessions index route exists (inspection #1) — disabled "Soon". */}
        <SoonItem icon={<FolderIcon />} label="Sessions" count={counts.sessions} />
        <SoonItem icon={<ListIcon />} label="Matches" count={counts.matches} />
        <SoonItem icon={<TrophyIcon />} label="Standings" />
        <SoonItem icon={<CameraIcon />} label="Screenshots" count={counts.drafts} />
        <SoonItem icon={<LinkIcon />} label="Share links" />

        <GroupHeader>Workspace</GroupHeader>
        <NavItem
          icon={<AlertIcon />}
          label="Attention"
          href="/dashboard#attention"
          count={counts.attention}
        />
        <SoonItem icon={<SparklesIcon />} label="AI reader" />
        {activeOrg ? (
          <NavItem
            icon={<UsersIcon />}
            label="Team"
            href={`/orgs/${activeOrg.id}`}
          />
        ) : (
          <SoonItem icon={<UsersIcon />} label="Team" />
        )}
        <SoonItem icon={<ChartIcon />} label="Reports" />
        <SoonItem icon={<SettingsIcon />} label="Settings" />
      </nav>

      {/* Scrimly AI card — quota subtitle from the real per-user month
          meter vs this org's limit (lib/dashboard/queries.ts). Not a
          settings toggle: no AI-reader page exists, so the switch visual
          announces "Soon" and the pill links nothing. */}
      <div className="mt-4 rounded-dash bg-dash-lime p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-dash-ink">
            <span className="flex size-8 items-center justify-center rounded-full bg-dash-ink text-white">
              <SparklesIcon width="16" height="16" />
            </span>
            Scrimly AI
          </span>
          <span
            aria-hidden="true"
            title="AI reader — Soon"
            className="flex h-6 w-10 items-center rounded-full bg-dash-ink px-0.5"
          >
            <span className="ml-auto size-5 rounded-full bg-white" />
          </span>
        </div>
        <p className="mt-1.5 text-[13px] font-medium text-dash-lime-ink">
          On{readsLeft !== null ? ` · ${readsLeft} reads left` : ""}
        </p>
      </div>
    </aside>
  );
}
