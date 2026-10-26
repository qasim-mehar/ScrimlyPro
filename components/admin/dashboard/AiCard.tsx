import Link from "next/link";

import { IconSparkles } from "@/components/admin/shell/icons";
import type { AdminDashboardData } from "@/lib/admin/dashboard-queries";

/**
 * Scrimly AI dark card (§4.4): OCR/usage FACTS only — deterministic, no
 * invented predictions. Failed reads are not metered by usage_events, so
 * the reference's failure headline/breakdown is honestly replaced by the
 * real read totals (documented deviation); the two breakdown rows that
 * remain are real (users near quota, draft matches awaiting confirmation).
 */

export function AiCard({ ai }: { ai: AdminDashboardData["ai"] }) {
  return (
    <section
      className="rounded-[24px] bg-[var(--hq-ink)] p-6"
      aria-label="Scrimly AI"
    >
      <div className="flex items-center gap-2">
        <span className="text-[var(--hq-lime)]">
          <IconSparkles size={18} />
        </span>
        <h2 className="text-[18px] font-bold text-white">Scrimly AI</h2>
        <span className="ml-auto text-[13px] text-white/40">
          {ai.lastReadAgo}
        </span>
      </div>

      <p className="mt-4 text-[20px] font-bold leading-snug text-white">
        {ai.reads7d > 0
          ? `${ai.reads7d.toLocaleString("en-US")} AI reads this week`
          : "No AI reads this week"}
      </p>
      <p className="mt-1 text-[13px] text-white/50">
        {ai.reads7d > 0
          ? `${ai.users7d.toLocaleString("en-US")} user${ai.users7d === 1 ? "" : "s"} · ${ai.orgs7d.toLocaleString("en-US")} org${ai.orgs7d === 1 ? "" : "s"}`
          : "Reads appear here as organizers ingest screenshots"}
      </p>

      <ul className="mt-4 space-y-2.5">
        <li className="flex items-center gap-2.5 text-[14px] text-[#E5E7EB]">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: "var(--hq-lime)" }}
            aria-hidden
          />
          {ai.nearQuotaCount > 0
            ? `${ai.nearQuotaCount} user${ai.nearQuotaCount === 1 ? "" : "s"} at ≥80% of monthly quota`
            : "No users near quota"}
        </li>
        <li className="flex items-center gap-2.5 text-[14px] text-[#E5E7EB]">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: "#F97316" }}
            aria-hidden
          />
          {ai.draftMatches7d > 0
            ? `${ai.draftMatches7d} draft match${ai.draftMatches7d === 1 ? "" : "es"} awaiting confirmation`
            : "No draft matches waiting"}
        </li>
      </ul>

      <div className="mt-5">
        <Link
          href="/admin/flags"
          className="inline-flex items-center rounded-full bg-[var(--hq-lime)] px-4 py-2 text-[14px] font-semibold text-[var(--hq-ink)] hover:brightness-95"
        >
          Review flags
        </Link>
      </div>
    </section>
  );
}
