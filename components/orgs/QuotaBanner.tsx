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
  return (
    <div
      role={variant === "exceeded" ? "alert" : undefined}
      className={`rounded-lg border bg-surface p-3 text-sm ${
        variant === "exceeded"
          ? "border-red-400/40 text-red-400"
          : "border-line text-muted"
      }`}
    >
      <p className="font-semibold">Plan limits</p>
      <p className="mt-1">
        {maxSessions} scrims per org · {monthlyOcrCalls} OCR uploads per
        month. Contact support to raise limits.
      </p>
    </div>
  );
}
