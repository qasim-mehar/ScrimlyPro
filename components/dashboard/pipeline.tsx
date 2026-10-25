import Link from "next/link";

import { SparklesIcon } from "@/components/dashboard/icons";
import type {
  AttentionItem,
  PipelineCounts,
} from "@/lib/dashboard/queries";

/**
 * Scrim pipeline (M5 §4.4 / §5) — stacked bar over the reference's color
 * rhythm, reduced to the REAL match states: Upcoming (planned−created,
 * gray — plan quantity, not range-scoped: planned matches carry no
 * timestamps), Drafts (lime), Scored (black). The reference's "In lobby"
 * and "Shared" segments have no data source (report §3). Widths = counts,
 * min 4% when nonzero so a segment stays visible.
 */

export function segmentWidths(counts: PipelineCounts): number[] {
  const values = [counts.upcoming, counts.drafts, counts.scored];
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return [0, 0, 0];
  return values.map((v) =>
    v === 0 ? 0 : Math.max(4, Math.round((v / total) * 100)),
  );
}

export function formatProcessing(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.round(seconds / 60);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const SEGMENTS = [
  { key: "upcoming", label: "Upcoming", cls: "bg-dash-line" },
  { key: "drafts", label: "Drafts", cls: "bg-dash-lime" },
  { key: "scored", label: "Scored", cls: "bg-dash-ink" },
] as const;

export function Pipeline({
  counts,
  avgProcessingSeconds,
  featuredSessionId,
}: {
  counts: PipelineCounts;
  avgProcessingSeconds: number | null;
  featuredSessionId?: string;
}) {
  const widths = segmentWidths(counts);
  const total = counts.upcoming + counts.drafts + counts.scored;

  return (
    <section className="rounded-dash bg-dash-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-dash-ink">Scrim pipeline</h2>
        <p className="flex items-center gap-3 text-[13px] text-dash-ink3">
          <span>
            Average processing {formatProcessing(avgProcessingSeconds)}
          </span>
          {featuredSessionId && (
            <Link
              href={`/sessions/${featuredSessionId}`}
              className="font-bold text-dash-ink hover:underline"
            >
              Open →
            </Link>
          )}
        </p>
      </div>

      {total === 0 ? (
        <div className="mt-4 h-3 rounded-full bg-dash-subtle" />
      ) : (
        <div className="mt-4 flex h-10 gap-1">
          {SEGMENTS.map((seg, i) =>
            widths[i] > 0 ? (
              <div
                key={seg.key}
                className={`h-full first:rounded-l-dash-sm last:rounded-r-dash-sm ${seg.cls}`}
                style={{ width: `${widths[i]}%` }}
                title={`${seg.label}: ${
                  counts[seg.key]
                } match${counts[seg.key] === 1 ? "" : "es"}`}
              />
            ) : null,
          )}
        </div>
      )}

      <div className="mt-3 flex gap-6">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-baseline gap-1.5">
            <span className={`size-2.5 rounded-full ${seg.cls}`} aria-hidden="true" />
            <span className="text-sm font-bold text-dash-ink">
              {counts[seg.key]}
            </span>
            <span className="text-[13px] text-dash-ink3">{seg.label}</span>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="mt-2 text-[13px] text-dash-ink3">No matches in range</p>
      )}
    </section>
  );
}

/**
 * Attention list (M5 §4.4): the deterministic ranked items. "Ranked by
 * Scrimly AI" is BRANDING for the rule engine in lib/dashboard/queries.ts —
 * no ML, no predictions (report §3).
 */

function RiskChip({ risk }: { risk: AttentionItem["risk"] }) {
  if (risk === "high") {
    return (
      <span className="rounded-dash-chip bg-dash-danger-bg px-2 py-1 text-xs font-semibold text-dash-danger-ink">
        High
      </span>
    );
  }
  return (
    <span className="rounded-dash-chip bg-dash-amber-bg px-2 py-1 text-xs font-semibold text-dash-amber-ink">
      Medium
    </span>
  );
}

function formatDue(due: string | null): string {
  if (!due) return "—";
  return new Date(due).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section className="rounded-dash bg-dash-surface">
      <div className="flex flex-wrap items-center gap-2 px-5 pb-2 pt-5">
        <h2 className="text-base font-bold text-dash-ink">Attention</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-dash-lime px-2.5 py-1 text-xs font-semibold text-dash-ink">
          <SparklesIcon width="14" height="14" />
          Ranked by Scrimly AI
        </span>
        <span className="ml-auto text-xs text-dash-ink3">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-dash-ink3">Nothing at risk</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="bg-dash-bg text-[13px] font-medium text-dash-ink3">
              <th scope="col" className="rounded-tl-dash-sm px-5 py-2 font-medium">
                Blocker
              </th>
              <th scope="col" className="px-3 py-2 text-center font-medium">
                Risk
              </th>
              <th scope="col" className="rounded-tr-dash-sm px-5 py-2 text-right font-medium">
                Due
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.key}
                className="border-t border-dash-bg hover:bg-dash-subtle"
              >
                <td className="max-w-0 px-5 py-4 align-middle">
                  {item.sessionId ? (
                    <Link
                      href={`/sessions/${item.sessionId}`}
                      className="block truncate text-sm text-dash-ink2 hover:text-dash-ink hover:underline"
                    >
                      {item.blocker}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm text-dash-ink2">
                      {item.blocker}
                    </span>
                  )}
                  {item.sessionName && (
                    <span className="block truncate text-xs text-dash-ink3">
                      {item.sessionName}
                    </span>
                  )}
                </td>
                <td className="px-3 py-4 text-center align-middle">
                  <RiskChip risk={item.risk} />
                </td>
                <td className="px-5 py-4 text-right align-middle text-sm text-dash-ink2">
                  {formatDue(item.due)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
