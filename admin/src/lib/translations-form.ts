import { locales, type Locale } from "@/i18n/routing"
import type {
  NameTranslations,
  PropertyTranslationIn,
  PropertyTranslationOut,
} from "@/lib/api/types"

/**
 * The API stores translations as one row per locale; forms are easier to write
 * keyed by locale. These convert between the two shapes so no page has to
 * hand-roll the mapping (and accidentally drop a locale).
 */

export type NameTranslationForm = Record<Locale, { name: string }>

export type PropertyTranslationForm = Record<
  Locale,
  { title: string; description: string }
>

export function toNameTranslationForm(
  translations: NameTranslations | undefined
): NameTranslationForm {
  const form = {} as NameTranslationForm
  for (const locale of locales) {
    form[locale] = { name: translations?.[locale] ?? "" }
  }
  return form
}

export function fromNameTranslationForm(
  form: NameTranslationForm
): NameTranslations {
  const out: NameTranslations = {}
  for (const locale of locales) {
    const name = form[locale]?.name?.trim()
    // Locales left blank are omitted rather than sent empty: the API upserts
    // by locale, so an empty string would overwrite a good translation.
    if (name) out[locale] = name
  }
  return out
}

export function toPropertyTranslationForm(
  translations: PropertyTranslationOut[] | undefined
): PropertyTranslationForm {
  const form = {} as PropertyTranslationForm
  for (const locale of locales) {
    const row = translations?.find((t) => t.locale === locale)
    form[locale] = {
      title: row?.title ?? "",
      description: row?.description ?? "",
    }
  }
  return form
}

export function fromPropertyTranslationForm(
  form: PropertyTranslationForm
): PropertyTranslationIn[] {
  return locales
    .filter((locale) => form[locale]?.title?.trim())
    .map((locale) => ({
      locale,
      title: form[locale].title.trim(),
      description: form[locale].description?.trim()
        ? form[locale].description.trim()
        : null,
      // Slug is backend-generated from the title; sending null keeps the
      // per-locale unique column out of the form entirely.
      slug: null,
    }))
}
