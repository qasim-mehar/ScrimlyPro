"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonStyles, compactButtonStyles } from "@/components/app/ui";
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
        className={buttonStyles.primary}
      >
        Mark complete
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-dash-line bg-dash-surface p-3">
      <p className="text-[13px] leading-5 font-medium text-dash-ink2">
        {confirmedCount < plannedMatches
          ? `Only ${confirmedCount} of ${plannedMatches} matches are confirmed. Complete anyway?`
          : "Mark this scrim complete?"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleComplete();
          }}
          className={compactButtonStyles.primary}
        >
          {busy ? "Completing…" : "Confirm complete"}
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
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
