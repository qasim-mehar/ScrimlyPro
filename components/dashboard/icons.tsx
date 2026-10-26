import type { SVGProps } from "react";

/**
 * Inline icon set for the dashboard (M5 non-goal: never add an icon package).
 * Lucide-style outline geometry: 20px box, 1.5–2px stroke, currentColor.
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

export function LogoMark(props: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="4" />
      <rect x="3" y="13" width="8" height="8" rx="4" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.6.8L12.5 7H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.5" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5.5a1.5 1.5 0 0 0 0 3H8M16 5h2.5a1.5 1.5 0 0 1 0 3H16" />
      <path d="M12 13v3M9 20h6M10 20c0-2 .7-4 2-4s2 2 2 4" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6a1 1 0 0 0 .84-.46l.72-1.08A1 1 0 0 1 10.5 4h3a1 1 0 0 1 .84.46l.72 1.08A1 1 0 0 0 15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
      <circle cx="12" cy="12.5" r="3.25" />
    </Icon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.8 4.7a4 4 0 0 1 5.6 5.6L16.5 12" />
      <path d="M13 17.5 11.2 19.3a4 4 0 0 1-5.6-5.6L7.5 12" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4 21 19H3L12 4Z" />
      <path d="M12 10v4M12 16.5v.01" strokeWidth="2" />
    </Icon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4c.5 2.8 1.7 4 4.5 4.5C13.7 9 12.5 10.2 12 13c-.5-2.8-1.7-4-4.5-4.5C10.3 8 11.5 6.8 12 4Z" />
      <path d="M18.5 13.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z" />
      <path d="M5.5 14.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 15v-3M12 15V9.5M15.5 15v-4.5" strokeWidth="2" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75S13.9 16 14.5 19" />
      <path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.5 14.5c1.7.7 2.75 2.3 3 4.5" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5c.6 0 1.2.06 1.75.18l.5 2.05a6.5 6.5 0 0 1 1.52.88l2-.68c.76.98 1.3 2.12 1.55 3.36l-1.55 1.4a6.6 6.6 0 0 1 0 1.76l1.55 1.4a8.5 8.5 0 0 1-1.55 3.36l-2-.68a6.5 6.5 0 0 1-1.52.88l-.5 2.05a8.6 8.6 0 0 1-3.5 0l-.5-2.05a6.5 6.5 0 0 1-1.52-.88l-2 .68a8.5 8.5 0 0 1-1.55-3.36l1.55-1.4a6.6 6.6 0 0 1 0-1.76L4.7 9.26a8.5 8.5 0 0 1 1.55-3.36l2 .68a6.5 6.5 0 0 1 1.52-.88l.5-2.05A8.6 8.6 0 0 1 12 3.5Z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 10a6 6 0 0 1 12 0c0 3 .8 5 1.7 6.2.4.5 0 1.3-.7 1.3H5c-.7 0-1.1-.8-.7-1.3C5.2 15 6 13 6 10Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" strokeWidth="2" />
    </Icon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Icon>
  );
}

export function PanelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4.5" width="16" height="15" rx="3" />
      <path d="M10.5 4.5v15" />
    </Icon>
  );
}
