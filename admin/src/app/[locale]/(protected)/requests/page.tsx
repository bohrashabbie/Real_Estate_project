"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { useCursorList } from "@/hooks/use-cursor-list"
import { usePermission } from "@/hooks/use-permission"
import { useQueryParam } from "@/hooks/use-query-param"
import {
  useAreaOptions,
  usePropertyTypeOptions,
} from "@/hooks/use-taxonomy-options"
import { propertyRequestsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { formatMoney, translatedName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { REQUEST_STATUS_VALUES } from "@/lib/status"
import type {
  PropertyRequestOut,
  PropertyRequestStatus,
} from "@/lib/api/types"

const ALL = "all"

export default function RequestsPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.requestsView}>
      <RequestsContent />
    </RequireRoutePermission>
  )
}

function RequestsContent() {
  const t = useTranslations("requests")
  const p = useTranslations("properties")
  const c = useTranslations("common")
  const format = useFormatter()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const canManage = usePermission(PERMISSIONS.requestsManage)

  const [statusParam, setStatusParam] = useQueryParam("status")
  const status = (statusParam as PropertyRequestStatus) || null

  const { areas } = useAreaOptions(false)
  const { propertyTypes } = usePropertyTypeOptions(false)

  const list = useCursorList<PropertyRequestOut>({
    queryKey: queryKeys.propertyRequests.list({ status }),
    fetchPage: (cursor, signal) =>
      propertyRequestsApi.list({ cursor, limit: 25, status }, signal),
  })

  async function changeStatus(
    request: PropertyRequestOut,
    next: PropertyRequestStatus
  ) {
    try {
      await propertyRequestsApi.updateStatus(request.id, { status: next })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.propertyRequests.all,
      })
      toast.success(t("statusUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  const typeName = (id: number | null) => {
    if (id === null) return "—"
    const type = propertyTypes.find((entry) => entry.id === id)
    return type ? translatedName(type.translations, locale) : `#${id}`
  }
  const areaName = (id: number | null) => {
    if (id === null) return "—"
    const area = areas.find((entry) => entry.id === id)
    return area ? translatedName(area.translations, locale) : `#${id}`
  }

  const budget = (request: PropertyRequestOut) => {
    if (!request.budget_min && !request.budget_max) return "—"
    const min = request.budget_min
      ? formatMoney(request.budget_min, locale)
      : "…"
    const max = request.budget_max
      ? formatMoney(request.budget_max, locale)
      : "…"
    return `${min} – ${max}`
  }

  const columns: ColumnDef<PropertyRequestOut, unknown>[] = [
    {
      id: "from",
      header: t("columns.from"),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            {row.original.phone}
          </span>
        </div>
      ),
    },
    {
      id: "purpose",
      header: t("columns.purpose"),
      cell: ({ row }) =>
        row.original.purpose ? (
          <Badge variant="outline">{p(`purposes.${row.original.purpose}`)}</Badge>
        ) : (
          "—"
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
      cell: ({ row }) => areaName(row.original.area_id),
    },
    {
      id: "budget",
      header: t("columns.budget"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {budget(row.original)}
        </span>
      ),
    },
    {
      id: "rooms",
      header: t("columns.rooms"),
      cell: ({ row }) => row.original.rooms ?? "—",
    },
    {
      id: "notes",
      header: t("columns.notes"),
      cell: ({ row }) =>
        row.original.notes ? (
          <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
            {row.original.notes}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) =>
        canManage ? (
          <Select
            value={row.original.status}
            onValueChange={(next) =>
              changeStatus(row.original, next as PropertyRequestStatus)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge
            status={row.original.status}
            label={t(`statuses.${row.original.status}`)}
          />
        ),
    },
    {
      id: "received",
      header: t("columns.received"),
      cell: ({ row }) =>
        format.dateTime(new Date(row.original.created_at), "short"),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusParam ?? ALL}
          onValueChange={(next) => setStatusParam(next === ALL ? null : next)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={c("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{c("all")}</SelectItem>
            {REQUEST_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`statuses.${value}`)}
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
        emptyDescription={t("empty")}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      />
    </div>
  )
}
