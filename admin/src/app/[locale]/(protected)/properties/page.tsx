"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Crown, ImageOff, Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { useQueryParam } from "@/hooks/use-query-param"
import {
  useAreaOptions,
  usePropertyTypeOptions,
} from "@/hooks/use-taxonomy-options"
import { Link, useRouter } from "@/i18n/navigation"
import { propertiesApi } from "@/lib/api/endpoints"
import {
  formatMoney,
  mediaUrl,
  propertyTitle,
  translatedName,
} from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import {
  PROPERTY_PURPOSE_VALUES,
  PROPERTY_STATUS_VALUES,
} from "@/lib/status"
import type {
  PropertyOut,
  PropertyPurpose,
  PropertyStatus,
} from "@/lib/api/types"

const ALL = "all"

export default function PropertiesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.propertiesView}>
      <PropertiesContent />
    </RequireRoutePermission>
  )
}

function PropertiesContent() {
  const t = useTranslations("properties")
  const c = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const [qParam, setQParam] = useQueryParam("q")
  const [purposeParam, setPurposeParam] = useQueryParam("purpose")
  const [statusParam, setStatusParam] = useQueryParam("status")
  const [typeParam, setTypeParam] = useQueryParam("type")
  const [areaParam, setAreaParam] = useQueryParam("area")

  // Debounced free-text search so each keystroke doesn't refire the query.
  const [search, setSearch] = useState(qParam ?? "")
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((qParam ?? "") !== search) setQParam(search.trim() || null)
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const { areas } = useAreaOptions()
  const { propertyTypes } = usePropertyTypeOptions()

  const typeId = typeParam ? Number(typeParam) : null
  const areaId = areaParam ? Number(areaParam) : null

  const filters = {
    q: qParam,
    purpose: (purposeParam as PropertyPurpose) || null,
    status: (statusParam as PropertyStatus) || null,
    type_id: typeId,
    area_id: areaId,
  }

  const list = useCursorList<PropertyOut>({
    queryKey: queryKeys.properties.list(filters),
    fetchPage: (cursor, signal) =>
      propertiesApi.list({ ...filters, cursor, limit: 20 }, signal),
  })

  const typeName = (id: number) => {
    const type = propertyTypes.find((entry) => entry.id === id)
    return type ? translatedName(type.translations, locale) : `#${id}`
  }
  const areaName = (id: number) => {
    const area = areas.find((entry) => entry.id === id)
    return area ? translatedName(area.translations, locale) : `#${id}`
  }

  const columns: ColumnDef<PropertyOut, unknown>[] = [
    {
      id: "thumbnail",
      header: "",
      cell: ({ row }) =>
        row.original.main_image_key ? (
          // Uploads are served by the API origin, outside Next's optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(row.original.main_image_key)}
            alt=""
            className="size-11 rounded-md border border-border object-cover"
          />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImageOff className="size-4" aria-hidden />
          </span>
        ),
    },
    {
      accessorKey: "ref_no",
      header: t("columns.refNo"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground" dir="ltr">
          {row.original.ref_no}
        </code>
      ),
    },
    {
      id: "title",
      header: t("columns.title"),
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-56 font-medium text-foreground">
          {propertyTitle(row.original.translations, locale)}
        </span>
      ),
    },
    {
      id: "type",
      header: t("columns.type"),
      cell: ({ row }) => typeName(row.original.property_type_id),
    },
    {
      id: "area",
      header: t("columns.area"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{areaName(row.original.area_id)}</span>
          {row.original.block && (
            <span className="text-xs text-muted-foreground">
              {t("blockShort", { block: row.original.block })}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "purpose",
      header: t("columns.purpose"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {t(`purposes.${row.original.purpose}`)}
        </Badge>
      ),
    },
    {
      id: "price",
      header: t("columns.price"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatMoney(row.original.price, locale)}
          {row.original.purpose === "rent" && (
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              {t("perMonth")}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={t(`statuses.${row.original.status}`)}
        />
      ),
    },
    {
      id: "flags",
      header: t("columns.flags"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.is_featured && (
            <Badge variant="secondary" className="gap-1">
              <Star className="size-3 text-gold" aria-hidden />
              {t("featured")}
            </Badge>
          )}
          {row.original.is_vip && (
            <Badge variant="secondary" className="gap-1">
              <Crown className="size-3 text-gold" aria-hidden />
              {t("vip")}
            </Badge>
          )}
          {row.original.is_premium && (
            <Badge variant="secondary" className="text-gold">
              {t("premium")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "published",
      header: t("columns.published"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.published_at ? "published" : "draft"}
          label={
            row.original.published_at ? t("publishedLabel") : t("draftLabel")
          }
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.propertiesCreate}>
            <Button render={<Link href="/properties/new" />}>{t("new")}</Button>
          </RequirePermission>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-64"
        />

        <Select
          value={purposeParam ?? ALL}
          onValueChange={(next) => setPurposeParam(next === ALL ? null : next)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("columns.purpose")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allPurposes")}</SelectItem>
            {PROPERTY_PURPOSE_VALUES.map((purpose) => (
              <SelectItem key={purpose} value={purpose}>
                {t(`purposes.${purpose}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusParam ?? ALL}
          onValueChange={(next) => setStatusParam(next === ALL ? null : next)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={c("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {PROPERTY_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeParam ?? ALL}
          onValueChange={(next) => setTypeParam(next === ALL ? null : next)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("columns.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allTypes")}</SelectItem>
            {propertyTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {translatedName(type.translations, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={areaParam ?? ALL}
          onValueChange={(next) => setAreaParam(next === ALL ? null : next)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("columns.area")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allAreas")}</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {translatedName(area.translations, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={list.items}
        isLoading={list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(property) => router.push(`/properties/${property.id}`)}
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />
    </div>
  )
}
