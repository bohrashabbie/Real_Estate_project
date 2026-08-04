"use client"

import { useTranslations } from "next-intl"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { PropertyForm } from "@/components/properties/property-form"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useRouter } from "@/i18n/navigation"
import { PERMISSIONS } from "@/lib/permissions"

export default function NewPropertyPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.propertiesCreate}>
      <NewPropertyContent />
    </RequireRoutePermission>
  )
}

function NewPropertyContent() {
  const t = useTranslations("properties")
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/properties" },
          { label: t("new") },
        ]}
      />
      <PageHeader title={t("new")} description={t("newDescription")} />
      <PropertyForm
        onCreated={(created) => router.replace(`/properties/${created.id}`)}
      />
    </div>
  )
}
