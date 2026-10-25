import type { AdminDashboardData } from "@/lib/admin/dashboard-queries";
import { RANGE_LABELS } from "@/lib/admin/dashboard-queries";

/**
 * Readiness gauge (§4.4 anatomy: white card, lime panel, dashed black
 * radial ring, white footer pill). The reference's "AI success rate" is
 * NOT computable today: usage_events only records successful ingests, so
 * there is no failure denominator. Rather than invent a percentage, the
 * center renders "—" and the footer states what IS real — metered reads in
 * range (documented deviation; flips to a real % the day failures are
 * metered).
 */
export function GaugeCard({
  gauge,
  range,
}: {
  gauge: AdminDashboardData["gauge"];
  range: AdminDashboardData["range"];
}) {
  return (
    <section className="hq-card p-6" aria-label="AI readiness gauge">
      <div className="hq-gauge-panel relative flex flex-col items-center px-6 pb-14 pt-10">
        {/* Decorative dashed ring — carries no data claim. */}
        <svg
          viewBox="0 0 120 120"
          className="h-36 w-36"
          aria-hidden
          focusable="false"
        >
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--hq-ink)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 9"
          />
          <circle
            cx="60"
            cy="60"
            r="40"
            fill="none"
            stroke="var(--hq-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 7"
            opacity="0.5"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-[48px] font-bold leading-none text-[var(--hq-ink)]">
            —
          </span>
          <span className="mt-1 text-[13px] font-medium text-[var(--hq-ink)]/70">
            AI success rate
          </span>
        </div>

        {/* Footer pill overlapping the lime panel's bottom edge. */}
        <div className="absolute -bottom-4 left-1/2 flex w-[92%] -translate-x-1/2 items-center justify-between gap-3 rounded-full bg-[var(--hq-surface)] px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <span className="text-[14px] font-semibold text-[var(--hq-ink)]">
            {gauge.readsInRange.toLocaleString("en-US")} reads metered
          </span>
          <span className="text-[13px] text-[var(--hq-ink-4)]">
            {RANGE_LABELS[range]} · failures not tracked
          </span>
        </div>
      </div>
      <div className="h-6" />
    </section>
  );
}
