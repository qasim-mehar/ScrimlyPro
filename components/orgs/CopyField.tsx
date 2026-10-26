"use client";

import { useRef, useState } from "react";

import { CopyIcon } from "@/components/app/icons";
import { fieldStyles } from "@/components/app/ui";

/**
 * Copyable link field (mobile-safe): navigator.clipboard when available,
 * select+execCommand fallback for older WebViews. The value is shown once
 * by the caller — copying is the whole point of the component.
 */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Fallback: select the text and use the deprecated command path.
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
        ok = document.execCommand("copy");
      }
    }
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <span className="text-[13px] leading-5 text-dash-ink3">{label}</span>
      ) : null}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Copyable link"
          className={`${fieldStyles.input} min-w-0 text-[13px]`}
        />
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-dash-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          <CopyIcon width="15" height="15" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
