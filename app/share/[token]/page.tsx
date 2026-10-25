import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { OverallStandingsGraphic } from "@/components/graphics/OverallStandingsGraphic";
import { getTemplate } from "@/lib/graphics";
import { standingsSubtitle } from "@/lib/graphics/standings";
import { getSharedStandings } from "@/lib/share/public-reader";
import { checkShareRateLimit, shareIpFromHeaders } from "@/lib/share/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// robots: the share surface is unlisted — never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * /share/[token] — public standings page. Server-guarded by design:
 * - token is hashed and looked up through lib/share/public-reader.ts (the
 *   ONLY request-path admin-client consumer) → EXACTLY one session's public
 *   projection: standings rows, team names, scrim name, match counts.
 * - unknown / revoked / expired tokens all render the 404 page
 *   (indistinguishable).
 * - 60 req/IP/min limiter; force-dynamic renders carry no-store semantics;
 *   robots noindex above.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const limit = checkShareRateLimit(shareIpFromHeaders(await headers()));
  if (!limit.ok) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="font-display text-2xl font-bold tracking-widest text-gold">
          Too many requests
        </h1>
        <p className="text-sm text-muted">
          Slow down a little and reload in{" "}
          {Math.ceil(limit.retryAfterSeconds / 5) * 5}s.
        </p>
      </main>
    );
  }

  const data = await getSharedStandings(token);
  if (!data) notFound();

  const config = getTemplate(
    data.templateId as Parameters<typeof getTemplate>[0],
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display break-words text-3xl font-bold tracking-wide text-gold">
          {data.scrimName}
        </h1>
        <p className="text-xs tracking-widest text-muted">
          {data.confirmedCount}/{data.plannedMatches} MATCHES · PUBLIC STANDINGS
        </p>
      </header>
      <GraphicCanvas config={config} variant="standings">
        <OverallStandingsGraphic
          aestheticId={config.id}
          title={data.scrimName}
          subtitle={standingsSubtitle(data.confirmedCount, data.confirmedCount >= data.plannedMatches)}
          standings={data.standings.map((row) => ({ ...row, logoUrl: null }))}
          matchCount={data.confirmedCount}
        />
      </GraphicCanvas>
      <p className="text-center text-xs text-muted">
        Shared via ScrimlyPro — standings only; no accounts or personal data.
      </p>
    </main>
  );
}
