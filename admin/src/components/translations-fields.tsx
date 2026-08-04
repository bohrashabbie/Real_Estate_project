"use client"

import { useTranslations } from "next-intl"
import { type Control, type FieldValues, type Path } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { locales } from "@/i18n/routing"

/**
 * Arabic and English side by side, because a taxonomy record is only really
 * complete when both locales are filled in. Translations are separate rows
 * keyed by locale (CLAUDE.md rule 3), so the form flattens them into
 * `translations.ar.name` / `translations.en.name` and the caller reassembles
 * them into the array shape the API expects.
 */
export function TranslationNameFields<T extends FieldValues>({
  control,
}: {
  control: Control<T>
}) {
  const t = useTranslations("taxonomy")

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {locales.map((locale) => (
        <FormField
          key={locale}
          control={control}
          name={`translations.${locale}.name` as Path<T>}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel>{t(`fields.name_${locale}`)}</FormLabel>
              <FormControl>
                <Input dir={locale === "ar" ? "rtl" : "ltr"} {...f} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
