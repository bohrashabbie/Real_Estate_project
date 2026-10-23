"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RotateCcw, Search, Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import {
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePermission } from "@/hooks/use-permission"
import { Link } from "@/i18n/navigation"
import { siteTextsApi } from "@/lib/api/endpoints"
import { getErrorMessage } from "@/lib/api/error-message"
import type { SiteTextTree } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"

type Locale = "en" | "ar"
const LOCALES: Locale[] = ["en", "ar"]

/**
 * Texts the Settings page already controls -- the website prefers the
 * Settings value over its default, so editing them here too would mean two
 * places for one line. These rows point to Settings instead.
 */
const IN_SETTINGS = new Set([
  "hero.title",
  "hero.subtitle",
  "hero.cta",
  "home.vipTitle",
  "home.vipCta",
  "home.featuredCta",
  "home.allTitle",
  "home.typesTitle",
  "footer.blurb",
  "footer.tagline",
])

type Row = { key: string; section: string; defaults: Record<Locale, string> }

function flatten(tree: SiteTextTree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${name}` : name
    if (typeof value === "string") out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

const cell = (locale: Locale, key: string) => `${locale}:${key}`

/**
 * Every text on the public website, editable in both languages (on
 * request). The defaults come from the website's own language files; only
 * the lines the office changes are saved, and saving a line back to its
 * default removes the change.
 */
export default function ContentPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.contentView}>
      <ContentEditor />
    </RequireRoutePermission>
  )
}

function ContentEditor() {
  const t = useTranslations("content")
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const canManage = usePermission(PERMISSIONS.contentManage)

  const defaultsQuery = useQuery({
    queryKey: queryKeys.siteTexts.defaults(),
    queryFn: ({ signal }) => siteTextsApi.defaults(signal),
    staleTime: 5 * 60 * 1000,
  })
  const savedQuery = useQuery({
    queryKey: queryKeys.siteTexts.list(),
    queryFn: ({ signal }) => siteTextsApi.list(signal),
  })

  const [section, setSection] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const rows = useMemo<Row[]>(() => {
    if (!defaultsQuery.data) return []
    const en = flatten(defaultsQuery.data.en)
    const ar = flatten(defaultsQuery.data.ar)
    return Object.keys(en).map((key) => ({
      key,
      section: key.split(".")[0],
      defaults: { en: en[key], ar: ar[key] ?? "" },
    }))
  }, [defaultsQuery.data])

  const saved = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of savedQuery.data ?? []) map[cell(item.locale, item.key)] = item.value
    return map
  }, [savedQuery.data])

  const sections = useMemo(() => [...new Set(rows.map((row) => row.section))], [rows])
  const activeSection = section ?? sections[0] ?? null

  const current = (row: Row, locale: Locale) => saved[cell(locale, row.key)] ?? row.defaults[locale]
  const value = (row: Row, locale: Locale) => drafts[cell(locale, row.key)] ?? current(row, locale)

  const changes = rows.flatMap((row) =>
    LOCALES.flatMap((locale) => {
      const draft = drafts[cell(locale, row.key)]
      return draft !== undefined && draft !== current(row, locale) ? [{ row, locale, draft }] : []
    })
  )
  const invalid = changes.filter(
    ({ row, locale, draft }) =>
      draft.trim() !== "" && placeholders(draft).join() !== placeholders(row.defaults[locale]).join()
  )

  const needle = query.trim().toLowerCase()
  const visible = needle
    ? rows.filter((row) =>
        [row.key, ...LOCALES.map((locale) => value(row, locale))].some((text) =>
          text.toLowerCase().includes(needle)
        )
      )
    : rows.filter((row) => row.section === activeSection)

  const editedIn = (name: string) =>
    rows.filter(
      (row) => row.section === name && LOCALES.some((locale) => saved[cell(locale, row.key)] !== undefined)
    ).length

  function setDraft(row: Row, locale: Locale, text: string) {
    setDrafts((prev) => ({ ...prev, [cell(locale, row.key)]: text }))
  }

  async function save() {
    setSaving(true)
    try {
      await siteTextsApi.save({
        items: changes.map(({ row, locale, draft }) => ({
          key: row.key,
          locale,
          // Back to the default (or emptied) removes the change.
          value: draft.trim() === row.defaults[locale].trim() ? "" : draft,
        })),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.siteTexts.list() })
      setDrafts({})
      toast.success(t("saved"))
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    } finally {
      setSaving(false)
    }
  }

  const loading = defaultsQuery.isLoading || savedQuery.isLoading
  const failed = defaultsQuery.isError ? defaultsQuery : savedQuery.isError ? savedQuery : null

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader title={t("title")} description={t("description")} />

      {loading && <ListLoadingSkeleton rows={8} />}
      {failed && <ListErrorState error={failed.error} onRetry={() => failed.refetch()} />}

      {!loading && !failed && (
        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("sections")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0.5 px-2">
              {sections.map((name) => {
                const edited = editedIn(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSection(name)
                      setQuery("")
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted",
                      !needle && name === activeSection && "bg-muted font-medium"
                    )}
                  >
                    <span>{t.has(`sectionLabels.${name}`) ? t(`sectionLabels.${name}`) : name}</span>
                    {edited > 0 && <Badge variant="secondary">{edited}</Badge>}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                className="ps-9"
              />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {needle
                  ? t("results", { count: visible.length })
                  : activeSection && t.has(`sectionLabels.${activeSection}`)
                    ? t(`sectionLabels.${activeSection}`)
                    : activeSection}
              </h2>
              {!needle && activeSection && editedIn(activeSection) > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("editedCount", { count: editedIn(activeSection) })}
                </span>
              )}
            </div>

            {needle && visible.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noResults", { query })}</p>
            )}

            {visible.map((row) => (
              <TextRow
                key={row.key}
                row={row}
                showSection={!!needle}
                canManage={canManage}
                saved={saved}
                value={(locale) => value(row, locale)}
                onChange={(locale, text) => setDraft(row, locale, text)}
              />
            ))}
          </div>
        </div>
      )}

      {canManage && changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDrafts({})} disabled={saving}>
              {c("cancel")}
            </Button>
            <Button onClick={save} disabled={saving || invalid.length > 0}>
              {saving ? c("saving") : t("save", { count: changes.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TextRow({
  row,
  showSection,
  canManage,
  saved,
  value,
  onChange,
}: {
  row: Row
  showSection: boolean
  canManage: boolean
  saved: Record<string, string>
  value: (locale: Locale) => string
  onChange: (locale: Locale, text: string) => void
}) {
  const t = useTranslations("content")
  const name = row.key.split(".").slice(1).join(".")
  const forScreenReaders = /aria|Aria|Alt$|Label$/.test(name)
  const names = placeholders(row.defaults.en)

  if (IN_SETTINGS.has(row.key)) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {showSection ? row.key : name}
            </p>
            <p className="truncate text-sm">{row.defaults.en}</p>
            <p className="text-sm text-muted-foreground">{t("inSettings")}</p>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/settings" />}>
            <Settings className="size-4" />
            {t("openSettings")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {showSection ? row.key : name}
          </span>
          {LOCALES.some((locale) => saved[cell(locale, row.key)] !== undefined) && (
            <Badge>{t("edited")}</Badge>
          )}
          {forScreenReaders && <Badge variant="outline">{t("screenReader")}</Badge>}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {LOCALES.map((locale) => {
            const text = value(locale)
            const isSaved = saved[cell(locale, row.key)] !== undefined
            const changed = text !== (saved[cell(locale, row.key)] ?? row.defaults[locale])
            const broken =
              text.trim() !== "" &&
              placeholders(text).join() !== placeholders(row.defaults[locale]).join()
            const long = row.defaults[locale].length > 70 || text.length > 70
            const Field = long ? Textarea : Input
            return (
              <div key={locale} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {locale === "en" ? t("english") : t("arabic")}
                  </span>
                  {canManage && (isSaved || changed) && text !== row.defaults[locale] && (
                    <button
                      type="button"
                      onClick={() => onChange(locale, row.defaults[locale])}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" />
                      {t("reset")}
                    </button>
                  )}
                </div>
                <Field
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  value={text}
                  disabled={!canManage}
                  rows={long ? 3 : undefined}
                  onChange={(event: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
                    onChange(locale, event.target.value)
                  }
                  className={cn(
                    changed && "border-amber-500 ring-1 ring-amber-500/30",
                    broken && "border-destructive ring-destructive/30"
                  )}
                  aria-invalid={broken || undefined}
                />
                {broken ? (
                  <p className="text-xs text-destructive">
                    {t("placeholderError", {
                      names: placeholders(row.defaults[locale]).map((n) => `{${n}}`).join(" "),
                    })}
                  </p>
                ) : isSaved && text !== row.defaults[locale] ? (
                  <p className="truncate text-xs text-muted-foreground" dir={locale === "ar" ? "rtl" : "ltr"}>
                    {t("default", { text: row.defaults[locale] })}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        {names.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("keepPlaceholders", { names: names.map((n) => `{${n}}`).join(" ") })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
