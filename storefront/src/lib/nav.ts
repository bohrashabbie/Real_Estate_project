/**
 * The site's one navigation model.
 *
 * The reference renders the same seven links twice — as a plain inline row on
 * desktop and as a stack of icon cards in the phone drawer — from one piece of
 * markup, with CSS hiding the icon, the sub-label and the chevron above 760px.
 * Keeping the model here means the header, the drawer and the footer can never
 * disagree about what the site contains.
 */

export type NavIcon =
  | "house"
  | "tag"
  | "keyRound"
  | "star"
  | "mapPinned"
  | "sparkles"
  | "clipboardList";

export interface NavItem {
  /** Path without the locale prefix — `Link` from `@/i18n/navigation` adds it. */
  href: string;
  /** `messages.nav.<key>` and `messages.nav.<key>Sub`. */
  key: string;
  icon: NavIcon;
  /** Gold-tinted card in the drawer — the two links the office wants pushed. */
  accent?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", key: "home", icon: "house" },
  { href: "/properties?purpose=sale", key: "sale", icon: "tag" },
  { href: "/properties?purpose=rent", key: "rent", icon: "keyRound" },
  { href: "/properties?featured=1", key: "featured", icon: "star", accent: true },
  { href: "/map", key: "map", icon: "mapPinned" },
  { href: "/smart-search", key: "smartSearch", icon: "sparkles", accent: true },
  { href: "/request", key: "request", icon: "clipboardList" },
];

/** Shortcut chips under the quick search. */
export const QUICK_LINKS = [
  { href: "/properties?purpose=sale", key: "sale", icon: "tag" as const },
  { href: "/properties?type=villa", key: "villas", icon: "house" as const },
  { href: "/properties?type=apartment", key: "apartments", icon: "building" as const },
  { href: "/properties?purpose=rent", key: "rent", icon: "keyRound" as const },
  { href: "/properties?type=land", key: "land", icon: "landPlot" as const },
];
