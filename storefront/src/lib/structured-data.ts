import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

/** `w91111`, `@w91111` and a full profile URL all end up as one link. */
export function socialUrl(base: string, handle: string | null | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${base}${value.replace(/^@/, "")}`;
}

/** "97711779" → "+96597711779". Search engines want one unambiguous form,
 *  and the office saves its numbers the local way, without the country code.
 *  Anything already carrying a country code, or not Kuwaiti-shaped, is left
 *  alone rather than mangled. */
export function phoneE164(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (value.startsWith("+")) return `+${digits}`;
  if (digits.length === 8) return `+965${digits}`;
  if (digits.startsWith("965") && digits.length === 11) return `+${digits}`;
  return value;
}

/**
 * The office as machine-readable data, rendered on every page.
 *
 * Without it, a search engine or an AI answer has only the page's own text to
 * read a phone number out of — and whatever it cached the last time it
 * visited, which is how the office's retired numbers kept turning up in
 * Google's AI Overview months after they changed. This states the current
 * ones, straight from admin Settings, so there is a single authoritative
 * answer to "what is kwt25's number" that updates the moment the office
 * edits it.
 */
export function officeStructuredData(settings: SiteSettings, locale: Locale) {
  const phone = phoneE164(settings.phone);
  const whatsapp = phoneE164(settings.whatsapp);
  const sameAs = [
    socialUrl("https://instagram.com/", settings.instagram),
    socialUrl("https://x.com/", settings.x),
    socialUrl("https://www.snapchat.com/add/", settings.snapchat),
    whatsapp ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}` : null,
  ].filter((url): url is string => Boolean(url));

  const contactPoint = [
    phone && {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: phone,
      availableLanguage: ["ar", "en"],
      areaServed: "KW",
    },
    whatsapp && {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: whatsapp,
      contactOption: "TollFree",
      availableLanguage: ["ar", "en"],
      areaServed: "KW",
    },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${absoluteUrl("/")}#office`,
    name: (locale === "ar" ? settings.name_ar : settings.name_en) || "kwt25",
    url: absoluteUrl(`/${locale}`),
    logo: absoluteUrl("/brand/kwt25-logo-mark.webp"),
    image: absoluteUrl("/brand/kwt25-logo-full.webp"),
    ...(phone ? { telephone: phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    address: { "@type": "PostalAddress", addressCountry: "KW" },
    areaServed: { "@type": "Country", name: "Kuwait" },
    ...(contactPoint.length > 0 ? { contactPoint } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}
