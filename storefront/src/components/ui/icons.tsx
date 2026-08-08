import type { SVGProps } from "react";

/** Stroke icon set drawn to one grid so the gold/navy accents stay consistent. */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: 20,
    height: 20,
    "aria-hidden": true,
    ...props,
  };
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 13.5a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 4h3l1.5 4-2 1.5a12.5 12.5 0 0 0 6.5 6.5L16 14l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z" />
    </svg>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.6, ...props })}>
      <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z" />
      <path d="M9.2 8.4h1.2l.8 2-1 1a6.5 6.5 0 0 0 2.4 2.4l1-1 2 .8v1.2c0 .6-.5 1.1-1.1 1a8.4 8.4 0 0 1-6.3-6.3c-.1-.6.4-1.1 1-1.1Z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="5.8" r="2.6" />
      <circle cx="17.5" cy="18.2" r="2.6" />
      <path d="m8.4 10.8 6.8-3.8M8.4 13.2l6.8 3.8" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6.5-5.3-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.7 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V20" />
      <path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V20" />
      <path d="M3.5 20h17" />
      <path d="M8 8h1.5M11 8h1.5M8 11.5h1.5M11 11.5h1.5M8 15h1.5M11 15h1.5" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3.5 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7L12 3.5Z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 4.5 12.6 9l4.4 1.5-4.4 1.5L11 16.5 9.4 12 5 10.5 9.4 9 11 4.5Z" />
      <path d="M18 3.5v3M16.5 5h3" />
      <circle cx="17.5" cy="17.5" r="1" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 5-5 2v12l5-2 6 2 5-2V5l-5 2-6-2Z" />
      <path d="M9 5v12M15 7v12" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5.5" y="5" width="13" height="16" rx="2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  // Points in the reading direction; parent should apply rtl:rotate-180.
  return (
    <svg {...base(props)}>
      <path d="M4 12h16m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5" />
    </svg>
  );
}

export function BedIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <path d="M3 18h18M5 10V7h14v3" />
      <path d="M8.5 10V8.5h7V10" />
    </svg>
  );
}

export function BathIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Z" />
      <path d="M6 12V6a2 2 0 0 1 4 0" />
      <path d="M7 19.5 6 21M17 19.5 18 21" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" />
      <path d="m4.5 12.5 7.5 4 7.5-4" />
      <path d="m4.5 16.5 7.5 4 7.5-4" />
    </svg>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-7-2.5 17.5-8Z" />
    </svg>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 10a8 8 0 1 1 1.8 7.2" />
      <path d="M4.5 4.5V10H10" />
    </svg>
  );
}

export function CompareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4 5 8l4 4M5 8h14" />
      <path d="m15 12 4 4-4 4M19 16H5" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 8h13m0 0-3.5-3.5M20 8l-3.5 3.5" />
      <path d="M17 16H4m0 0 3.5-3.5M4 16l3.5 3.5" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h7l9 9-7 7-9-9V4Z" />
      <circle cx="8.5" cy="8.5" r="1.3" />
    </svg>
  );
}
