"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { unlockMvpAction } from "@/app/sessions/[id]/mvp/actions";

/** Small client wrapper for the Unlock server action. */
export function UnlockButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onUnlock}
        disabled={busy}
        className="min-h-[44px] rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted disabled:opacity-50"
      >
        {busy ? "Unlocking…" : "Unlock"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
