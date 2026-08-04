"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TranslationNameFields } from "@/components/translations-fields"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import {
  fromNameTranslationForm,
  toNameTranslationForm,
} from "@/lib/translations-form"
import type { TaxonomyFormPayload, TaxonomyItem } from "./taxonomy-page"

function useTaxonomySchema() {
  const t = useTranslations("taxonomy")
  return z
    .object({
      code: z.string(),
      sort_order: z.coerce.number().int(),
      is_active: z.boolean(),
      translations: z.object({
        ar: z.object({ name: z.string() }),
        en: z.object({ name: z.string() }),
      }),
    })
    // At least one locale must have a name, or the record has no display value
    // anywhere in the admin or storefront.
    .refine(
      (v) => v.translations.ar.name.trim() || v.translations.en.name.trim(),
      { message: t("validation.nameRequired"), path: ["translations.ar.name"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useTaxonomySchema>>
const FIELD_NAMES = ["code", "sort_order", "is_active"] as const

export function TaxonomyFormDialog({
  namespace,
  item,
  codeField,
  open,
  onOpenChange,
  onSubmitPayload,
}: {
  /** Messages namespace for this taxonomy: areas | propertyTypes | amenities. */
  namespace: string
  /** Undefined = create mode. */
  item?: TaxonomyItem
  /** Which identifier column this taxonomy uses ("slug" for areas, "key"
   * for types/amenities), or null to hide the field entirely. */
  codeField: "key" | "slug" | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitPayload: (payload: TaxonomyFormPayload, item?: TaxonomyItem) => Promise<void>
}) {
  const t = useTranslations(namespace)
  const tax = useTranslations("taxonomy")
  const c = useTranslations("common")
  const schema = useTaxonomySchema()
  const isEdit = !!item

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: (codeField === "key" ? item?.key : item?.slug) ?? "",
      sort_order: item?.sort_order ?? 0,
      is_active: item?.is_active ?? true,
      translations: toNameTranslationForm(item?.translations),
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await onSubmitPayload(
        {
          // Empty code is sent as null so the backend derives one from the
          // name rather than storing an empty string in a unique column.
          code: values.code.trim() ? values.code.trim() : null,
          sort_order: values.sort_order,
          is_active: values.is_active,
          translations: fromNameTranslationForm(values.translations),
        },
        item
      )
      toast.success(isEdit ? t("updated") : t("created"))
      onOpenChange(false)
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const unmatched = applyFieldErrors(error, form.setError, FIELD_NAMES)
        if (unmatched.length > 0) {
          toast.error(unmatched.map((f) => f.message).join(" "))
        }
        return
      }
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TranslationNameFields control={form.control} />

            <div className="grid gap-4 sm:grid-cols-2">
              {codeField && (
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {codeField === "key"
                          ? tax("fields.key")
                          : tax("fields.slug")}
                      </FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormDescription>{tax("hints.code")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tax("fields.sortOrder")}</FormLabel>
                    <FormControl>
                      <Input type="number" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="taxonomy-active">
                      {tax("fields.isActive")}
                    </Label>
                    <FormControl>
                      <Switch
                        id="taxonomy-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {c("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? c("saving")
                  : isEdit
                    ? c("save")
                    : c("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
