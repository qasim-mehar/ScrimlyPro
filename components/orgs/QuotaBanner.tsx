import clsx from "clsx";

import { AlertIcon, ChartIcon } from "@/components/dashboard/icons";

/**
 * Quota banner (pilot copy per the M2 brief: enforced limits, friendly
 * upgrade path). Pure display — server passes the caller's verified numbers.
 */
export function QuotaBanner({
  maxSessions,
  monthlyOcrCalls,
  variant = "info",
}: {
  maxSessions: number;
  monthlyOcrCalls: number;
  variant?: "info" | "exceeded";
}) {
  const exceeded = variant === "exceeded";
  return (
    <section
      role={exceeded ? "alert" : undefined}
      className={clsx(
        "rounded-dash p-5",
        exceeded ? "bg-dash-danger-bg" : "bg-dash-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={clsx(
              "text-[11px] font-semibold tracking-wide uppercase",
              exceeded ? "text-dash-danger-ink" : "text-dash-ink3",
            )}
          >
            Plan limits
          </p>
          <h2
            className={clsx(
              "mt-1 text-base font-bold",
              exceeded ? "text-dash-danger-ink" : "text-dash-ink",
            )}
          >
            {exceeded ? "Limit reached" : "Pilot allowance"}
          </h2>
        </div>
        <span
          className={clsx(
            "flex size-9 shrink-0 items-center justify-center rounded-dash-sm",
            exceeded
              ? "bg-white/60 text-dash-danger-ink"
              : "bg-dash-bg text-dash-ink2",
          )}
        >
          {exceeded ? (
            <AlertIcon width="18" height="18" />
          ) : (
            <ChartIcon width="18" height="18" />
          )}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-dash-sm bg-dash-bg px-3 py-2.5">
          <dt className="text-[11px] font-medium text-dash-ink3">Scrims / org</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-dash-ink">
            {maxSessions}
          </dd>
        </div>
        <div className="rounded-dash-sm bg-dash-bg px-3 py-2.5">
          <dt className="text-[11px] font-medium text-dash-ink3">
            OCR reads / month
          </dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-dash-ink">
            {monthlyOcrCalls}
          </dd>
        </div>
      </dl>

      <p
        className={clsx(
          "mt-3 text-[12px] leading-5",
          exceeded ? "text-dash-danger-ink" : "text-dash-ink3",
        )}
      >
        {exceeded
          ? "New scrims or AI reads are blocked at the limit. Contact support to raise it."
          : "Contact support to raise limits when the pilot grows."}
      </p>
    </section>
  );
}
