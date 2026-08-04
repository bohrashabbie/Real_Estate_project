"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"
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
import { Link } from "@/i18n/navigation"
import { inquiriesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { INQUIRY_STATUS_VALUES } from "@/lib/status"
import type { InquiryOut, InquiryStatus } from "@/lib/api/types"

const ALL = "all"

export default function InquiriesPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.inquiriesView}>
      <InquiriesContent />
    </RequireRoutePermission>
  )
}

function InquiriesContent() {
  const t = useTranslations("inquiries")
  const c = useTranslations("common")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const canManage = usePermission(PERMISSIONS.inquiriesManage)

  const [statusParam, setStatusParam] = useQueryParam("status")
  const status = (statusParam as InquiryStatus) || null

  const list = useCursorList<InquiryOut>({
    queryKey: queryKeys.inquiries.list({ status }),
    fetchPage: (cursor, signal) =>
      inquiriesApi.list({ cursor, limit: 25, status }, signal),
  })

  async function changeStatus(inquiry: InquiryOut, next: InquiryStatus) {
    try {
      await inquiriesApi.updateStatus(inquiry.id, { status: next })
      await queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all })
      toast.success(t("statusUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  const columns: ColumnDef<InquiryOut, unknown>[] = [
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
      id: "property",
      header: t("columns.property"),
      cell: ({ row }) =>
        row.original.property_id ? (
          <Link
            href={`/properties/${row.original.property_id}`}
            className="text-sm font-medium underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.property_ref_no ?? `#${row.original.property_id}`}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "message",
      header: t("columns.message"),
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {row.original.message}
        </span>
      ),
    },
    {
      id: "source",
      header: t("columns.source"),
      cell: ({ row }) => (
        <Badge variant="outline">{t(`sources.${row.original.source}`)}</Badge>
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
              changeStatus(row.original, next as InquiryStatus)
            }
          >
            <SelectTrigger
              className="w-32"
              onClick={(event) => event.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INQUIRY_STATUS_VALUES.map((value) => (
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder={c("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{c("all")}</SelectItem>
            {INQUIRY_STATUS_VALUES.map((value) => (
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
