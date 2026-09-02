import type { Locale } from "@/i18n/routing";

/**
 * The single boundary between the storefront and `/public/v1`.
 *
 * Server components read `PUBLIC_API_URL`; client components get the
 * build-time-inlined `NEXT_PUBLIC_API_URL`. Every server-side read goes
 * through `safeGet` so a missing API (including at `next build` time) degrades
 * to an empty fallback instead of crashing the page.
 */

export const API_BASE =
  (typeof window === "undefined" ? process.env.PUBLIC_API_URL : undefined) ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/public/v1";

/** Origin the browser loads `/uploads/*` from — media URLs may be relative.
 *  Always derived from the build-time NEXT_PUBLIC_API_URL, never from the
 *  server-side PUBLIC_API_URL: server components render <img src> into HTML
 *  the *browser* fetches, so an internal origin like http://api:8000 would
 *  ship broken image URLs. */
const MEDIA_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/public/v1"
).replace(/\/public\/v1\/?$/, "");

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ---------------------------------------------------------------------------
// Types (shapes per SPEC.md "Public /public/v1")
// ---------------------------------------------------------------------------

export interface SiteSettings {
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  /** Handle or full profile URL — the footer and contact page accept either. */
  x: string | null;
  snapchat: string | null;
  name_ar: string;
  name_en: string;
  // Page copy the office can edit from the admin's Settings screen without a
  // deploy — one `site.<field>_<locale>` setting per string, not a
  // translations table (see SPEC.md). Every one of these is optional: null
  // means "not set", and every reader falls back to its own next-intl copy
  // for that string. Read these through `siteText()` below rather than
  // indexing the object directly, so a blank string and a missing key are
  // never treated differently by accident.
  footer_blurb_ar: string | null;
  footer_blurb_en: string | null;
  footer_tagline_ar: string | null;
  footer_tagline_en: string | null;
  hero_title_ar: string | null;
  hero_title_en: string | null;
  hero_subtitle_ar: string | null;
  hero_subtitle_en: string | null;
  hero_cta_ar: string | null;
  hero_cta_en: string | null;
  vip_kicker_ar: string | null;
  vip_kicker_en: string | null;
  vip_title_ar: string | null;
  vip_title_en: string | null;
  vip_cta_ar: string | null;
  vip_cta_en: string | null;
  featured_kicker_ar: string | null;
  featured_kicker_en: string | null;
  featured_title_ar: string | null;
  featured_title_en: string | null;
  featured_cta_ar: string | null;
  featured_cta_en: string | null;
  all_kicker_ar: string | null;
  all_kicker_en: string | null;
  all_title_ar: string | null;
  all_title_en: string | null;
  all_body_ar: string | null;
  all_body_en: string | null;
  all_cta_ar: string | null;
  all_cta_en: string | null;
  types_kicker_ar: string | null;
  types_kicker_en: string | null;
  types_title_ar: string | null;
  types_title_en: string | null;
  types_body_ar: string | null;
  types_body_en: string | null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  x: null,
  snapchat: null,
  name_ar: "kwt25",
  name_en: "kwt25",
  footer_blurb_ar: null,
  footer_blurb_en: null,
  footer_tagline_ar: null,
  footer_tagline_en: null,
  hero_title_ar: null,
  hero_title_en: null,
  hero_subtitle_ar: null,
  hero_subtitle_en: null,
  hero_cta_ar: null,
  hero_cta_en: null,
  vip_kicker_ar: null,
  vip_kicker_en: null,
  vip_title_ar: null,
  vip_title_en: null,
  vip_cta_ar: null,
  vip_cta_en: null,
  featured_kicker_ar: null,
  featured_kicker_en: null,
  featured_title_ar: null,
  featured_title_en: null,
  featured_cta_ar: null,
  featured_cta_en: null,
  all_kicker_ar: null,
  all_kicker_en: null,
  all_title_ar: null,
  all_title_en: null,
  all_body_ar: null,
  all_body_en: null,
  all_cta_ar: null,
  all_cta_en: null,
  types_kicker_ar: null,
  types_kicker_en: null,
  types_title_ar: null,
  types_title_en: null,
  types_body_ar: null,
  types_body_en: null,
};

/** Base name of every admin-editable, locale-suffixed setting string —
 *  `siteText(settings, "vip_kicker", locale)` reads `vip_kicker_ar` or
 *  `vip_kicker_en`. Kept as a type rather than a bare `string` parameter so a
 *  typo in the base name is a build error, not a silent always-null field. */
export type SiteTextField =
  | "footer_blurb"
  | "footer_tagline"
  | "hero_title"
  | "hero_subtitle"
  | "hero_cta"
  | "vip_kicker"
  | "vip_title"
  | "vip_cta"
  | "featured_kicker"
  | "featured_title"
  | "featured_cta"
  | "all_kicker"
  | "all_title"
  | "all_body"
  | "all_cta"
  | "types_kicker"
  | "types_title"
  | "types_body";

/** The admin-edited string for this field and locale, or null when the
 *  office has never set it (or cleared it back to blank) — callers fall back
 *  to their own next-intl copy in that case: `siteText(...) ?? t(...)`. */
