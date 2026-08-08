"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, ExternalLink, ImageOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { BannerFormDialog } from "@/components/banners/banner-form-dialog"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { StatusBadge } from "@/components/status-badge"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { Button } from "@/components/ui/button"
import { bannersApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { uploadUrl } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import type { BannerOut } from "@/lib/api/types"

export default function BannersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.bannersView}>
      <BannersContent />
    </RequireRoutePermission>
  )
}

/**
 * Home-page hero slides. Deliberately a card list rather than the shared
 * DataTable: the artwork *is* the record, and a 40px table thumbnail tells
 * nobody whether the banner reads well.
 *
 * Order here is the order the storefront renders. One live slide shows as a
 * static hero; two or more turn the hero into a slider automatically, so
 * there is no separate "carousel on/off" switch to keep in sync.
 */
function BannersContent() {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BannerOut | undefined>()
  const [hiding, setHiding] = useState<BannerOut | null>(null)
  const [reordering, setReordering] = useState(false)

  const query = useQuery({
    queryKey: queryKeys.banners.list({ include_inactive: true }),
    queryFn: ({ signal }) => bannersApi.list({ include_inactive: true }, signal),
  })

  const banners = query.data ?? []
  const liveCount = banners.filter((banner) => banner.is_live).length

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.banners.all })
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...banners]
    const target = next[index]
    const neighbor = next[index + direction]
    if (!target || !neighbor) return

    // Send the full resulting order, not a two-row swap: sort_order values can
    // collide or repeat (everything defaults to 0), and re-indexing the whole
    // list from its rendered order is the only way to guarantee the result
    // matches what the user just saw.
    next.splice(index, 1)
    next.splice(index + direction, 0, target)

    setReordering(true)
    try {
      await bannersApi.reorder(
        next.map((banner, position) => ({ id: banner.id, sort_order: position }))
      )
      await invalidate()
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setReordering(false)
    }
  }

  async function handleHide(banner: BannerOut) {
    try {
      await bannersApi.deactivate(banner.id)
      await invalidate()
      toast.success(t("hidden"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  async function handleShow(banner: BannerOut) {
    try {
      await bannersApi.update(banner.id, { is_active: true })
      await invalidate()
      toast.success(t("shown"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.bannersManage}>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t("new")}
            </Button>
          </RequirePermission>
        }
      />

      {banners.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {liveCount === 0
            ? t("summaryNone")
            : liveCount === 1
              ? t("summaryStatic")
              : t("summarySlider", { count: liveCount })}
        </p>
      )}

      {query.isLoading ? (
        <ListLoadingSkeleton rows={3} />
      ) : query.isError ? (
        <ListErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : banners.length === 0 ? (
        <ListEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {banners.map((banner, index) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              index={index}
              total={banners.length}
              reordering={reordering}
              onMove={move}
              onEdit={() => {
                setEditing(banner)
                setFormOpen(true)
              }}
              onHide={() => setHiding(banner)}
              onShow={() => handleShow(banner)}
            />
          ))}
        </ul>
      )}

      {formOpen && (
        <BannerFormDialog
          key={editing?.id ?? "new"}
          banner={editing}
          nextSortOrder={banners.length}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSaved={invalidate}
        />
      )}

      {hiding && (
        <ConfirmDialog
          open={!!hiding}
          onOpenChange={(open) => !open && setHiding(null)}
          title={t("hideTitle")}
          description={t("hideDescription")}
          onConfirm={() => handleHide(hiding)}
        />
      )}
    </div>
  )
}

/** Status shown on the card — "active" alone would be a lie for a slide whose
 *  window hasn't opened yet or has already closed. */
function bannerStatus(banner: BannerOut): "live" | "scheduled" | "expired" | "hidden" {
  if (!banner.is_active) return "hidden"
  if (banner.is_live) return "live"
  const now = Date.now()
  if (banner.starts_at && Date.parse(banner.starts_at) > now) return "scheduled"
  return "expired"
}

function BannerCard({
  banner,
  index,
  total,
  reordering,
  onMove,
  onEdit,
  onHide,
  onShow,
}: {
  banner: BannerOut
  index: number
  total: number
  reordering: boolean
  onMove: (index: number, direction: -1 | 1) => void
  onEdit: () => void
  onHide: () => void
  onShow: () => void
}) {
  const t = useTranslations("banners")
  const c = useTranslations("common")
  const status = bannerStatus(banner)
  const preview = uploadUrl(banner.image_url)

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-56">
        {preview ? (
          /* Uploads live on the API origin, outside Next's optimiser. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt=""
            className="aspect-3/1 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-3/1 w-full items-center justify-center">
            <ImageOff className="size-6 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} label={t(`status.${status}`)} />
          {banner.href && (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              dir="ltr"
            >
              <ExternalLink className="size-3" aria-hidden />
              {banner.href}
            </span>
          )}
        </div>

        <dl className="flex flex-col gap-0.5 text-sm">
          {banner.translations.length === 0 ? (
            <span className="text-muted-foreground">{t("noAltText")}</span>
          ) : (
            banner.translations.map((translation) => (
              <div key={translation.locale} className="flex gap-2">
                <dt className="shrink-0 font-mono text-xs uppercase text-muted-foreground">
                  {translation.locale}
                </dt>
                <dd className="min-w-0 truncate text-foreground">
                  {translation.alt_text}
                  {translation.image_url && (
                    <span className="ms-1.5 text-xs text-muted-foreground">
                      {t("ownArtwork")}
                    </span>
                  )}
                </dd>
              </div>
            ))
          )}
        </dl>

        {(banner.starts_at || banner.ends_at) && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {banner.starts_at?.slice(0, 16).replace("T", " ") ?? "—"}
            {" → "}
            {banner.ends_at?.slice(0, 16).replace("T", " ") ?? "—"}
          </p>
        )}
      </div>

      <RequirePermission permission={PERMISSIONS.bannersManage}>
        <div className="flex items-center gap-1 sm:flex-col sm:items-end">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("moveUp")}
              disabled={index === 0 || reordering}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("moveDown")}
              disabled={index === total - 1 || reordering}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="xs" onClick={onEdit}>
              {c("edit")}
            </Button>
            {banner.is_active ? (
              <Button type="button" variant="ghost" size="xs" onClick={onHide}>
                {t("hide")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="xs" onClick={onShow}>
                {t("show")}
              </Button>
            )}
          </div>
        </div>
      </RequirePermission>
    </li>
  )
}
