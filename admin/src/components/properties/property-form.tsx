"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { LocationPicker } from "@/components/properties/location-picker"
import { usePermission } from "@/hooks/use-permission"
import {
  useAmenityOptions,
  useAreaOptions,
  usePropertyTypeOptions,
} from "@/hooks/use-taxonomy-options"
import { propertiesApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import {
  fromPropertyTranslationForm,
  toPropertyTranslationForm,
} from "@/lib/translations-form"
import {
  PROPERTY_PURPOSE_VALUES,
  PROPERTY_STATUS_VALUES,
} from "@/lib/status"
import type {
  PropertyCreate,
  PropertyOut,
  PropertyPurpose,
  PropertyStatus,
  PropertyUpdate,
} from "@/lib/api/types"

/** KWD is NUMERIC(12,3): digits with up to 3 decimals, as a string. */
const MONEY_RE = /^\d{1,9}(\.\d{1,3})?$/
/** NUMERIC(10,2) sqm. */
const SQM_RE = /^\d{1,8}(\.\d{1,2})?$/
/** NUMERIC(9,6) coordinates, optionally signed. */
const COORD_RE = /^-?\d{1,3}(\.\d{1,6})?$/
const INT_RE = /^\d{1,4}$/

function usePropertySchema() {
  const v = useTranslations("validation")
  const optionalPattern = (re: RegExp, message: string) =>
    z.string().regex(re, message).or(z.literal(""))

  return z
    .object({
      purpose: z.enum(PROPERTY_PURPOSE_VALUES),
      status: z.enum(PROPERTY_STATUS_VALUES),
      property_type_id: z.string().min(1, v("required")),
      area_id: z.string().min(1, v("required")),
      block: z.string().max(20, v("tooLong")),
      address_note: z.string(),
      price: z.string().min(1, v("required")).regex(MONEY_RE, v("money")),
      rooms: optionalPattern(INT_RE, v("integer")),
      bathrooms: optionalPattern(INT_RE, v("integer")),
      floors: optionalPattern(INT_RE, v("integer")),
      area_sqm: optionalPattern(SQM_RE, v("decimal")),
      latitude: optionalPattern(COORD_RE, v("coordinate")),
      longitude: optionalPattern(COORD_RE, v("coordinate")),
      is_featured: z.boolean(),
      is_premium: z.boolean(),
      amenity_ids: z.array(z.number()),
      translations: z.object({
        ar: z.object({ title: z.string(), description: z.string() }),
        en: z.object({ title: z.string(), description: z.string() }),
      }),
    })
    // At least one locale needs a title or the listing has no display value.
    .refine(
      (val) =>
        val.translations.ar.title.trim() || val.translations.en.title.trim(),
      { message: v("titleRequired"), path: ["translations.ar.title"] }
    )
}

type FormValues = z.infer<ReturnType<typeof usePropertySchema>>

const FIELD_NAMES = [
  "purpose",
  "status",
  "property_type_id",
  "area_id",
  "block",
  "address_note",
  "price",
  "rooms",
  "bathrooms",
  "floors",
  "area_sqm",
  "latitude",
  "longitude",
] as const

function toInt(value: string): number | null {
  return value.trim() === "" ? null : Number(value)
}

function toStr(value: string): string | null {
  return value.trim() === "" ? null : value.trim()
}

export function PropertyForm({
  property,
  onCreated,
}: {
  /** Undefined = create mode. */
  property?: PropertyOut
  onCreated?: (created: PropertyOut) => void
}) {
  const t = useTranslations("properties")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const schema = usePropertySchema()
  const isEdit = !!property
  const canWrite = usePermission(
    isEdit ? PERMISSIONS.propertiesEdit : PERMISSIONS.propertiesCreate
  )

  const { areas } = useAreaOptions()
  const { propertyTypes } = usePropertyTypeOptions()
  const { amenities } = useAmenityOptions()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      purpose: property?.purpose ?? "rent",
      status: property?.status ?? "available",
      property_type_id: property ? String(property.property_type_id) : "",
      area_id: property ? String(property.area_id) : "",
      block: property?.block ?? "",
      address_note: property?.address_note ?? "",
      price: property?.price ?? "",
      rooms: property?.rooms != null ? String(property.rooms) : "",
      bathrooms: property?.bathrooms != null ? String(property.bathrooms) : "",
      floors: property?.floors != null ? String(property.floors) : "",
      area_sqm: property?.area_sqm ?? "",
      latitude: property?.latitude ?? "",
      longitude: property?.longitude ?? "",
      is_featured: property?.is_featured ?? false,
      is_premium: property?.is_premium ?? false,
      amenity_ids: property?.amenity_ids ?? [],
      translations: toPropertyTranslationForm(property?.translations),
    },
  })

  function toggleAmenity(amenityId: number, checked: boolean) {
    const current = form.getValues("amenity_ids")
    form.setValue(
      "amenity_ids",
      checked
        ? [...current, amenityId]
        : current.filter((id) => id !== amenityId),
      { shouldDirty: true }
    )
  }

  async function onSubmit(values: FormValues) {
    const base = {
      purpose: values.purpose as PropertyPurpose,
      status: values.status as PropertyStatus,
      property_type_id: Number(values.property_type_id),
      area_id: Number(values.area_id),
      block: toStr(values.block),
      address_note: toStr(values.address_note),
      price: values.price,
      rooms: toInt(values.rooms),
      bathrooms: toInt(values.bathrooms),
      floors: toInt(values.floors),
      area_sqm: toStr(values.area_sqm),
      latitude: toStr(values.latitude),
      longitude: toStr(values.longitude),
      is_featured: values.is_featured,
      is_premium: values.is_premium,
      amenity_ids: values.amenity_ids,
      translations: fromPropertyTranslationForm(values.translations),
    }

    try {
      if (isEdit) {
        await propertiesApi.update(property.id, base as PropertyUpdate)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.properties.all,
        })
        toast.success(t("updated"))
      } else {
        const created = await propertiesApi.create(base as PropertyCreate)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.properties.all,
        })
        toast.success(t("created"))
        onCreated?.(created)
      }
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

  const amenityIds = form.watch("amenity_ids")

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* -------- Titles & descriptions, AR / EN tabs ------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.content")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ar" className="w-full">
              <TabsList>
                <TabsTrigger value="ar">{t("tabs.arabic")}</TabsTrigger>
                <TabsTrigger value="en">{t("tabs.english")}</TabsTrigger>
              </TabsList>
              {(["ar", "en"] as const).map((lang) => (
                <TabsContent key={lang} value={lang} className="mt-4 flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name={`translations.${lang}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(`fields.title_${lang}`)}</FormLabel>
                        <FormControl>
                          <Input
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            disabled={!canWrite}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${lang}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(`fields.description_${lang}`)}</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            disabled={!canWrite}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* -------- Classification & location ----------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.details")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.purpose")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canWrite}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_PURPOSE_VALUES.map((purpose) => (
                          <SelectItem key={purpose} value={purpose}>
                            {t(`purposes.${purpose}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.status")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canWrite}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`statuses.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.type")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canWrite}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {translatedName(type.translations, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.area")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canWrite}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectArea")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={String(area.id)}>
                            {translatedName(area.translations, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="block"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.block")}</FormLabel>
                    <FormControl>
                      <Input disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("purpose") === "rent"
                        ? t("fields.priceRent")
                        : t("fields.priceSale")}
                    </FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.areaSqm")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.addressNote")}</FormLabel>
                    <FormControl>
                      <Input disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {(["rooms", "bathrooms", "floors"] as const).map((name) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(`fields.${name}`)}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" inputMode="numeric" disabled={!canWrite} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.latitude")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" placeholder="29.3759" disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.longitude")}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" placeholder="47.9774" disabled={!canWrite} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pick the location visually — clicking/dragging fills the
                latitude/longitude fields; typing there moves the pin. */}
            <div className="mt-4 space-y-1.5">
              <Label>{t("fields.locationPicker")}</Label>
              <p className="text-xs text-muted-foreground">{t("fields.locationPickerHint")}</p>
              <LocationPicker
                latitude={form.watch("latitude") ?? ""}
                longitude={form.watch("longitude") ?? ""}
                disabled={!canWrite}
                onChange={(latitude, longitude) => {
                  form.setValue("latitude", latitude, { shouldDirty: true, shouldValidate: true })
                  form.setValue("longitude", longitude, { shouldDirty: true, shouldValidate: true })
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* -------- Amenities --------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.amenities")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {amenities.map((amenity) => (
                <div key={amenity.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={amenityIds.includes(amenity.id)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) =>
                      toggleAmenity(amenity.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`amenity-${amenity.id}`}
                    className="font-normal"
                  >
                    {translatedName(amenity.translations, locale)}
                  </Label>
                </div>
              ))}
              {amenities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("noAmenities")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* -------- Flags -------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.visibility")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="featured-switch">
                        {t("fields.isFeatured")}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t("hints.featured")}
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        id="featured-switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canWrite}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_premium"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="premium-switch">
                        {t("fields.isPremium")}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t("hints.premium")}
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        id="premium-switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canWrite}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {canWrite && (
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? c("saving")
                : isEdit
                  ? c("save")
                  : c("create")}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
