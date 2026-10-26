import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/dashboard/icons";
import type { FeaturedSession } from "@/lib/dashboard/queries";

/**
 * Featured session card (M5 §4.4): the newest ACTIVE session. The hero is a
 * rendered dark panel with a lime grid texture showing the REAL top-3 mini
 * standings over confirmed matches (no stock photos); the white content box
 * overlaps it. Deviations (no code/lobby/format/schedule columns exist):
 * code = id-derived, meta line = created date · planned · teams, third stat
 * = Created. See report §3.
 */

export function featuredProgress(
  confirmed: number,
  planned: number,
): number | null {
  if (planned <= 0) return null;
  return Math.round((confirmed / planned) * 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatusTag({ status }: { status: "active" | "completed" }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-dash-amber px-3 py-1 text-xs font-semibold text-white">
        In progress
      </span>
    );
  }
  return (
    <span className="rounded-full bg-dash-ink px-3 py-1 text-xs font-semibold text-white">
      Completed
    </span>
  );
}

export function FeaturedCard({ session }: { session: FeaturedSession }) {
  const progress = featuredProgress(session.confirmedCount, session.plannedMatches);
  const played = session.confirmedCount + session.draftCount;

  return (
    <section className="overflow-hidden rounded-dash bg-dash-surface">
      {/* Hero: dark panel, lime grid texture, real top-3 standings. */}
      <div className="relative bg-dash-ink p-6 pb-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(#d9f99d 1px, transparent 1px), linear-gradient(90deg, #d9f99d 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dash-lime">
            Top standings
          </p>
          {session.topStandings.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {session.topStandings.map((row, i) => (
                <li
                  key={row.teamName}
                  className="flex items-center justify-between gap-4 rounded-dash-sm bg-white/[0.06] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-3 text-sm text-white">
                    <span className="w-4 shrink-0 text-xs font-bold text-dash-lime">
                      {i + 1}
                    </span>
                    <span className="truncate">{row.teamName}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-dash-lime">
                    {row.total} pts
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-dash-sm bg-white/[0.06] px-3 py-6 text-center">
              <p className="text-sm font-semibold text-white">{session.name}</p>
              <p className="mt-1 text-xs text-white/60">
                Waiting for first match
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content box overlapping the hero. */}
      <div className="relative -mt-7 rounded-t-dash bg-dash-surface p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-dash-line bg-dash-surface px-2.5 py-1 text-xs font-bold text-dash-ink">
            {session.code}
          </span>
          <StatusTag status={session.status} />
          <Link
            href={`/sessions/${session.id}`}
            aria-label={`Open session ${session.name}`}
            className="ml-auto flex size-9 items-center justify-center rounded-full border border-dash-line text-dash-ink hover:bg-dash-subtle"
          >
            <ArrowUpRightIcon width="16" height="16" />
          </Link>
        </div>

        <h2 className="mt-3 text-xl font-bold text-dash-ink">{session.name}</h2>
        <p className="mt-1 text-sm text-dash-ink3">
          {formatDate(session.createdAt)} · {session.plannedMatches} matches
          planned · {session.teamCount} teams
        </p>

        {/* Progress = matches scored / total planned. */}
        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-dash-line"
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Matches scored"
          >
            <div
              className="h-full rounded-full bg-dash-ink"
              style={{ width: `${Math.min(100, progress ?? 0)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-dash-ink">{progress}%</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 overflow-hidden rounded-dash-sm bg-dash-subtle">
          <div className="flex flex-col gap-1 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-dash-ink3">
              Teams
            </dt>
            <dd className="text-sm font-bold text-dash-ink">
              {session.teamCount}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-x border-dash-line p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-dash-ink3">
              Stage
            </dt>
            <dd className="text-sm font-bold text-dash-ink">
              {played === 0
                ? "Not started"
                : `Match ${Math.min(played, session.plannedMatches)} of ${session.plannedMatches}`}
            </dd>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-dash-ink3">
              Created
            </dt>
            <dd className="text-sm font-bold text-dash-ink">
              {formatDate(session.createdAt)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
