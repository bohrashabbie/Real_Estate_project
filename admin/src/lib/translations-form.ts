import { locales, type Locale } from "@/i18n/routing"
import type {
  NameTranslationIn,
  NameTranslationOut,
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
  translations: NameTranslationOut[] | undefined
): NameTranslationForm {
  const form = {} as NameTranslationForm
  for (const locale of locales) {
    const row = translations?.find((t) => t.locale === locale)
    form[locale] = { name: row?.name ?? "" }
  }
  return form
}

export function fromNameTranslationForm(
  form: NameTranslationForm
): NameTranslationIn[] {
  return locales
    .filter((locale) => form[locale]?.name?.trim())
    .map((locale) => ({ locale, name: form[locale].name.trim() }))
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
