import { AlertIcon } from "@/components/dashboard/icons";

/**
 * Greeting row (M5 §4.4). The greeting is SERVER-computed and time-of-day
 * aware. There is no profile name column — the display name is derived
 * from the account email's local part (honest data the user gave us;
 * documented deviation in the M5 report §3). The attention pill carries the
 * real derived item count; zero renders the all-clear variant.
 */

/** Exported for unit tests (pure). */
export function displayName(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0]?.split(/[-._]/)[0];
  if (!local) return "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Exported for unit tests (pure). */
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function GreetingRow({
  email,
  needsAttention,
  nowHour,
}: {
  email: string | null;
  needsAttention: number;
  /** Server local hour (0–23), injected so tests can pin time of day. */
  nowHour: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[32px] font-bold leading-tight text-dash-ink">
        {greetingFor(nowHour)}, {displayName(email)}
      </h1>
      {needsAttention > 0 ? (
        <span className="flex items-center gap-2 rounded-full bg-dash-lime px-3 py-1.5 text-sm font-semibold text-dash-lime-ink">
          <AlertIcon width="16" height="16" />
          {needsAttention} item{needsAttention === 1 ? "" : "s"} need
          {needsAttention === 1 ? "s" : ""} attention
        </span>
      ) : (
        <span className="flex items-center gap-2 rounded-full bg-dash-lime px-3 py-1.5 text-sm font-semibold text-dash-lime-ink">
          <AlertIcon width="16" height="16" />
          All clear
        </span>
      )}
    </div>
  );
}
