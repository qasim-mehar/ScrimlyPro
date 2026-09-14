"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { markCompleteAction } from "@/app/sessions/[id]/actions";

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
