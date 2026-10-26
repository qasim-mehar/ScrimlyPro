import { FeaturedOrgCard } from "@/components/admin/dashboard/FeaturedOrgCard";
import { AiCard } from "@/components/admin/dashboard/AiCard";
import { AttentionList } from "@/components/admin/dashboard/AttentionList";
import { GaugeCard } from "@/components/admin/dashboard/GaugeCard";
import { ImpersonationStrip } from "@/components/admin/dashboard/ImpersonationStrip";
import { GreetingRow } from "@/components/admin/dashboard/GreetingRow";
import { LifecyclePipeline } from "@/components/admin/dashboard/LifecyclePipeline";
import { NeedsAttentionTable } from "@/components/admin/dashboard/NeedsAttentionTable";
import { StatCards } from "@/components/admin/dashboard/StatCards";
import { TimeFilter } from "@/components/admin/dashboard/TimeFilter";
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
          <ImpersonationStrip rows={data.activeImpersonations} />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="flex">
            <TimeFilter range={range} />
          </div>
          <StatCards stats={data.stats} ai={data.ai} range={range} />
          <LifecyclePipeline lifecycle={data.lifecycle} range={range} />
          <AttentionList rows={data.attention} />
          <AiCard ai={data.ai} />
          <GaugeCard gauge={data.gauge} range={range} />
        </div>
      </div>
    </div>
  );
}
