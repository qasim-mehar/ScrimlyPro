import { FeaturedOrgCard } from "@/components/admin/dashboard/FeaturedOrgCard";
import { GreetingRow } from "@/components/admin/dashboard/GreetingRow";
import { NeedsAttentionTable } from "@/components/admin/dashboard/NeedsAttentionTable";
import {
  getAdminDashboardData,
  parseRange,
} from "@/lib/admin/dashboard-queries";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/**
 * M6 super-admin dashboard home. WP1 ships the shell with skeleton
 * sections; the reference widgets land in WP4–WP9 (greeting, featured org,
 * needs-attention table, stat cards + time filter, lifecycle pipeline +
 * attention list, AI card + gauge).
 */
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const admin = await requireAdmin();
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const data = await getAdminDashboardData(range, admin.email);

  return (
    <div className="space-y-6">
      <GreetingRow
        firstName={data.adminFirstName}
        attentionCount={data.stats.attentionCount}
      />

      {/* Two-column composition (§4.5): ~60/40 at ≥1280, stacked below. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <FeaturedOrgCard featured={data.featured} range={range} />
          <NeedsAttentionTable rows={data.attention} />
        </div>
        <div className="min-w-0 space-y-6">
          {/* Time filter — WP7 */}
          <div
            className="hq-skeleton h-11 w-64 rounded-full bg-[var(--hq-surface)]"
            aria-hidden
          />
          {/* Stat cards — WP7 */}
          <div className="grid grid-cols-2 gap-4 min-[1920px]:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="hq-card hq-skeleton h-[132px]" aria-hidden />
            ))}
          </div>
          {/* Lifecycle pipeline + attention list — WP8 */}
          <div className="hq-card hq-skeleton h-[180px]" aria-hidden />
          <div className="hq-card hq-skeleton h-[220px]" aria-hidden />
          {/* Scrimly AI card + readiness gauge — WP9 */}
          <div className="hq-card hq-skeleton h-[220px] bg-[var(--hq-ink)]" aria-hidden />
          <div className="hq-card hq-skeleton h-[260px]" aria-hidden />
        </div>
      </div>
    </div>
  );
}