export function siteText(
  settings: SiteSettings,
  field: SiteTextField,
  locale: Locale,
): string | null {
  const value = settings[`${field}_${locale}` as keyof SiteSettings];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export interface Area {
  id: number;
  slug: string;
  name: string;
}

export interface PropertyType {
  id: number;
  key: string;
  slug: string;
  name: string;
}

export interface Amenity {
  id: number;
  key: string;
  name: string;
}

export type Purpose = "rent" | "sale";
export type PropertyStatus = "available" | "rented" | "sold" | "reserved";

export interface PropertyListItem {
  id: number;
  ref_no: string;
  slug: string;
  title: string;
  purpose: Purpose;
  status: PropertyStatus;
  price: string;
  currency: "KWD";
  type: { key: string; name: string };
  area: { slug: string; name: string };
  block: string | null;
  rooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  area_sqm: string | number | null;
  is_premium: boolean;
  is_featured: boolean;
  is_vip: boolean;
  main_image: string | null;
  images_count: number;
  published_at: string | null;
}

export interface PropertyImage {
  url: string;
  alt: string | null;
  is_main: boolean;
  sort_order: number;
}

export interface PropertyDetail extends PropertyListItem {
  description: string | null;
  amenities: { key: string; name: string }[];
  images: PropertyImage[];
  latitude: string | number | null;
  longitude: string | number | null;
  created_at: string;
}

/** A home-page hero slide, flattened for one locale by the API. */
export interface Banner {
  id: number;
  /** `/uploads/…` — run it through `mediaUrl` before rendering. */
  image_url: string;
  alt: string;
  href: string | null;
}

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

export interface SmartSearchResult {
  items: PropertyListItem[];
  relaxed: string[];
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export class PublicApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

function buildUrl(path: string, searchParams?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      // Repeated params (?area=a&area=b), matching how /public/v1/properties
      // reads a multi-valued filter -- .set() would keep only the last one.
      for (const item of value) url.searchParams.append(key, item);
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseError(response: Response): Promise<PublicApiError> {
  try {
    const body = await response.json();
    return new PublicApiError(
      body?.code ?? "unknown",
      body?.message ?? response.statusText,
      response.status,
    );
  } catch {
    return new PublicApiError("unknown", response.statusText, response.status);
  }
}

export async function apiGet<T>(path: string, searchParams?: Query): Promise<T> {
  const response = await fetch(buildUrl(path, searchParams), { cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

/** Server-side read that never throws — pages render with the fallback when
 *  the API is down (and during `next build`, which runs with no API). */
export async function safeGet<T>(path: string, searchParams: Query | undefined, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path, searchParams);
  } catch {
    return fallback;
  }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  searchParams?: Query,
): Promise<T> {
  const response = await fetch(buildUrl(path, searchParams), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Typed endpoints
// ---------------------------------------------------------------------------

export function getSettings(): Promise<SiteSettings> {
  return safeGet<SiteSettings>("/settings", undefined, DEFAULT_SETTINGS);
}

export function getAreas(locale: Locale): Promise<Area[]> {
  return safeGet<Area[]>("/areas", { locale }, []);
}

export function getPropertyTypes(locale: Locale): Promise<PropertyType[]> {
  return safeGet<PropertyType[]>("/property-types", { locale }, []);
}

/** Live hero slides, in the order the office arranged them in the admin.
 *  Image, alt text and link target all come from here — the storefront ships
 *  no banner artwork of its own. Empty means the hero renders nothing, which
 *  is the correct reading of "every banner is hidden". */
export function getBanners(locale: Locale): Promise<Banner[]> {
  return safeGet<Banner[]>("/banners", { locale }, []);
}

/** `/properties/featured` answers `{items:[…]}`, not a bare array — reading it
 *  as an array made `.length` undefined, so "Our distinctive properties" showed
 *  its empty state even with featured listings published. */
export async function getFeaturedProperties(locale: Locale): Promise<PropertyListItem[]> {
  const result = await safeGet<{ items: PropertyListItem[] }>(
    "/properties/featured",
    { locale },
    { items: [] },
  );
  return result.items ?? [];
}

/** The VIP row. Same `{items:[…]}` envelope as `/properties/featured`, and the
 *  same empty-list fallback: a VIP row with nothing in it drops out of the
 *  page rather than rendering an empty carousel. */
export async function getVipProperties(locale: Locale): Promise<PropertyListItem[]> {
  const result = await safeGet<{ items: PropertyListItem[] }>(
    "/properties/vip",
    { locale },
    { items: [] },
  );
  return result.items ?? [];
}

export function getProperties(
  locale: Locale,
  filters: Query = {},
): Promise<Paginated<PropertyListItem>> {
  return safeGet<Paginated<PropertyListItem>>(
    "/properties",
    { locale, ...filters },
    { items: [], next_cursor: null },
  );
}

/** Arabic slugs travel percent-encoded, and Next hands the route segment over
 *  still encoded. Encoding that again yields `%25D8%25B4…`, which matches no
 *  row — decode first, then encode exactly once. Slugify strips `%`, so a real
 *  slug can never be mangled by the decode. */
export function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function getProperty(locale: Locale, slug: string): Promise<PropertyDetail | null> {
  try {
    return await apiGet<PropertyDetail>(
      `/properties/${encodeURIComponent(decodeSlugParam(slug))}`,
      { locale },
    );
  } catch {
    return null;
  }
}
