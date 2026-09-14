"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  markCompleteAction,
  unlockMatchAction,
} from "@/app/sessions/[id]/actions";
import type {
  SessionPageMatch,
  SessionPageSession,
} from "@/lib/sessions/queries";

type MatchesTabProps = {
  session: SessionPageSession;
  matches: SessionPageMatch[];
  nextMatch: number | null;
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
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-display text-lg font-semibold">
          Match {match.matchNo}
        </span>
        <span
          className={
            isConfirmed
              ? "rounded-full border border-gold/60 px-2 py-0.5 text-xs font-semibold text-gold"
              : "rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted"
          }
        >
          {isConfirmed ? "CONFIRMED" : "DRAFT"}
        </span>
        {isConfirmed && match.winnerTeamName ? (
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            Winner: {match.winnerTeamName}
          </span>
        ) : null}
      </div>

      {isConfirmed ? (
        confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Removes this match&apos;s results; standings and rosters rebuild.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void handleUnlock();
                }}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-red-500/20 px-3 text-sm font-semibold text-red-300 disabled:opacity-50"
              >
                {busy ? "Unlocking…" : "Confirm Unlock"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line px-3 text-sm text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-muted"
          >
            Unlock
          </button>
        )
      ) : (
        <Link
          href={`/sessions/${sessionId}/matches/${match.matchNo}`}
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-gold/60 px-3 text-sm font-semibold text-gold"
        >
          Continue
        </Link>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function MatchesTab({ session, matches, nextMatch }: MatchesTabProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          No matches yet
        </p>
        {nextMatch !== null ? (
          <Link
            href={`/sessions/${session.id}/matches/${nextMatch}`}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-gold px-4 font-display text-lg font-semibold text-bg"
          >
            Add Match {nextMatch}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {matches.map((match) => (
          <MatchRow key={match.id} sessionId={session.id} match={match} />
        ))}
      </ul>
      {nextMatch !== null ? (
        <Link
          href={`/sessions/${session.id}/matches/${nextMatch}`}
          className="flex min-h-[44px] items-center justify-center rounded-lg bg-gold px-4 font-display text-lg font-semibold text-bg"
        >
          Add Match {nextMatch}
        </Link>
      ) : null}
    </div>
  );
}

export function CompleteButton({
  sessionId,
  confirmedCount,
  plannedMatches,
}: {
  sessionId: string;
  confirmedCount: number;
  plannedMatches: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await markCompleteAction(sessionId);
    if (result.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="flex min-h-[44px] items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-bg"
      >
        Mark Complete
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gold/60 bg-surface p-3">
      <p className="text-sm text-muted">
        {confirmedCount < plannedMatches
          ? `Only ${confirmedCount} of ${plannedMatches} matches confirmed — complete anyway?`
          : "Mark this session complete?"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleComplete();
          }}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-gold px-3 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy ? "Completing…" : "Confirm Complete"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-line px-3 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
