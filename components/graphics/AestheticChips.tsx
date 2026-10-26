"use client";

import clsx from "clsx";

import { AESTHETICS, type AestheticId } from "@/lib/graphics";

const IDS = Object.keys(AESTHETICS) as AestheticId[];

/** Shared aesthetic switch for every graphic preview. */
export function AestheticChips({
  activeId,
  onSelect,
}: {
  activeId: AestheticId;
  onSelect: (id: AestheticId) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Graphic aesthetic"
      className="flex flex-wrap gap-1.5"
    >
      {IDS.map((id) => {
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={active}
            className={clsx(
              "min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors",
              active
                ? "bg-dash-ink text-white"
                : "bg-dash-bg text-dash-ink2 hover:bg-dash-line/60 hover:text-dash-ink",
            )}
          >
            {AESTHETICS[id].name}
          </button>
        );
      })}
    </div>
  );
}
