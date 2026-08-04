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

/** The seeded settings keys, per SPEC.md. */
const SETTING_FIELDS = [
  { key: "site.phone", name: "phone", dir: "ltr" },
  { key: "site.whatsapp", name: "whatsapp", dir: "ltr" },
  { key: "site.email", name: "email", dir: "ltr" },
  { key: "site.instagram", name: "instagram", dir: "ltr" },
  { key: "site.name_ar", name: "name_ar", dir: "rtl" },
  { key: "site.name_en", name: "name_en", dir: "ltr" },
] as const

type FieldName = (typeof SETTING_FIELDS)[number]["name"]

const schema = z.object({
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  instagram: z.string(),
  name_ar: z.string(),
  name_en: z.string(),
})
type FormValues = z.infer<typeof schema>

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
    defaultValues: {
      phone: "",
      whatsapp: "",
      email: "",
      instagram: "",
      name_ar: "",
      name_en: "",
    },
  })

  // Seed the form once settings arrive (and again after a refetch).
  useEffect(() => {
    if (!settingsQuery.data) return
    const byKey = new Map(
      settingsQuery.data.map((setting) => [setting.key, setting.value])
    )
    form.reset(
      Object.fromEntries(
        SETTING_FIELDS.map((field) => [
          field.name,
          String(byKey.get(field.key) ?? ""),
        ])
      ) as FormValues
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data])

  async function onSubmit(values: FormValues) {
    try {
      await settingsApi.updateBulk({
        items: SETTING_FIELDS.map((field) => ({
          key: field.key,
          value: values[field.name as FieldName],
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
        <Card>
          <CardHeader>
            <CardTitle>{t("siteTitle")}</CardTitle>
            <CardDescription>{t("siteDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {SETTING_FIELDS.map((field) => (
                    <FormField
                      key={field.key}
                      control={form.control}
                      name={field.name as FieldName}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>{t(`fields.${field.name}`)}</FormLabel>
                          <FormControl>
                            <Input
                              dir={field.dir}
                              disabled={!canManage}
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {canManage && (
                  <div>
                    <Button
                      type="submit"
                      disabled={
                        form.formState.isSubmitting ||
                        !form.formState.isDirty
                      }
                    >
                      {form.formState.isSubmitting ? c("saving") : c("save")}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
