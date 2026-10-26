import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { ArrowLeftIcon } from "@/components/app/icons";

/**
 * Shared light app-surface vocabulary. Every in-scope screen composes these
 * primitives so buttons, cards, fields, chips and empty states cannot drift
 * from the member dashboard world.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "lime"
  | "danger";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export const buttonStyles: Record<ButtonVariant, string> = {
  primary: clsx(BUTTON_BASE, "bg-dash-ink text-white hover:bg-black"),
  secondary: clsx(
    BUTTON_BASE,
    "border border-dash-line bg-dash-surface text-dash-ink hover:bg-dash-subtle",
  ),
  quiet: clsx(
    BUTTON_BASE,
    "px-4 text-dash-ink2 hover:bg-dash-bg hover:text-dash-ink",
  ),
  lime: clsx(
    BUTTON_BASE,
    "bg-dash-lime text-dash-ink hover:bg-[#cdf67f]",
  ),
  danger: clsx(
    BUTTON_BASE,
    "bg-dash-danger-bg text-dash-danger-ink hover:bg-red-200",
  ),
};

export const compactButtonStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-dash-ink px-3.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-40",
  ),
  secondary: clsx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-dash-line bg-dash-surface px-3.5 text-xs font-semibold text-dash-ink hover:bg-dash-subtle disabled:opacity-40",
  ),
  quiet: clsx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-dash-ink2 hover:bg-dash-bg hover:text-dash-ink disabled:opacity-40",
  ),
  lime: clsx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-dash-lime px-3.5 text-xs font-semibold text-dash-ink hover:bg-[#cdf67f] disabled:opacity-40",
  ),
  danger: clsx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-dash-danger-bg px-3.5 text-xs font-semibold text-dash-danger-ink hover:bg-red-200 disabled:opacity-40",
  ),
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  compact = false,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  compact?: boolean;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={clsx(
        compact ? compactButtonStyles[variant] : buttonStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export const fieldStyles = {
  input:
    "min-h-11 w-full rounded-[12px] border border-dash-line bg-dash-surface px-3.5 text-base text-dash-ink outline-none transition-colors placeholder:text-dash-ink4 hover:border-dash-ink4 focus:border-dash-ink focus:ring-2 focus:ring-dash-lime disabled:cursor-not-allowed disabled:bg-dash-bg disabled:opacity-60",
  textarea:
    "w-full rounded-[12px] border border-dash-line bg-dash-surface p-3.5 text-base leading-6 text-dash-ink outline-none transition-colors placeholder:text-dash-ink4 hover:border-dash-ink4 focus:border-dash-ink focus:ring-2 focus:ring-dash-lime disabled:cursor-not-allowed disabled:bg-dash-bg disabled:opacity-60",
  label: "mb-1.5 block text-sm font-medium text-dash-ink2",
  help: "mt-1.5 text-[13px] leading-5 text-dash-ink3",
  error: "mt-1.5 text-[13px] font-medium text-dash-danger-ink",
};

export const cardStyles = {
  base: "rounded-dash bg-dash-surface",
  muted: "rounded-dash bg-dash-subtle",
  hero: "relative overflow-hidden rounded-dash-lg bg-dash-ink text-white",
};

export type ChipTone = "neutral" | "live" | "complete" | "draft" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-dash-bg text-dash-ink2",
  live: "bg-dash-lime text-dash-lime-ink",
  complete: "bg-dash-ink text-white",
  draft: "bg-dash-amber-bg text-dash-amber-ink",
  danger: "bg-dash-danger-bg text-dash-danger-ink",
};

export function StatusChip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-dash-chip px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  invert = false,
  className,
}: {
  value: number;
  label: string;
  /** Lime on a dark panel; ink on a light panel. */
  invert?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={clsx(
        "h-1.5 overflow-hidden rounded-full",
        invert ? "bg-white/15" : "bg-dash-line",
        className,
      )}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          invert ? "bg-dash-lime" : "bg-dash-ink",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  badges,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  badges?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-dash-ink3 transition-colors hover:text-dash-ink"
        >
          <ArrowLeftIcon width="16" height="16" />
          {backLabel ?? "Back"}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {badges ? (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {badges}
            </div>
          ) : null}
          <h1 className="text-balance text-[28px] leading-[1.1] font-bold tracking-[-0.025em] text-dash-ink sm:text-[34px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[68ch] text-sm leading-6 text-dash-ink3">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center rounded-dash bg-dash-bg px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-dash-sm bg-dash-surface text-dash-ink2">
          {icon}
        </span>
      ) : null}
      <p className="mt-3 text-base font-bold text-dash-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-sm leading-6 text-dash-ink3">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-dash-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 max-w-[60ch] text-[13px] leading-5 text-dash-ink3">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
