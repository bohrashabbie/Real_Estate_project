"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { StatusFilter, useStatusFilter } from "@/components/status-filter"
import { TaxonomyFormDialog } from "./taxonomy-form-dialog"
import { useCursorList } from "@/hooks/use-cursor-list"
import { getErrorMessage } from "@/lib/api/error-message"
import { translatedName } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import type {
  CursorPage,
  NameTranslationIn,
  NameTranslationOut,
  TaxonomyListParams,
} from "@/lib/api/types"

/** Common row shape across areas / property types / amenities. */
export type TaxonomyItem = {
  id: number
  key?: string
  slug?: string
  sort_order: number
  is_active: boolean
  translations: NameTranslationOut[]
}

/** What the shared dialog hands back; each page maps `code` onto key/slug. */
export type TaxonomyFormPayload = {
  code: string | null
  sort_order: number
  is_active: boolean
  translations: NameTranslationIn[]
}

export type TaxonomyAdapter = {
  list: (
    params: TaxonomyListParams,
    signal?: AbortSignal
  ) => Promise<CursorPage<TaxonomyItem>>
  create: (payload: TaxonomyFormPayload) => Promise<unknown>
  update: (id: number, payload: TaxonomyFormPayload) => Promise<unknown>
  deactivate: (id: number) => Promise<unknown>
}

/**
 * One CRUD surface shared by the three taxonomies — same table, same dialog,
 * same soft-delete flow — parameterised by messages namespace and API adapter.
 */
export function TaxonomyPage({
  namespace,
  codeField,
  adapter,
  queryKeyAll,
  listKey,
}: {
  namespace: string
  codeField: "key" | "slug" | null
  adapter: TaxonomyAdapter
  queryKeyAll: QueryKey
  listKey: (params: { is_active?: boolean | null }) => QueryKey
}) {
  return (
    <RequireRoutePermission permission={PERMISSIONS.taxonomyView}>
      <TaxonomyContent
        namespace={namespace}
        codeField={codeField}
        adapter={adapter}
        queryKeyAll={queryKeyAll}
        listKey={listKey}
      />
    </RequireRoutePermission>
  )
}

function TaxonomyContent({
  namespace,
  codeField,
  adapter,
  queryKeyAll,
  listKey,
}: {
  namespace: string
  codeField: "key" | "slug" | null
  adapter: TaxonomyAdapter
  queryKeyAll: QueryKey
  listKey: (params: { is_active?: boolean | null }) => QueryKey
}) {
  const t = useTranslations(namespace)
  const tax = useTranslations("taxonomy")
  const c = useTranslations("common")
  const locale = useLocale()
  const queryClient = useQueryClient()

  const { status, setStatus, isActive } = useStatusFilter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaxonomyItem | undefined>()
  const [deactivating, setDeactivating] = useState<TaxonomyItem | null>(null)

  const list = useCursorList<TaxonomyItem>({
    queryKey: listKey({ is_active: isActive }),
    fetchPage: (cursor, signal) =>
      adapter.list({ cursor, limit: 50, is_active: isActive }, signal),
  })

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(item: TaxonomyItem) {
    setEditing(item)
    setFormOpen(true)
  }

  async function handleSubmit(payload: TaxonomyFormPayload, item?: TaxonomyItem) {
    if (item) await adapter.update(item.id, payload)
    else await adapter.create(payload)
    await queryClient.invalidateQueries({ queryKey: queryKeyAll })
  }

  async function handleDeactivate(item: TaxonomyItem) {
    try {
      await adapter.deactivate(item.id)
      await queryClient.invalidateQueries({ queryKey: queryKeyAll })
      toast.success(t("deactivated"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  const columns: ColumnDef<TaxonomyItem, unknown>[] = [
    {
      id: "name",
      header: tax("columns.name"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {translatedName(row.original.translations, locale)}
        </span>
      ),
    },
    ...(codeField
      ? ([
          {
            id: "code",
            header:
              codeField === "key" ? tax("fields.key") : tax("fields.slug"),
            cell: ({ row }) => (
              <code className="text-xs text-muted-foreground" dir="ltr">
                {codeField === "key" ? row.original.key : row.original.slug}
              </code>
            ),
          },
        ] as ColumnDef<TaxonomyItem, unknown>[])
      : []),
    {
      accessorKey: "sort_order",
      header: tax("columns.sortOrder"),
    },
    {
      id: "status",
      header: tax("columns.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_active ? "active" : "inactive"}
          label={row.original.is_active ? c("active") : c("inactive")}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RequirePermission permission={PERMISSIONS.taxonomyManage}>
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => openEdit(row.original)}
            >
              {c("edit")}
            </Button>
            {row.original.is_active && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setDeactivating(row.original)}
              >
                {c("deactivate")}
              </Button>
            )}
          </div>
        </RequirePermission>
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
          <RequirePermission permission={PERMISSIONS.taxonomyManage}>
            <Button onClick={openCreate}>{t("new")}</Button>
          </RequirePermission>
        }
      />

      <StatusFilter value={status} onChange={setStatus} />

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

      {formOpen && (
        <TaxonomyFormDialog
          key={editing?.id ?? "new"}
          namespace={namespace}
          item={editing}
          codeField={codeField}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmitPayload={handleSubmit}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          open={!!deactivating}
          onOpenChange={(open) => !open && setDeactivating(null)}
          title={t("deactivateTitle")}
          description={t("deactivateDescription", {
            name: translatedName(deactivating.translations, locale),
          })}
          onConfirm={() => handleDeactivate(deactivating)}
        />
      )}
    </div>
  )
}
