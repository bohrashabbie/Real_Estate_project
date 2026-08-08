"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ImageOff, UploadCloud } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
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
import { locales, type Locale } from "@/i18n/routing"
import { bannersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { uploadUrl } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BannerOut } from "@/lib/api/types"

/** `datetime-local` speaks naive local time; the API speaks ISO 8601. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function useBannerSchema() {
  const t = useTranslations("banners")
  return z
    .object({
      href: z.string(),
      is_active: z.boolean(),
      starts_at: z.string(),
      ends_at: z.string(),
      alt_ar: z.string(),
      alt_en: z.string(),
    })
    // Alt text is the only description a screen reader or a broken-image
    // fallback ever gets, so at least one locale must carry one.
    .refine((v) => v.alt_ar.trim() || v.alt_en.trim(), {
      message: t("validation.altRequired"),
      path: ["alt_ar"],
    })
    .refine(
      (v) => !v.starts_at || !v.ends_at || new Date(v.ends_at) > new Date(v.starts_at),
      { message: t("validation.windowOrder"), path: ["ends_at"] }
    )
}

type FormValues = z.infer<ReturnType<typeof useBannerSchema>>
const FIELD_NAMES = ["href", "is_active", "starts_at", "ends_at"] as const

/** Media chosen in this dialog but not yet saved, keyed by what it applies to:
 *  "default" is the banner's own artwork, a locale key is that locale's override. */
type PendingMedia = Record<string, { id: number; url: string | null }>

/** Clearing a slot removes the key rather than storing undefined, so
 *  `media[locale]?.id ?? null` stays the single way to read "no override". */
function withSlot(
  current: PendingMedia,
  slot: string,
  value: { id: number; url: string | null } | undefined
): PendingMedia {
  const next = { ...current }
  if (value) next[slot] = value
  else delete next[slot]
  return next
}

export function BannerFormDialog({
  banner,
  nextSortOrder,
  open,
  onOpenChange,
  onSaved,
}: {
  /** Undefined = create mode. */
  banner?: BannerOut
  /** Appends new banners to the end of the list rather than the front. */
  nextSortOrder: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}) {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const schema = useBannerSchema()
  const isEdit = !!banner

  const translationFor = (locale: Locale) =>
    banner?.translations.find((item) => item.locale === locale)

  const [media, setMedia] = useState<PendingMedia>(() => {
    const initial: PendingMedia = {}
    if (banner) {
      initial.default = { id: banner.media_id, url: banner.image_url }
      for (const translation of banner.translations) {
        if (translation.media_id) {
          initial[translation.locale] = {
            id: translation.media_id,
            url: translation.image_url,
          }
        }
      }
    }
    return initial
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      href: banner?.href ?? "",
      is_active: banner?.is_active ?? true,
      starts_at: toLocalInput(banner?.starts_at ?? null),
      ends_at: toLocalInput(banner?.ends_at ?? null),
      alt_ar: translationFor("ar")?.alt_text ?? "",
      alt_en: translationFor("en")?.alt_text ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    const defaultMedia = media.default
    if (!defaultMedia) {
      toast.error(t("validation.imageRequired"))
      return
    }

    const alt: Record<Locale, string> = {
      ar: values.alt_ar.trim(),
      en: values.alt_en.trim(),
    }
    // Only send locales that actually have alt text — an empty row would fail
    // the API's min_length and tells the storefront nothing anyway.
    const translations = locales
      .filter((locale) => alt[locale])
      .map((locale) => ({
        locale,
        alt_text: alt[locale],
        media_id: media[locale]?.id ?? null,
      }))

    const payload = {
      media_id: defaultMedia.id,
      href: values.href.trim() ? values.href.trim() : null,
      is_active: values.is_active,
      starts_at: fromLocalInput(values.starts_at),
      ends_at: fromLocalInput(values.ends_at),
      translations,
    }

    try {
      if (banner) await bannersApi.update(banner.id, payload)
      else await bannersApi.create({ ...payload, sort_order: nextSortOrder })
      await onSaved()
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
            <ArtworkField
              label={t("fields.image")}
              hint={t("hints.image")}
              value={media.default}
              onChange={(value) => setMedia((current) => withSlot(current, "default", value))}
              required
            />

            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                {t("perLocaleTitle")}
              </p>
              <p className="text-xs text-muted-foreground">{t("perLocaleHint")}</p>
              {locales.map((locale) => (
                <div key={locale} className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name={locale === "ar" ? "alt_ar" : "alt_en"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("fields.altText", { locale: locale.toUpperCase() })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <ArtworkField
                    label={t("fields.localeImage", {
                      locale: locale.toUpperCase(),
                    })}
                    value={media[locale]}
                    onChange={(value) => setMedia((current) => withSlot(current, locale, value))}
                    compact
                    clearable
                  />
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="href"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.href")}</FormLabel>
                  <FormControl>
                    <Input dir="ltr" placeholder="/smart-search" {...field} />
                  </FormControl>
                  <FormDescription>{t("hints.href")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="starts_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.startsAt")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ends_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.endsAt")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              {t("hints.window")}
            </p>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Label htmlFor="banner-active">{t("fields.isActive")}</Label>
                    <FormControl>
                      <Switch
                        id="banner-active"
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

/**
 * Upload-and-preview for one image slot. The file is uploaded immediately —
 * the media row exists before the banner is saved, which is what lets a
 * half-filled form show a real preview instead of a local blob URL that
 * disappears on reload.
 */
function ArtworkField({
  label,
  hint,
  value,
  onChange,
  required = false,
  compact = false,
  clearable = false,
}: {
  label: string
  hint?: string
  value: { id: number; url: string | null } | undefined
  onChange: (value: { id: number; url: string | null } | undefined) => void
  required?: boolean
  compact?: boolean
  clearable?: boolean
}) {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const preview = uploadUrl(value?.url)

  async function upload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const media = await bannersApi.upload(file)
      // The upload endpoint answers with a storage key; the banner endpoints
      // answer with a resolved path. Normalise to the latter so the preview
      // works either way.
      onChange({ id: media.id, url: `/uploads/${media.storage_key}` })
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void upload(event.dataTransfer.files[0])
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border p-3 transition-colors",
          dragOver && "border-ring bg-muted/60"
        )}
      >
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-md bg-muted",
            compact ? "w-24" : "w-40"
          )}
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="" className="aspect-3/1 w-full object-cover" />
          ) : (
            <div className="flex aspect-3/1 w-full items-center justify-center">
              <ImageOff className="size-4 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="size-3.5" aria-hidden />
              {uploading ? t("uploading") : value ? t("replace") : t("upload")}
            </Button>
            {clearable && value && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onChange(undefined)}
              >
                {c("remove")}
              </Button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
