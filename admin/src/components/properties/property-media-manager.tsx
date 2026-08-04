"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Star, Trash2, UploadCloud } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { usePermission } from "@/hooks/use-permission"
import { propertiesApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { mediaUrl } from "@/lib/format"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { cn } from "@/lib/utils"
import type { PropertyMediaItemOut, PropertyOut } from "@/lib/api/types"

/**
 * Property gallery: multipart upload (file picker or drag-drop), set main,
 * reorder with up/down (two PATCHes that swap sort_order), delete. State
 * lives in the property detail query — every mutation invalidates it.
 */
export function PropertyMediaManager({ property }: { property: PropertyOut }) {
  const t = useTranslations("properties.media")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const canEdit = usePermission(PERMISSIONS.propertiesEdit)

  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [deleting, setDeleting] = useState<PropertyMediaItemOut | null>(null)

  const items = [...property.media].sort((a, b) => a.sort_order - b.sort_order)

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.properties.detail(property.id),
    })
    await queryClient.invalidateQueries({ queryKey: queryKeys.properties.all })
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    )
    if (list.length === 0) return
    setUploadingCount(list.length)
    let failed = 0
    for (const file of list) {
      try {
        await propertiesApi.uploadMedia(property.id, file)
      } catch (error) {
        failed += 1
        toast.error(getErrorMessage(error, c("unknownError")))
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1))
      }
    }
    await invalidate()
    if (failed < list.length) toast.success(t("uploaded"))
  }

  async function setMain(item: PropertyMediaItemOut) {
    try {
      await propertiesApi.updateMedia(property.id, item.id, { is_main: true })
      await invalidate()
      toast.success(t("mainSet"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = items[index]
    const neighbor = items[index + direction]
    if (!target || !neighbor) return
    try {
      // Swap sort orders. Two sequential PATCHes; the API validates each.
      await propertiesApi.updateMedia(property.id, target.id, {
        sort_order: neighbor.sort_order,
      })
      await propertiesApi.updateMedia(property.id, neighbor.id, {
        sort_order: target.sort_order,
      })
      await invalidate()
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  async function handleDelete(item: PropertyMediaItemOut) {
    try {
      await propertiesApi.deleteMedia(property.id, item.id)
      await invalidate()
      toast.success(t("deleted"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
      throw error
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canEdit && (
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              void uploadFiles(event.dataTransfer.files)
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-8 text-center transition-colors",
              dragOver && "border-ring bg-muted/60"
            )}
          >
            <UploadCloud className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{t("dropHint")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingCount > 0}
              onClick={() => inputRef.current?.click()}
            >
              {uploadingCount > 0
                ? t("uploading", { count: uploadingCount })
                : t("upload")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files)
                event.target.value = ""
              }}
            />
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-2"
              >
                <div className="relative">
                  {/* Uploads live on the API origin, outside Next's optimiser. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(item.media.storage_key)}
                    alt=""
                    className="aspect-4/3 w-full rounded-md object-cover"
                  />
                  {item.is_main && (
                    <Badge className="absolute start-1.5 top-1.5 gap-1 bg-gold text-gold-foreground">
                      <Star className="size-3" aria-hidden />
                      {t("main")}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("moveUp")}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("moveDown")}
                        disabled={index === items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      {!item.is_main && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setMain(item)}
                        >
                          {t("setMain")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={c("remove")}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={t("deleteTitle")}
          description={t("deleteDescription")}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </Card>
  )
}
