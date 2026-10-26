import type { SVGProps } from "react";

/**
 * Inline outline icon set for the admin shell (M6 §4.3: lucide-style
 * geometry, 1.75px stroke, 20px grid). The repo ships no icon library and
 * M6 adds no dependencies — these are hand-drawn in the lucide idiom:
 * 24×24 viewBox, currentColor, round caps/joins.
 */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 13.8 8.2 18.5 10 13.8 11.8 12 16.5 10.2 11.8 5.5 10 10.2 8.2Z" />
      <path d="M19 3v3M17.5 4.5h3M5.5 17v2.6M4.2 18.3h2.6" />
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 21V5.2A1.2 1.2 0 0 1 6.7 4h10.6a1.2 1.2 0 0 1 1.2 1.2V21" />
      <path d="M3.5 21h17" />
      <path d="M9.5 8h1M13.5 8h1M9.5 11.5h1M13.5 11.5h1M9.5 15h1M13.5 15h1" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M17.5 15.6c1.7.6 2.7 2.1 3 4.4" />
    </svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V4" />
      <path d="M5 4.5c3.5-2 7 2 10.5 0 1-.6 2-.4 2-.4V13s-1-.2-2 .4c-3.5 2-7-2-10.5 0" />
    </svg>
  );
}

export function IconScroll(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 12h6M9 15.5h4" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 5v5M5 14v5M12 5v9M12 18v1M19 5v1M19 10v9" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="16" r="2" />
      <circle cx="19" cy="8" r="2" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 13 6 5.5A2 2 0 0 1 7.9 4h8.2a2 2 0 0 1 1.9 1.5L20.5 13v4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
      <path d="M3.5 13H9l1 2h4l1-2h5.5" />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v16h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" />
    </svg>
  );
}

/** ScrimlyPro mark for the sidebar logo tile (white on ink). */
export function LogoMark(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M13 2.5 5.5 13h5L10 21.5 18.5 11h-5.5Z" />
    </svg>
  );
}
