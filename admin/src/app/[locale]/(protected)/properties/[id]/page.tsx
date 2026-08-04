"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { PropertyForm } from "@/components/properties/property-form"
import { PropertyMediaManager } from "@/components/properties/property-media-manager"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { useRouter } from "@/i18n/navigation"
import { propertiesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { propertyTitle } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

export default function PropertyDetailPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.propertiesView}>
      <PropertyDetailContent />
    </RequireRoutePermission>
  )
}

function PropertyDetailContent() {
  const t = useTranslations("properties")
  const c = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const propertyId = Number(params.id)

  const [publishPending, setPublishPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const propertyQuery = useQuery({
    queryKey: queryKeys.properties.detail(propertyId),
    queryFn: ({ signal }) => propertiesApi.get(propertyId, signal),
    enabled: Number.isFinite(propertyId),
  })

  const property = propertyQuery.data

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.properties.all,
    })
  }

  async function togglePublish() {
    if (!property) return
    setPublishPending(true)
    try {
      if (property.published_at) {
        await propertiesApi.unpublish(property.id)
        toast.success(t("unpublished"))
      } else {
        await propertiesApi.publish(property.id)
        toast.success(t("published"))
      }
      await invalidate()
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setPublishPending(false)
    }
  }

  async function handleDelete() {
    if (!property) return
    try {
      await propertiesApi.delete(property.id)
      await invalidate()
      toast.success(t("deleted"))
      router.replace("/properties")
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/properties" },
          {
            label: property
              ? propertyTitle(property.translations, locale)
              : t("detailTitle"),
          },
        ]}
      />

      {propertyQuery.isLoading && <ListLoadingSkeleton rows={8} />}
      {propertyQuery.isError && (
        <ListErrorState
          error={propertyQuery.error}
          onRetry={() => propertyQuery.refetch()}
        />
      )}

      {property && (
        <>
          <PageHeader
            title={propertyTitle(property.translations, locale)}
            description={property.ref_no}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={property.published_at ? "published" : "draft"}
                  label={
                    property.published_at
                      ? t("publishedLabel")
                      : t("draftLabel")
                  }
                />
                {!property.is_active && (
                  <Badge variant="secondary">{t("archived")}</Badge>
                )}
                <RequirePermission permission={PERMISSIONS.propertiesPublish}>
                  <Button
                    variant={property.published_at ? "outline" : "default"}
                    disabled={publishPending}
                    onClick={togglePublish}
                  >
                    {publishPending
                      ? c("saving")
                      : property.published_at
                        ? t("unpublish")
                        : t("publish")}
                  </Button>
                </RequirePermission>
                <RequirePermission permission={PERMISSIONS.propertiesDelete}>
                  {property.is_active && (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      {t("delete")}
                    </Button>
                  )}
                </RequirePermission>
              </div>
            }
          />

          <PropertyForm key={property.updated_at} property={property} />

          <PropertyMediaManager property={property} />

          {confirmDelete && (
            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title={t("deleteTitle")}
              description={t("deleteDescription", {
                title: propertyTitle(property.translations, locale),
              })}
              onConfirm={handleDelete}
            />
          )}
        </>
      )}
    </div>
  )
}
