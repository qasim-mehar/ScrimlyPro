"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

import { CheckIcon, ClockIcon } from "@/components/app/icons";
import {
  ButtonLink,
  compactButtonStyles,
  EmptyState,
  StatusChip,
} from "@/components/app/ui";
import { CameraIcon, ChevronRightIcon } from "@/components/dashboard/icons";
import { unlockMatchAction } from "@/app/sessions/[id]/actions";
import type {
  SessionNudge,
  SessionPageMatch,
  SessionPageSession,
} from "@/lib/sessions/queries";

import { NudgeBanner } from "./NudgeBanner";

type MatchesTabProps = {
  session: SessionPageSession;
  matches: SessionPageMatch[];
  nextMatch: number | null;
  nudge: SessionNudge;
};

function MatchRow({
  sessionId,
  match,
}: {
  sessionId: string;
  match: SessionPageMatch;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await unlockMatchAction(sessionId, match.id);
    if (result.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  const isConfirmed = match.status === "confirmed";

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={clsx(
            "flex size-10 shrink-0 items-center justify-center rounded-dash-sm",
            isConfirmed
              ? "bg-dash-lime text-dash-ink"
              : "bg-dash-amber-bg text-dash-amber-ink",
          )}
        >
          {isConfirmed ? (
            <CheckIcon width="18" height="18" />
          ) : (
            <ClockIcon width="18" height="18" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-dash-ink">
              Match {match.matchNo}
            </p>
            <StatusChip tone={isConfirmed ? "live" : "draft"}>
              {isConfirmed ? "Confirmed" : "Draft"}
            </StatusChip>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-dash-ink3">
            {isConfirmed
              ? match.winnerTeamName
                ? `Winner · ${match.winnerTeamName}`
                : "Results locked into the table"
              : "Screenshots read — review the mapping to confirm"}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isConfirmed ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className={compactButtonStyles.secondary}
            >
              Unlock
            </button>
          ) : (
            <Link
              href={`/sessions/${sessionId}/matches/${match.matchNo}`}
              className={compactButtonStyles.primary}
            >
              Review
              <ChevronRightIcon width="14" height="14" />
            </Link>
          )}
        </div>
      </div>

      {isConfirmed && confirming ? (
        <div className="flex flex-col gap-2 rounded-[12px] bg-dash-danger-bg/50 p-3">
          <p className="text-[13px] leading-5 font-medium text-dash-danger-ink">
            Unlocking removes this match&apos;s results. Standings and rosters
            rebuild without it.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handleUnlock();
              }}
              className={compactButtonStyles.danger}
            >
              {busy ? "Unlocking…" : "Confirm unlock"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={compactButtonStyles.quiet}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-danger-ink">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function MatchesTab({
  session,
  matches,
  nextMatch,
  nudge,
}: MatchesTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <NudgeBanner session={session} nudge={nudge} />

      {matches.length === 0 ? (
        <EmptyState
          icon={<CameraIcon width="22" height="22" />}
          title="No matches yet"
          description="Upload the first result screenshot and ScrimlyPro will read every placement and kill for you."
          className="bg-dash-bg py-8"
          action={
            nextMatch !== null ? (
              <ButtonLink href={`/sessions/${session.id}/matches/${nextMatch}`}>
                Add match {nextMatch}
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-dash-bg">
          {matches.map((match) => (
            <MatchRow key={match.id} sessionId={session.id} match={match} />
          ))}
        </ul>
      )}

      {nextMatch !== null ? (
        <Link
          href={`/sessions/${session.id}/matches/${nextMatch}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-dash-line px-4 text-sm font-semibold text-dash-ink2 transition-colors hover:border-dash-ink4 hover:bg-dash-bg hover:text-dash-ink"
        >
          Add match {nextMatch}
          <ChevronRightIcon width="15" height="15" />
        </Link>
      ) : null}
    </div>
  );
}
