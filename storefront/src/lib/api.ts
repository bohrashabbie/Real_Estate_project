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
  name_ar: string;
  name_en: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  name_ar: "عقار الكويت",
  name_en: "Kuwait Real Estate",
};

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

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, searchParams?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") continue;
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
