"use client";

import { useEffect, useState } from "react";

import { PanelIcon } from "@/components/dashboard/icons";

/**
 * Mobile sidebar drawer (M5 §12: <1024px the floating sidebar collapses to
 * a hamburger drawer). The sidebar itself stays a server component — it is
 * passed in as children and mounted inside the overlay.
 */
export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-full text-dash-ink2 hover:bg-dash-surface"
      >
        <PanelIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onMouseDown={() => setOpen(false)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="h-full w-[288px] overflow-y-auto bg-dash-bg p-3"
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
