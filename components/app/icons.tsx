import type { SVGProps } from "react";

/**
 * App-surface icon additions. Same geometry contract as the dashboard set:
 * 20px box, 1.75px stroke, currentColor, no filled decoration. The dashboard
 * icons remain the reference and are reused wherever a matching glyph exists.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.5 6-6 6 6 6M8.5 12H20" />
    </Icon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Icon>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" strokeWidth="2" />
    </Icon>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.2 2.4 2.4 4.7-4.8" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" strokeWidth="2" />
    </Icon>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 14.5 6-6 6 6" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M8 11.5l4 4 4-4" />
      <path d="M5 19.5h14" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 5h3.5A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8.5 6.5 12 10 15.5M6.5 12H15" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14.5v2" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5.5 17 4.2-4.2 3 3 2.3-2.3 3.5 3.5" />
    </Icon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="7" cy="12" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="m9.2 10.8 5.6-3.5M9.2 13.2l5.6 3.5" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.5 9.5h15M4.5 14.5h15" />
      <path d="M12 4c2 2.4 3 5 3 8s-1 5.6-3 8c-2-2.4-3-5-3-8s1-5.6 3-8Z" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 20V5" />
      <path d="M6 5.5h10.5l-2 4 2 4H6" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12S6.5 6.5 12 6.5 20.5 12 20.5 12 17.5 17.5 12 17.5 3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  );
}
