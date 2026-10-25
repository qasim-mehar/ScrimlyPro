import Link from "next/link";

import { SparklesIcon } from "@/components/dashboard/icons";
import type { DashboardData } from "@/lib/dashboard/queries";

/**
 * Scrimly AI dark card (M5 §4.4/§5) — OCR-queue FACTS only, no invented
 * predictions. Remapped to real states (report §3): red = drafts ≥24h old,
 * orange = fresh drafts awaiting review, lime = active sessions. "Review
 * queue" routes to the featured session (the real upload/review surface —
 * no standalone ingest page exists); hidden when there is no session.
 */

function relativeMinutes(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  return mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)}h ago`;
}

export function AiCard({ data }: { data: DashboardData }) {
  const stale = data.attentionList.filter((i) =>
    i.key.startsWith("draft:"),
  ).length;
  const fresh = Math.max(0, data.stats.draftsAwaiting - stale);
  const atRisk = data.stats.draftsAwaiting;
  const lastEvent =
    data.notifications[0]?.at ?? null;
  const reviewHref = data.featured ? `/sessions/${data.featured.id}` : null;

  return (
    <section className="rounded-dash-lg bg-dash-ink p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-dash-lime text-dash-ink">
            <SparklesIcon width="16" height="16" />
          </span>
          <span className="text-lg font-bold text-white">Scrimly AI</span>
        </span>
        <span className="text-[13px] text-white/40">
          {relativeMinutes(lastEvent)}
        </span>
      </div>

      {atRisk === 0 ? (
        <>
          <h3 className="mt-4 text-xl font-bold text-white">
            You&apos;re all caught up
          </h3>
          <p className="mt-1 text-sm text-white/50">
            No drafts waiting for review.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-xl font-bold text-white">
            {atRisk} match{atRisk === 1 ? "" : "es"} at risk of falling behind
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {stale > 0 && (
              <li className="flex items-center gap-2.5 text-sm text-[#e5e7eb]">
                <span className="size-2.5 rounded-full bg-dash-danger-dot" aria-hidden="true" />
                {stale} draft{stale === 1 ? "" : "s"} older than 24h
              </li>
            )}
            {fresh > 0 && (
              <li className="flex items-center gap-2.5 text-sm text-[#e5e7eb]">
                <span className="size-2.5 rounded-full bg-[#f97316]" aria-hidden="true" />
                {fresh} fresh draft{fresh === 1 ? "" : "s"} awaiting review
              </li>
            )}
            {data.stats.activeSessions > 0 && (
              <li className="flex items-center gap-2.5 text-sm text-[#e5e7eb]">
                <span className="size-2.5 rounded-full bg-dash-lime" aria-hidden="true" />
                {data.stats.activeSessions} session
                {data.stats.activeSessions === 1 ? "" : "s"} still active
              </li>
            )}
          </ul>
        </>
      )}

      {reviewHref && (
        <Link
          href={reviewHref}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-dash-lime px-4 py-2 text-sm font-semibold text-dash-ink hover:opacity-90"
        >
          Review queue
        </Link>
      )}
    </section>
  );
}
