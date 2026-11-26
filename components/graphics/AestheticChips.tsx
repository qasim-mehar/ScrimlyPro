"use client";

import { useRef } from "react";
import clsx from "clsx";

import {
  AESTHETICS,
  selectableAestheticIds,
  type AestheticId,
  type GraphicVariant,
} from "@/lib/graphics";

/** Shared aesthetic switch for every graphic preview. Only templates with real
 *  art for the given variant are offered — gradient fallbacks are never a
 *  selectable option. */
export function AestheticChips({
  variant,
  activeId,
  onSelect,
}: {
  variant: GraphicVariant;
  activeId: AestheticId;
  onSelect: (id: AestheticId) => void;
}) {
  const ids = selectableAestheticIds(variant);
  // Hover/focus is a strong intent signal: warm the art cache before the click
  // so switching aesthetics usually has nothing left to download.
  const prefetched = useRef<Set<AestheticId>>(new Set());

  function prefetch(id: AestheticId): void {
    if (prefetched.current.has(id)) return;
    const background = AESTHETICS[id]?.backgrounds[variant];
    if (!background || background.type !== "image") return;
    prefetched.current.add(id);
    const image = new Image();
    image.src = background.src;
  }

  return (
    <div
      role="group"
      aria-label={`Graphic aesthetic — ${variant}`}
      className="flex flex-wrap gap-1.5"
    >
      {ids.map((id) => {
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            onMouseEnter={() => prefetch(id)}
            onFocus={() => prefetch(id)}
            aria-pressed={active}
            className={clsx(
              "min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors",
              active
                ? "bg-dash-ink text-white"
                : "bg-dash-bg text-dash-ink2 hover:bg-dash-line/60 hover:text-dash-ink",
            )}
          >
            {AESTHETICS[id]!.name}
          </button>
        );
      })}
    </div>
  );
}
