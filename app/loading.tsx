export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 p-6">
      <p className="font-display text-4xl font-bold tracking-widest text-gold">
        SCRIMLY PRO
      </p>
      <div
        role="status"
        aria-live="polite"
        className="flex w-full flex-col gap-2"
      >
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
      </div>
    </main>
  );
}
