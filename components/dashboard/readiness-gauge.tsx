import type { FeaturedSession } from "@/lib/dashboard/queries";
import { featuredProgress } from "@/components/dashboard/featured-card";

/**
 * Readiness gauge (M5 §4.4): dashed radial ring on the lime panel; value =
 * matches scored / total planned for the featured session. Zero matches →
 * "—" and "No matches yet" (honest fallback).
 */

function gaugeArc(percent: number): string {
  // Dashed ring on a 120x120 circle, r=50: ~75% of the stroke dashes are
  // drawn to imply progress without a false continuous-data claim.
  const dash = (2 * Math.PI * 50 * Math.min(100, percent)) / 100;
  return `${dash} ${2 * Math.PI * 50 - dash}`;
}

export function ReadinessGauge({ session }: { session: FeaturedSession }) {
  const progress = featuredProgress(session.confirmedCount, session.plannedMatches);

  return (
    <section className="rounded-dash-lg bg-dash-surface p-4">
      <div className="flex flex-col items-center rounded-dash bg-dash-lime px-6 pb-0 pt-8">
        <svg
          width="150"
          height="150"
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Standings ${progress !== null ? `${progress}% ready` : "not started yet"}`}
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#111827"
            strokeOpacity="0.15"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />
          {/* Progress */}
          {progress !== null && progress > 0 && (
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#111827"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={gaugeArc(progress)}
              transform="rotate(-90 60 60)"
            />
          )}
          <text
            x="60"
            y="58"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="30"
            fontWeight="700"
            fill="#111827"
          >
            {progress !== null ? `${progress}%` : "—"}
          </text>
          <text
            x="60"
            y="80"
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#111827"
            fillOpacity="0.7"
          >
            standings ready
          </text>
        </svg>

        <div className="mt-0 flex w-full translate-y-1/2 items-center justify-between gap-3 rounded-full bg-dash-surface px-5 py-3">
          <span className="truncate text-sm font-bold text-dash-ink">
            {session.name}
          </span>
          <span className="shrink-0 text-xs text-dash-ink3">
            {session.confirmedCount}/{session.plannedMatches} matches scored
          </span>
        </div>
      </div>
    </section>
  );
}
