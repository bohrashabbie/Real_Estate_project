import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

/**
 * hreflang alternates for a locale-less path. Every indexable page sets these
 * so Google pairs the Arabic and English versions of the same URL instead of
 * treating them as duplicates.
 */
export function localeAlternates(path: string): Record<string, string> {
  return Object.fromEntries(locales.map((locale) => [locale, `/${locale}${path}`]));
}

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  // Arabic is the default but still carries its prefix — an unprefixed `/`
  // that silently means Arabic makes canonical URLs and hreflang ambiguous.
  localePrefix: "always",
});
