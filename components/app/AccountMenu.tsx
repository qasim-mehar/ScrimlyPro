"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LogOutIcon } from "@/components/app/icons";

/**
 * Avatar account menu for the app shells (dashboard top bar, admin shell).
 * The email is display-only; sign-out posts to /api/auth/logout and returns
 * to /login. Closes on outside click and Escape, mirrors the dash-* light
 * world, and sizes its hit areas to the 40px touch floor.
 */
export function AccountMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = email?.charAt(0).toUpperCase() ?? null;

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close account menu" : "Open account menu"}
        onClick={() => {
          setOpen((v) => !v);
        }}
        className="flex size-10 items-center justify-center rounded-full bg-dash-ink text-sm font-bold text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-ink"
      >
        {initial ?? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5v.5H4V20Z" />
          </svg>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-2 w-60 rounded-dash-sm border border-dash-line bg-dash-surface p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-dash-bg px-3 pb-2.5 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-dash-ink3">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-dash-ink">
              {email ?? "Account"}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              void signOut();
            }}
            className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-dash-chip px-3 text-sm font-semibold text-dash-ink2 transition-colors hover:bg-dash-bg hover:text-dash-ink disabled:opacity-40"
          >
            <LogOutIcon width="16" height="16" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
