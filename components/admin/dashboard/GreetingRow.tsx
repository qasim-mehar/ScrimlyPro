import { IconAlert, IconCheck } from "@/components/admin/shell/icons";

/**
 * Greeting row (§4.4): time-aware greeting with the admin's real profile
 * name (derived from the account email — profiles has no display name) plus
 * the lime attention pill. Server component; the hour is computed at render
 * (server clock).
 */
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function GreetingRow({
  firstName,
  attentionCount,
}: {
  firstName: string;
  attentionCount: number;
}) {
  const greeting = greetingForHour(new Date().getHours());
  return (
    <div className="flex flex-wrap items-center gap-4">
      <h1 className="text-[32px] font-bold leading-tight text-[var(--hq-ink)]">
        {greeting}, {firstName}
      </h1>
      {attentionCount > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hq-lime)] px-3 py-1.5 text-[13px] font-semibold text-[var(--hq-lime-ink)]">
          <IconAlert size={15} />
          {attentionCount} need attention
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hq-lime)] px-3 py-1.5 text-[13px] font-semibold text-[var(--hq-lime-ink)]">
          <IconCheck size={15} />
          All clear
        </span>
      )}
    </div>
  );
}
