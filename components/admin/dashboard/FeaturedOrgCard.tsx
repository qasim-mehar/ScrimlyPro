import Link from "next/link";

import { IconArrowUpRight } from "@/components/admin/shell/icons";
import type { FeaturedOrg } from "@/lib/admin/dashboard-queries";
import { RANGE_LABELS, type RangeKey } from "@/lib/admin/dashboard-queries";

/**
 * Featured org card (§4.4): the platform's most active organization in the
 * selected range. Hero = the org's latest session's top-3 standings (real
 * computeStandings output) on a dark lime-grid panel; orgs without
 * confirmed results get the monogram variant. Everything below the hero is
 * real data; zero-org platforms get the onboarding variant.
 */

function statusTag(status: FeaturedOrg["status"]) {
  if (status === "disabled") {
    return (
      <span className="hq-chip bg-[var(--hq-ink)] text-white">Disabled</span>
    );
  }
  if (status === "quota") {
    return (
      <span className="hq-chip bg-[var(--hq-amber-ink)] text-white">
        Quota warnings
      </span>
    );
  }
  return (
    <span className="hq-chip bg-[var(--hq-lime)] text-[var(--hq-lime-ink)]">
      Active
    </span>
  );
}

function createdLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function FeaturedOrgCard({
  featured,
  range,
}: {
  featured: FeaturedOrg | null;
  range: RangeKey;
}) {
  if (!featured) {
    // Empty platform: no organizations yet.
    return (
      <section className="hq-card p-6" aria-label="Featured organization">
        <h2 className="text-[20px] font-bold text-[var(--hq-ink)]">
          Featured organization
        </h2>
        <p className="mt-2 text-sm text-[var(--hq-ink-3)]">
          No organizations yet. The most active organization in the selected
          range is featured here once organizers create their first org.
        </p>
      </section>
    );
  }

  const activityPct =
    featured.membersTotal > 0
      ? Math.round((featured.membersActive / featured.membersTotal) * 100)
      : 0;

  return (
    <section className="hq-card overflow-hidden" aria-label="Featured organization">
      {/* Hero: dark panel with a faint lime grid; standings or monogram. */}
      <div className="hq-hero relative flex min-h-[220px] flex-col justify-end p-6">
        {featured.hero?.hasResults ? (
          <>
            <p className="mb-3 text-[12px] font-medium tracking-wide text-white/60">
              Latest session · {featured.hero.sessionName}
            </p>
            <ul className="space-y-1.5" aria-label="Top 3 standings">
              {featured.hero.top.map((row, i) => (
                <li
                  key={row.teamName}
                  className="flex items-center justify-between gap-4 rounded-[12px] bg-white/[0.06] px-4 py-2"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        i === 0
                          ? "text-[13px] font-bold text-[var(--hq-lime)]"
                          : "text-[13px] font-semibold text-white/50"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="truncate text-[14px] font-medium text-white">
                      {row.teamName}
                    </span>
                  </span>
                  <span className="text-[14px] font-bold text-[var(--hq-lime)]">
                    {row.points}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-white/[0.06] text-[40px] font-bold text-[var(--hq-lime)]">
              {featured.monogram}
            </span>
            <p className="text-[13px] text-white/60">
              {featured.hero ? "No confirmed results yet" : "No sessions yet"}
            </p>
          </div>
        )}
      </div>

      {/* Content box overlapping the hero. */}
      <div className="relative z-10 -mt-8 mx-4 rounded-[20px] bg-[var(--hq-surface)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-bold text-[var(--hq-ink)]">
              {featured.name}
            </h2>
            <p className="mt-1 text-[14px] text-[var(--hq-ink-3)]">
              Created {createdLabel(featured.createdAt)} ·{" "}
              {featured.membersTotal} member{featured.membersTotal === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            {statusTag(featured.status)}
            <Link
              href="/admin/orgs"
              aria-label={`Open organizations (${featured.name})`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--hq-line)] text-[var(--hq-ink-2)] hover:bg-[var(--hq-surface-subtle)]"
            >
              <IconArrowUpRight size={18} />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-medium text-[var(--hq-ink-3)]">
              Team activity · {RANGE_LABELS[range]}
            </span>
            <span className="font-bold text-[var(--hq-ink)]">{activityPct}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-[3px] bg-[var(--hq-line)]"
            role="progressbar"
            aria-valuenow={activityPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Members active in range"
          >
            <div
              className="h-full rounded-[3px] bg-[var(--hq-ink)]"
              style={{ width: `${Math.min(100, activityPct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--hq-ink-3)]">
            {featured.membersActive} of {featured.membersTotal} members used AI
            reads in {RANGE_LABELS[range].toLowerCase()}
            {featured.quotaPct >= 80
              ? ` · ${featured.quotaPct}% of monthly quota`
              : ""}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-0 rounded-[12px] bg-[var(--hq-surface-subtle)] p-4 text-center">
          {[
            { label: "Members", value: featured.membersTotal },
            { label: `Sessions · ${RANGE_LABELS[range]}`, value: featured.sessionsInRange },
            { label: `AI reads · ${RANGE_LABELS[range]}`, value: featured.readsInRange },
          ].map((s, i) => (
            <div
              key={s.label}
              className={
                i === 0
                  ? "px-2"
                  : "border-l border-[var(--hq-line)] px-2"
              }
            >
              <dt className="order-2 text-[12px] text-[var(--hq-ink-3)]">
                {s.label}
              </dt>
              <dd className="order-1 text-[16px] font-bold text-[var(--hq-ink)]">
                {s.value.toLocaleString("en-US")}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="h-4" />
    </section>
  );
}
