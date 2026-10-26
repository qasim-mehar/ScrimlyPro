/** Session-page skeleton — mirrors the cockpit so the layout doesn't jump. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8"
    >
      <div role="status" aria-live="polite" className="flex flex-col gap-6">
        <span className="sr-only">Loading session</span>
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 animate-pulse rounded-full bg-dash-line" />
          <div className="h-8 w-2/3 animate-pulse rounded-[8px] bg-dash-line" />
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-dash-chip bg-dash-line" />
            <div className="h-6 w-24 animate-pulse rounded-dash-chip bg-dash-line" />
          </div>
        </div>

        <div className="h-64 w-full animate-pulse rounded-dash-lg bg-dash-ink/15" />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3">
            <div className="h-9 w-64 animate-pulse rounded-full bg-dash-line" />
            <div className="h-72 w-full animate-pulse rounded-dash-lg bg-dash-surface" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-40 w-full animate-pulse rounded-dash bg-dash-surface" />
            <div className="h-32 w-full animate-pulse rounded-dash bg-dash-surface" />
          </div>
        </div>
      </div>
    </main>
  );
}
