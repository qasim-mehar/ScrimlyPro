import { LogoMark } from "@/components/dashboard/icons";

export default function Loading() {
  return (
    <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="mx-auto flex w-fit items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-dash-ink">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-dash-ink text-white">
            <LogoMark width="17" height="17" />
          </span>
          ScrimlyPro
        </p>

        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-dash-lg bg-dash-surface p-6 sm:p-8"
        >
          <span className="sr-only">Loading</span>
          <div className="h-5 w-24 animate-pulse rounded-full bg-dash-bg" />
          <div className="mt-4 h-8 w-3/4 animate-pulse rounded-[8px] bg-dash-bg" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-[6px] bg-dash-bg" />
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-12 w-full animate-pulse rounded-dash-sm bg-dash-bg" />
            <div className="h-12 w-full animate-pulse rounded-dash-sm bg-dash-bg" />
            <div className="h-12 w-2/3 animate-pulse rounded-dash-sm bg-dash-bg" />
          </div>
        </div>
      </div>
    </main>
  );
}
