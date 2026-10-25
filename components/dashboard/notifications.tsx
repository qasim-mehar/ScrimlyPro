"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BellIcon } from "@/components/dashboard/icons";
import type { DashboardNotification } from "@/lib/dashboard/queries";

/**
 * Notifications (M5 §5): no new tables — the server derives the latest
 * events (match scored / invite accepted / share created). The red dot is
 * CLIENT state only: `lastSeenAt` in localStorage decides "unseen". Opening
 * the dropdown marks everything seen.
 */

const LS_KEY = "scrimly.notif.lastSeenAt";

function relative(iso: string): string {
  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

export function Notifications({
  notifications,
}: {
  notifications: DashboardNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // localStorage is a client-only external store: read it asynchronously
  // after mount (SSR renders no dot; state settles on the client).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const raw = localStorage.getItem(LS_KEY);
      setLastSeenAt(raw ? Number(raw) : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click-outside closes.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unseen =
    lastSeenAt == null
      ? notifications.length > 0
      : notifications.some((n) => new Date(n.at).getTime() > lastSeenAt);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      localStorage.setItem(LS_KEY, String(now));
      setLastSeenAt(now);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unseen ? " (unread)" : ""}`}
        aria-expanded={open}
        className="relative flex size-11 items-center justify-center rounded-full text-dash-ink2 hover:bg-dash-surface"
      >
        <BellIcon />
        {unseen && (
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 size-2 rounded-full bg-dash-danger-dot ring-2 ring-dash-bg"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-13 z-40 w-80 overflow-hidden rounded-dash bg-dash-surface shadow-lg">
          <p className="border-b border-dash-line px-4 py-3 text-sm font-bold text-dash-ink">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-dash-ink4">
              No recent activity
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n, i) => (
                <li key={`${n.kind}-${n.at}-${i}`}>
                  {n.sessionId ? (
                    <Link
                      href={`/sessions/${n.sessionId}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-dash-subtle"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-dash-ink2">
                        {n.label}
                      </span>
                      <span className="shrink-0 text-xs text-dash-ink4">
                        {relative(n.at)}
                      </span>
                    </Link>
                  ) : (
                    <span className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-dash-ink2">
                        {n.label}
                      </span>
                      <span className="shrink-0 text-xs text-dash-ink4">
                        {relative(n.at)}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
