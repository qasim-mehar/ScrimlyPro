import { getActiveImpersonation } from "@/lib/admin/impersonation";

import { ImpersonationExitButton } from "./ImpersonationExitButton";

/**
 * Always-visible impersonation banner (M3 brief rule 6): rendered on every
 * tenant surface while an impersonation is active. Server component — the
 * state comes from the server-validated ledger, never from client state.
 * Invisible (renders nothing) for normal users, so it leaks nothing.
 */
export async function ImpersonationBanner() {
  const active = await getActiveImpersonation().catch(() => null);
  if (!active) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-red-800 bg-red-950/70 px-4 py-2">
      <span className="truncate text-sm font-semibold text-red-200">
        Viewing as <span className="text-white">{active.targetEmail}</span>
        <span className="ml-2 font-normal text-red-300/80">
          (support impersonation — every action is attributed to the admin)
        </span>
      </span>
      <ImpersonationExitButton />
    </div>
  );
}
