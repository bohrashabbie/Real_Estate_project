"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { settingsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import { queryKeys } from "@/lib/query/keys"
import type { SettingValue } from "@/lib/api/types"

export const HEADER_MENU_KEY = "site.header_menu"

type MenuLink = { label_ar: string; label_en: string; href: string }

/** Whatever is stored is read defensively: the key is a free JSON value, and a
 *  hand-edited row that isn't a list of objects should read as "no links",
 *  not crash the settings screen. */
function parseLinks(value: SettingValue | undefined): MenuLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const row = item as Record<string, unknown>
    return [
      {
        label_ar: String(row.label_ar ?? ""),
        label_en: String(row.label_en ?? ""),
        href: String(row.href ?? ""),
      },
    ]
  })
}

/**
 * The extra links in the storefront header's dropdown.
 *
 * The language switch and the call button are always there -- they are built
 * into the storefront, not rows here -- and every link saved from this card is
 * listed under them. A list rather than the page's flat string fields, so it
 * saves on its own button instead of riding the main form's.
 */
export function HeaderMenuCard({
  value,
  canManage,
}: {
  value: SettingValue | undefined
  canManage: boolean
}) {
  const t = useTranslations("settings")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const [links, setLinks] = useState<MenuLink[]>(() => parseLinks(value))
  const [saving, setSaving] = useState(false)

  function update(index: number, field: keyof MenuLink, next: string) {
    setLinks((current) =>
      current.map((link, i) => (i === index ? { ...link, [field]: next } : link))
    )
  }

  async function save() {
    const cleaned = links
      .map((link) => ({
        label_ar: link.label_ar.trim(),
        label_en: link.label_en.trim(),
        href: link.href.trim(),
      }))
      // A row left completely blank is an abandoned "Add link", not an error.
      .filter((link) => link.label_ar || link.label_en || link.href)

    if (cleaned.some((link) => !link.href || !(link.label_ar || link.label_en))) {
      toast.error(t("headerMenu.invalid"))
      return
    }

    setSaving(true)
    try {
      await settingsApi.updateBulk({ items: [{ key: HEADER_MENU_KEY, value: cleaned }] })
      setLinks(cleaned)
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      toast.success(t("headerMenu.saved"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("headerMenuTitle")}</CardTitle>
        <CardDescription>{t("headerMenuDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("headerMenu.empty")}</p>
        )}

        {links.map((link, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`menu-${index}-ar`}>{t("headerMenu.labelAr")}</Label>
              <Input
                id={`menu-${index}-ar`}
                dir="rtl"
                value={link.label_ar}
                disabled={!canManage}
                onChange={(event) => update(index, "label_ar", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`menu-${index}-en`}>{t("headerMenu.labelEn")}</Label>
              <Input
                id={`menu-${index}-en`}
                dir="ltr"
                value={link.label_en}
                disabled={!canManage}
                onChange={(event) => update(index, "label_en", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`menu-${index}-href`}>{t("headerMenu.href")}</Label>
              <Input
                id={`menu-${index}-href`}
                dir="ltr"
                placeholder="/request"
                value={link.href}
                disabled={!canManage}
                onChange={(event) => update(index, "href", event.target.value)}
              />
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t("headerMenu.remove")}
              </Button>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground">{t("headerMenu.hrefHint")}</p>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLinks((current) => [...current, { label_ar: "", label_en: "", href: "" }])
              }
            >
              <Plus className="size-3.5" aria-hidden />
              {t("headerMenu.add")}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={save}>
              {saving ? c("saving") : c("save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
