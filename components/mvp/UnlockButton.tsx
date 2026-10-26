"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { unlockMvpAction } from "@/app/sessions/[id]/mvp/actions";
import { LockIcon } from "@/components/app/icons";
import { buttonStyles, compactButtonStyles } from "@/components/app/ui";

/** Small client wrapper for the Unlock server action. */
export function UnlockButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlock() {
    setBusy(true);
    setError(null);
    try {
      await unlockMvpAction(sessionId);
      router.refresh();
    } catch {
      setError("Unlock failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className={buttonStyles.secondary}
        >
          <LockIcon width="15" height="15" />
          Unlock to edit
        </button>
        {error ? (
          <p role="alert" className="text-[13px] font-medium text-dash-danger-ink">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 rounded-[12px] border border-dash-line bg-dash-surface p-3">
      <p className="text-right text-[13px] font-medium leading-5 text-dash-ink2">
        Unlocking rebuilds the list from the confirmed matches — manual
        edits are discarded. Continue?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void onUnlock();
          }}
          className={compactButtonStyles.primary}
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
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
