"use client";

import Link from "next/link";

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
      className="flex min-h-[44px] items-center justify-center rounded-lg border border-gold/60 px-4 text-sm font-semibold text-gold"
    >
      Lock Top 5 →
    </Link>
  );

  if (nudge.kind === "finalize") {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-lg border border-gold/60 bg-surface p-3"
      >
        <p className="text-sm font-semibold text-gold">
          All {session.plannedMatches} matches confirmed — finalize the scrim
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
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
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
    >
      <p className="text-sm font-semibold text-muted">
        Session completed — Top 5 not locked yet
      </p>
      {mvpLink}
    </div>
  );
}
