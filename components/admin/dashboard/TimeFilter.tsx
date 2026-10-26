import Link from "next/link";

import { RANGE_LABELS, type RangeKey } from "@/lib/admin/dashboard-queries";

/**
 * Segmented time filter (§4.4): Today / 7 days / 30 days. Plain links with
 * a search-param — the page re-renders server-side and every range-scoped
 * section re-queries. Active segment = ink pill.
 */
const ORDER: RangeKey[] = ["today", "7d", "30d"];

export function TimeFilter({
  range,
  basePath = "/admin",
}: {
  range: RangeKey;
  basePath?: string;
}) {
  return (
    <nav
      aria-label="Time range"
      className="inline-flex items-center gap-1 rounded-full bg-[var(--hq-bg)] p-1"
    >
      {ORDER.map((key) => {
        const active = key === range;
        return (
          <Link
            key={key}
            href={`${basePath}?range=${key}`}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-[var(--hq-ink)] px-4 py-2 text-[14px] font-semibold text-white"
                : "rounded-full px-4 py-2 text-[14px] font-medium text-[var(--hq-ink-2)] hover:text-[var(--hq-ink)]"
            }
          >
            {RANGE_LABELS[key]}
          </Link>
        );
      })}
    </nav>
  );
}
