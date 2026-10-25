"use client";

import { useRef, useState } from "react";

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
    <div className="flex flex-col gap-1">
      {label ? (
        <span className="text-sm text-muted">{label}</span>
      ) : null}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Copyable link"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          className="min-h-11 min-w-16 shrink-0 rounded-lg border border-line px-3 text-sm font-semibold text-gold"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
