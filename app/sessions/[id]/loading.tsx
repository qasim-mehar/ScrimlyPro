/** Session-page skeleton — shown while the dynamic /sessions/[id] tree loads. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-md flex-col gap-4 p-4"
    >
      <div role="status" aria-live="polite" className="flex flex-col gap-4">
        <div className="h-9 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-surface-2" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-11 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-11 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-11 animate-pulse rounded-lg bg-surface-2" />
        </div>
        <div className="h-28 w-full animate-pulse rounded-lg bg-surface-2" />
      </div>
    </main>
  );
}
