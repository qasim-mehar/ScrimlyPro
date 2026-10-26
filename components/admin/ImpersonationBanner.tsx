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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-dash-amber-bg bg-dash-amber-bg px-4 py-2.5">
      <span className="min-w-0 text-sm font-semibold text-dash-amber-ink">
        Viewing as{" "}
        <span className="break-all text-dash-ink">{active.targetEmail}</span>
        <span className="ml-2 font-medium text-dash-amber-ink/80">
          — support impersonation. Every action is attributed to the admin.
        </span>
      </span>
      <ImpersonationExitButton />
    </div>
  );
}
