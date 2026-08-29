"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { usePermission } from "@/hooks/use-permission"
import { settingsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

/**
 * Every group here writes to the same generic `Setting` key/value store —
 * `bulk_upsert_settings` has no whitelist, so a new `site.<name>` pair just
 * starts existing the first time this form saves it. Grouped into cards by
 * where each string actually shows up (contact, social, footer, then one
 * card per home-page section) rather than one long alphabetical list.
 *
 * The four home-page groups are *_ar/_en pairs, not a `*_translations`
 * table: these are singleton strings (one hero, one VIP section), not rows
 * keyed by an entity, so the join a translations table implies would buy
 * nothing here. See SPEC.md.
 *
 * `as const` keeps every `name` a string literal rather than widening to
 * `string`, which is what lets `FormValues` below be a real record of exact
 * field names instead of `{[key: string]: string}` — the latter's `keyof`
 * includes `number`, which `react-hook-form`'s `name` prop then rejects.
 */
const GROUPS = [
  {
    titleKey: "siteTitle",
    descriptionKey: "siteDescription",
    fields: [
      { key: "site.phone", name: "phone", dir: "ltr" },
      { key: "site.whatsapp", name: "whatsapp", dir: "ltr" },
      { key: "site.email", name: "email", dir: "ltr" },
      { key: "site.name_ar", name: "name_ar", dir: "rtl" },
      { key: "site.name_en", name: "name_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "socialTitle",
    descriptionKey: "socialDescription",
    fields: [
      { key: "site.instagram", name: "instagram", dir: "ltr" },
      { key: "site.x", name: "x", dir: "ltr" },
      { key: "site.snapchat", name: "snapchat", dir: "ltr" },
    ],
  },
  {
    titleKey: "footerTitle",
    descriptionKey: "footerDescription",
    fields: [
      { key: "site.footer_blurb_ar", name: "footer_blurb_ar", dir: "rtl" },
      { key: "site.footer_blurb_en", name: "footer_blurb_en", dir: "ltr" },
      { key: "site.footer_tagline_ar", name: "footer_tagline_ar", dir: "rtl" },
      { key: "site.footer_tagline_en", name: "footer_tagline_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "heroTitle",
    descriptionKey: "heroDescription",
    fields: [
      { key: "site.hero_title_ar", name: "hero_title_ar", dir: "rtl" },
      { key: "site.hero_title_en", name: "hero_title_en", dir: "ltr" },
      { key: "site.hero_subtitle_ar", name: "hero_subtitle_ar", dir: "rtl" },
      { key: "site.hero_subtitle_en", name: "hero_subtitle_en", dir: "ltr" },
      { key: "site.hero_cta_ar", name: "hero_cta_ar", dir: "rtl" },
      { key: "site.hero_cta_en", name: "hero_cta_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "vipTitle",
    descriptionKey: "vipDescription",
    fields: [
      { key: "site.vip_title_ar", name: "vip_title_ar", dir: "rtl" },
      { key: "site.vip_title_en", name: "vip_title_en", dir: "ltr" },
      { key: "site.vip_cta_ar", name: "vip_cta_ar", dir: "rtl" },
      { key: "site.vip_cta_en", name: "vip_cta_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "featuredTitle",
    descriptionKey: "featuredDescription",
    fields: [
      { key: "site.featured_title_ar", name: "featured_title_ar", dir: "rtl" },
      { key: "site.featured_title_en", name: "featured_title_en", dir: "ltr" },
      { key: "site.featured_cta_ar", name: "featured_cta_ar", dir: "rtl" },
      { key: "site.featured_cta_en", name: "featured_cta_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "allTitle",
    descriptionKey: "allDescription",
    fields: [
      { key: "site.all_title_ar", name: "all_title_ar", dir: "rtl" },
      { key: "site.all_title_en", name: "all_title_en", dir: "ltr" },
      { key: "site.all_body_ar", name: "all_body_ar", dir: "rtl" },
      { key: "site.all_body_en", name: "all_body_en", dir: "ltr" },
      { key: "site.all_cta_ar", name: "all_cta_ar", dir: "rtl" },
      { key: "site.all_cta_en", name: "all_cta_en", dir: "ltr" },
    ],
  },
  {
    titleKey: "typesTitle",
    descriptionKey: "typesDescription",
    fields: [
      { key: "site.types_title_ar", name: "types_title_ar", dir: "rtl" },
      { key: "site.types_title_en", name: "types_title_en", dir: "ltr" },
      { key: "site.types_body_ar", name: "types_body_ar", dir: "rtl" },
      { key: "site.types_body_en", name: "types_body_en", dir: "ltr" },
    ],
  },
] as const

// `flatMap` can't infer a union element type across tuples this differently
// shaped — each group's `fields` is its own literal tuple type — so the
// element type is named explicitly and each group is widened to it going in.
type AnyField = (typeof GROUPS)[number]["fields"][number]
const ALL_FIELDS: AnyField[] = GROUPS.flatMap(
  (group) => group.fields as readonly AnyField[],
)

type FieldName = AnyField["name"]
type FormValues = Record<FieldName, string>

// Every field is a freeform, optional string — nothing here needs `zod`'s
// validation, only `zodResolver`'s shape to satisfy `useForm`.
const schema = z.record(z.string(), z.string())

const EMPTY_VALUES = Object.fromEntries(
  ALL_FIELDS.map((field) => [field.name, ""]),
) as FormValues

export default function SettingsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.settingsView}>
      <SettingsContent />
    </RequireRoutePermission>
  )
}

function SettingsContent() {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const canManage = usePermission(PERMISSIONS.settingsManage)

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: ({ signal }) => settingsApi.list(signal),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  })

  // Seed the form once settings arrive (and again after a refetch). A key
  // with no row yet (nothing has ever saved it) reads as "", same as a row
  // whose value happens to be empty — both mean "use the storefront default".
  useEffect(() => {
    if (!settingsQuery.data) return
    const byKey = new Map(
      settingsQuery.data.map((setting) => [setting.key, setting.value])
    )
    form.reset(
      Object.fromEntries(
        ALL_FIELDS.map((field) => [field.name, String(byKey.get(field.key) ?? "")])
      ) as FormValues
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data])

  async function onSubmit(values: FormValues) {
    try {
      await settingsApi.updateBulk({
        items: ALL_FIELDS.map((field) => ({
          key: field.key,
          value: values[field.name as keyof FormValues],
        })),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      toast.success(t("updated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      {settingsQuery.isLoading && <ListLoadingSkeleton rows={6} />}
      {settingsQuery.isError && (
        <ListErrorState
          error={settingsQuery.error}
          onRetry={() => settingsQuery.refetch()}
        />
      )}

      {settingsQuery.data && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            {GROUPS.map((group) => (
              <Card key={group.titleKey}>
                <CardHeader>
                  <CardTitle>{t(group.titleKey)}</CardTitle>
                  <CardDescription>{t(group.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <FormField
                        key={field.key}
                        control={form.control}
                        name={field.name as keyof FormValues}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>{t(`fields.${field.name}`)}</FormLabel>
                            <FormControl>
                              <Input dir={field.dir} disabled={!canManage} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {canManage && (
              <div>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || !form.formState.isDirty}
                >
                  {form.formState.isSubmitting ? c("saving") : c("save")}
                </Button>
              </div>
            )}
          </form>
        </Form>
      )}
    </div>
  )
}
