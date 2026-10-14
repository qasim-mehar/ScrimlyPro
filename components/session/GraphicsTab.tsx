"use client";

import Link from "next/link";

import { AnnouncementPreview } from "@/components/graphics/AnnouncementPreview";
import { MvpPreview } from "@/components/graphics/MvpPreview";
import { StandingsPreview } from "@/components/graphics/StandingsPreview";
import { PARTICIPATING_TEAMS } from "@/lib/graphics/announcement";
import { MVP_SUBTITLE, toMvpDisplay } from "@/lib/graphics/mvp";
import type { StandingRow, TeamRow } from "@/lib/scoring";
import type { SessionPageData } from "@/lib/sessions/queries";

type GraphicsTabProps = {
  sessionId: string;
  sessionName: string;
  teams: TeamRow[];
  standings: StandingRow[];
  subtitle: string;
  confirmedCount: number;
  isFinal: boolean;
  mvp: SessionPageData["mvp"];
};

export function GraphicsTab({
  sessionId,
  sessionName,
  teams,
  standings,
  subtitle,
  confirmedCount,
  isFinal,
  mvp,
}: GraphicsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-widest text-gold">
          ANNOUNCEMENT
        </h2>
        <AnnouncementPreview
          title={sessionName}
          subtitle={PARTICIPATING_TEAMS}
          organizer={null}
          teams={teams}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-widest text-gold">
          OVERALL STANDINGS
        </h2>
        {confirmedCount > 0 ? (
          <StandingsPreview
            title={sessionName}
            subtitle={subtitle}
            organizer={null}
            standings={standings}
            matchCount={confirmedCount}
            isFinal={isFinal}
          />
        ) : (
          <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
            Overall standings graphic available after first match
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-widest text-gold">
          MVP
        </h2>
        {mvp.locked && mvp.entries && mvp.entries.length > 0 ? (
          <MvpPreview
            title={sessionName}
            subtitle={MVP_SUBTITLE}
            organizer={null}
            entries={toMvpDisplay(mvp.entries, teams)}
          />
        ) : (
          <>
            <p className="text-sm text-muted">
              Top-5 fraggers across all confirmed matches. Review and lock
              before sharing.
            </p>
            <Link
              href={`/sessions/${sessionId}/mvp`}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-gold/60 px-4 text-sm font-semibold text-gold"
            >
              Lock Top 5
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
