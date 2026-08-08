import type {
  NameTranslationOut,
  PropertyTranslationOut,
} from "@/lib/api/types"

/**
 * Money arrives from the API as a NUMERIC(12,3) string in KWD. It is never
 * parsed into a float for arithmetic — the backend owns all money maths.
 * This only formats for display. KWD is subdivided into 1000 fils, but listing
 * prices are round dinars, so trailing zero fils are dropped for readability
 * (650 KD/month, KD 85,000 — per SPEC).
 */
export function formatMoney(
  amount: string | null | undefined,
  locale: string,
  currency = "KWD"
): string {
  if (amount === null || amount === undefined || amount === "") return "—"
  const numeric = Number(amount)
  if (Number.isNaN(numeric)) return amount
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW" : "en-KW", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(numeric)
}

/** Plain localized number (area m², counts). */
export function formatNumber(
  value: string | number | null | undefined,
  locale: string
): string {
  if (value === null || value === undefined || value === "") return "—"
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW" : "en-KW", {
    maximumFractionDigits: 2,
  }).format(numeric)
}

type AnyTranslation = { locale: string }

/**
 * Picks the translation row for the active locale, falling back to the other
 * locale rather than rendering blank — an admin should always see *something*
 * identifiable even if one language hasn't been filled in yet.
 */
export function pickTranslation<T extends AnyTranslation>(
  translations: T[] | undefined,
  locale: string
): T | undefined {
  if (!translations || translations.length === 0) return undefined
  return translations.find((t) => t.locale === locale) ?? translations[0]
}

/** Display name for taxonomy records (areas / property types / amenities). */
export function translatedName(
  translations: NameTranslationOut[] | undefined,
  locale: string,
  fallback = "—"
): string {
  return pickTranslation(translations, locale)?.name ?? fallback
}

/** Display title for a property. */
export function propertyTitle(
  translations: PropertyTranslationOut[] | undefined,
  locale: string,
  fallback = "—"
): string {
  return pickTranslation(translations, locale)?.title ?? fallback
}

/** Bilingual name for records with plain name_ar/name_en columns (roles). */
export function bilingualName(
  record: { name_ar: string; name_en: string },
  locale: string
): string {
  return locale === "ar" ? record.name_ar : record.name_en
}

/**
 * Public URL for an uploaded file. The API serves /uploads from its own origin
 * (one directory above /api/v1), so the base URL is trimmed rather than
 * assuming the admin and the API share a host.
 */
export function mediaUrl(storageKey: string): string {
  return `${apiOrigin()}/uploads/${storageKey}`
}

/**
 * Same idea for endpoints that hand back an already-rooted path (`/uploads/…`)
 * rather than a bare storage key — banners resolve their per-locale artwork
 * server-side, so the admin only ever sees the finished path.
 */
export function uploadUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${apiOrigin()}${path.startsWith("/") ? "" : "/"}${path}`
}

function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/v1\/?$/, "")
}
