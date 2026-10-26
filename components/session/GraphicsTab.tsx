"use client";

import Link from "next/link";
import clsx from "clsx";

import { ArrowUpRightIcon, TrophyIcon } from "@/components/dashboard/icons";
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
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold text-dash-ink">
          Participating teams
        </h2>
        <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-dash-ink3">
          Announce the line-up before the first match. Pick a look, then
          download the 1080 × 1620 PNG.
        </p>
        <div className="mt-4">
          <AnnouncementPreview
            title={sessionName}
            subtitle={PARTICIPATING_TEAMS}
            organizer={null}
            teams={teams}
          />
        </div>
      </section>

      <section className="border-t border-dash-bg pt-8">
        <h2 className="text-lg font-bold text-dash-ink">Overall standings</h2>
        <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-dash-ink3">
          The cumulative table in the scrim&apos;s aesthetic, ready for
          WhatsApp or Discord.
        </p>
        <div className="mt-4">
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
            <div className="rounded-dash bg-dash-bg px-5 py-8 text-center">
              <p className="text-sm font-bold text-dash-ink">
                Available after the first confirmed match
              </p>
              <p className="mx-auto mt-1 max-w-[44ch] text-[13px] leading-5 text-dash-ink3">
                Confirm one result and the standings graphic fills itself in.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-dash-bg pt-8">
        <h2 className="text-lg font-bold text-dash-ink">Top 5 fraggers</h2>
        <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-dash-ink3">
          The finale graphic. It renders only from a locked Top 5 list.
        </p>
        <div className="mt-4">
          {mvp.locked && mvp.entries && mvp.entries.length > 0 ? (
            <MvpPreview
              title={sessionName}
              subtitle={MVP_SUBTITLE}
              organizer={null}
              entries={toMvpDisplay(mvp.entries, teams)}
            />
          ) : (
            <div className="flex flex-col gap-4 rounded-dash bg-dash-bg p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "flex size-10 shrink-0 items-center justify-center rounded-dash-sm",
                    confirmedCount > 0
                      ? "bg-dash-lime text-dash-ink"
                      : "bg-dash-surface text-dash-ink3",
                  )}
                >
                  <TrophyIcon width="18" height="18" />
                </span>
                <div>
                  <p className="text-sm font-bold text-dash-ink">
                    {confirmedCount > 0
                      ? "Top 5 not locked yet"
                      : "Waiting for confirmed results"}
                  </p>
                  <p className="mt-0.5 max-w-[48ch] text-[13px] leading-5 text-dash-ink3">
                    {confirmedCount > 0
                      ? "Review the auto-drafted fraggers, fix any OCR drift, and lock exactly five."
                      : "The draft builds from confirmed match results, so score a match first."}
                  </p>
                </div>
              </div>
              {confirmedCount > 0 ? (
                <Link
                  href={`/sessions/${sessionId}/mvp`}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-dash-ink px-4 text-sm font-semibold text-white hover:bg-black"
                >
                  Lock top 5
                  <ArrowUpRightIcon width="15" height="15" />
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
