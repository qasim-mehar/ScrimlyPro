/**
 * Dashboard loading skeleton (M5 WP11): mirrors the shell layout — sidebar,
 * top bar, greeting, featured card, table, right column — with pulsing
 * blocks. Same rhythm as the loaded page so there is no layout shift.
 */
export default function DashboardLoading() {
  return (
    <div className="dash-shell min-h-dvh">
      <div className="mx-auto flex gap-6 p-6">
        {/* Sidebar skeleton */}
        <div className="sticky top-6 hidden h-[calc(100dvh-48px)] w-[264px] shrink-0 flex-col gap-5 rounded-dash-lg bg-dash-surface p-5 lg:flex">
          <div className="h-10 w-40 animate-pulse rounded-dash-sm bg-dash-subtle" />
          <div className="h-[52px] animate-pulse rounded-dash-sm bg-dash-bg" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-dash-sm bg-dash-subtle" />
            ))}
          </div>
          <div className="mt-auto h-24 animate-pulse rounded-dash bg-dash-lime/60" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-11 w-[340px] animate-pulse rounded-dash-sm bg-dash-surface" />
            <div className="h-11 w-40 animate-pulse rounded-full bg-dash-surface" />
          </div>

          <div className="h-10 w-72 animate-pulse rounded-full bg-dash-surface" />

          <div className="grid grid-cols-[3fr_2fr] gap-6">
            <div className="flex flex-col gap-6">
              <div className="h-[420px] animate-pulse rounded-dash bg-dash-surface" />
              <div className="h-64 animate-pulse rounded-dash bg-dash-surface" />
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-10 w-64 animate-pulse rounded-full bg-dash-surface" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-dash bg-dash-surface" />
                ))}
              </div>
              <div className="h-48 animate-pulse rounded-dash bg-dash-surface" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
