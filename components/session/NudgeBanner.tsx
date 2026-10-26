"use client";

import Link from "next/link";
import clsx from "clsx";

import { CircleCheckIcon } from "@/components/app/icons";
import { compactButtonStyles } from "@/components/app/ui";
import { ChevronRightIcon, TrophyIcon } from "@/components/dashboard/icons";
import type {
  SessionNudge,
  SessionPageSession,
} from "@/lib/sessions/queries";

import { CompleteButton } from "./CompleteButton";

/** Top-of-tab guidance banners (C6.2). `none` renders nothing. */
export function NudgeBanner({
  session,
  nudge,
}: {
  session: SessionPageSession;
  nudge: SessionNudge;
}) {
  if (nudge.kind === "none") return null;

  const mvpLink = (
    <Link
      href={`/sessions/${session.id}/mvp`}
      className={compactButtonStyles.secondary}
    >
      Lock top 5
      <ChevronRightIcon width="14" height="14" />
    </Link>
  );

  if (nudge.kind === "finalize") {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-dash bg-dash-lime p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dash-ink text-white">
            <TrophyIcon width="17" height="17" />
          </span>
          <div>
            <p className="text-sm font-bold text-dash-ink">
              All {session.plannedMatches} matches are confirmed
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-dash-lime-ink">
              Finalize the scrim, then lock the Top 5 before sharing.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompleteButton
            sessionId={session.id}
            confirmedCount={session.plannedMatches}
            plannedMatches={session.plannedMatches}
          />
          {mvpLink}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={clsx(
        "flex flex-col gap-3 rounded-dash bg-dash-bg p-4",
        "sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-dash-lime text-dash-lime-ink">
          <CircleCheckIcon width="17" height="17" />
        </span>
        <div>
          <p className="text-sm font-bold text-dash-ink">
            Session completed — Top 5 not locked yet
          </p>
          <p className="mt-0.5 text-[13px] leading-5 text-dash-ink3">
            The MVP graphic becomes shareable once five players are locked.
          </p>
        </div>
      </div>
      {mvpLink}
    </div>
  );
}
