"use client"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "next-intl"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { StatTile } from "@/components/dashboard/stat-tile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ListErrorState } from "@/components/states/list-states"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { NAV_SECTIONS } from "@/config/nav"
import { Link } from "@/i18n/navigation"
import { analyticsApi } from "@/lib/api/endpoints"
import { PERMISSIONS } from "@/lib/permissions"
import { queryKeys } from "@/lib/query/keys"
import { useAuth } from "@/providers/auth-provider"
import type { DashboardOut } from "@/lib/api/types"

export default function DashboardPage() {
  const t = useTranslations("nav")
  const auth = useTranslations("auth")
  const { user, permissions } = useAuth()

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.href !== "/dashboard" &&
        (!item.permission || permissions.has(item.permission))
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: t("dashboard") }]} />
      <PageHeader
        title={t("dashboard")}
        description={
          user
            ? `${auth("signedInAs")} ${user.full_name} (${user.email})`
            : undefined
        }
      />

      {permissions.has(PERMISSIONS.analyticsView) && <AnalyticsSection />}

      {sections.map((section) => (
        <div key={section.labelKey} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t(section.labelKey)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                        <Icon className="size-4" />
                      </div>
                      <CardTitle className="min-w-0 truncate">
                        {t(item.labelKey)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsSection() {
  const t = useTranslations("dashboard")

  const dashboardQuery = useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: ({ signal }) => analyticsApi.dashboard(signal),
  })

  if (dashboardQuery.isError) {
    return (
      <ListErrorState
        error={dashboardQuery.error}
        onRetry={() => dashboardQuery.refetch()}
      />
    )
  }

  const data = dashboardQuery.data
  if (dashboardQuery.isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  const rentCount =
    data.by_purpose.find((entry) => entry.purpose === "rent")?.count ?? 0
  const saleCount =
    data.by_purpose.find((entry) => entry.purpose === "sale")?.count ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("kpi.totalProperties")}
          value={String(data.properties_total)}
          changePct={null}
        />
        <StatTile
          label={t("kpi.publishedProperties")}
          value={String(data.properties_published)}
          changePct={null}
        />
        <StatTile
          label={t("kpi.availableProperties")}
          value={String(data.properties_available)}
          changePct={null}
        />
        <StatTile
          label={t("kpi.byPurpose")}
          value={t("kpi.byPurposeValue", { rent: rentCount, sale: saleCount })}
          changePct={null}
        />
        <StatTile
          label={t("kpi.newInquiries7d")}
          value={String(data.new_inquiries_7d)}
          changePct={null}
        />
        <StatTile
          label={t("kpi.newRequests7d")}
          value={String(data.new_requests_7d)}
          changePct={null}
        />
      </div>

      <RecentInquiriesCard data={data} />
    </div>
  )
}

function RecentInquiriesCard({ data }: { data: DashboardOut }) {
  const t = useTranslations("dashboard")
  const i = useTranslations("inquiries")
  const format = useFormatter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentInquiries")}</CardTitle>
        <CardDescription>
          <Link
            href="/inquiries"
            className="underline-offset-4 hover:underline"
          >
            {t("viewAllInquiries")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.recent_inquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{i("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i("columns.from")}</TableHead>
                  <TableHead>{i("columns.message")}</TableHead>
                  <TableHead>{i("columns.source")}</TableHead>
                  <TableHead>{i("columns.status")}</TableHead>
                  <TableHead>{i("columns.received")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_inquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {inquiry.name}
                        </span>
                        <span
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {inquiry.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-2 max-w-md text-sm text-muted-foreground">
                        {inquiry.message}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {i(`sources.${inquiry.source}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={inquiry.status}
                        label={i(`statuses.${inquiry.status}`)}
                      />
                    </TableCell>
                    <TableCell>
                      {format.dateTime(new Date(inquiry.created_at), "short")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
