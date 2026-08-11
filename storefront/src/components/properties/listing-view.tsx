"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useInfiniteQuery } from "@tanstack/react-query";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  apiGet,
  type Area,
  type Paginated,
  type PropertyListItem,
  type PropertyType,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyRow } from "@/components/property/property-row";
import { FilterRail } from "@/components/properties/filter-rail";
import {
  EMPTY_FILTERS,
  countActive,
  fromSearchParams,
  toQueryString,
  type Filters,
} from "@/components/properties/filter-state";
import {
  CloseIcon,
  GridIcon,
  ListIcon,
  MapIcon,
  ResetIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/ui/icons";

// Map view is heavy (maplibre) — load it only when the visitor switches to it.
const MapExplorer = dynamic(
  () => import("@/components/map/map-explorer").then((m) => m.MapExplorer),
  { ssr: false },
);

type View = "list" | "grid" | "map";

/**
 * /properties — a filter rail beside a result column.
 *
 * The layout is the change here. Filters were a full-width accordion stacked on
 * top of the results: opening it buried the listings, closing it hid the search,
 * and the first property never appeared above the fold either way. Now the rail
 * holds the controls permanently at the side and the results start at the top of
 * the column next to it, so filtering and its consequence are on screen together.
 *
 * Below `lg` the rail becomes a full-height sheet behind a single trigger, which
 * renders the identical `FilterRail` — one set of controls, two placements.
 *
 * The URL remains the shareable source of truth: state initialises from the
 * search params and every change is written back (debounced for the number
 * inputs). The API takes single-valued `type`/`status`, so multi-selections and
 * the sqm / featured filters are applied client-side over the fetched pages.
 */
export function ListingView({
  areas,
  types,
  locale,
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() =>
    fromSearchParams(new URLSearchParams(searchParams)),
  );
  const [view, setView] = useState<View>("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  // State → URL, debounced so the price/sqm inputs don't churn history.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const qs = toQueryString(filters);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // The sheet covers the page, so the page behind it must not scroll, and Esc
  // must close it — it is a modal in everything but name.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  // Server-side filter subset. Multi-valued selections drop to "no param" and
  // get applied client-side below.
  const serverQuery = useMemo(() => {
    const query: Record<string, string> = { locale };
    if (filters.area) query.area = filters.area;
    if (filters.types.length === 1) query.type = filters.types[0];
    if (filters.purposes.length === 1) query.purpose = filters.purposes[0];
    if (filters.priceMin) query.price_min = filters.priceMin;
    if (filters.priceMax) query.price_max = filters.priceMax;
    if (filters.rooms) query.rooms = filters.rooms;
    if (filters.statuses.length === 1) query.status = filters.statuses[0];
    if (filters.premiumOnly) query.premium_only = "true";
    return query;
  }, [filters, locale]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["properties", serverQuery],
      queryFn: ({ pageParam }) =>
        apiGet<Paginated<PropertyListItem>>("/properties", {
          ...serverQuery,
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      initialPageParam: "",
      getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    });

  const items = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.items) ?? [];
    return all.filter((item) => {
      if (filters.featuredOnly && !item.is_featured) return false;
      if (filters.types.length > 1 && !filters.types.includes(item.type.key)) return false;
      if (filters.statuses.length > 1 && !filters.statuses.includes(item.status)) return false;
      if (filters.sqm) {
        const min = Number.parseFloat(filters.sqm);
        const sqm = item.area_sqm === null ? null : Number.parseFloat(String(item.area_sqm));
        if (Number.isFinite(min) && (sqm === null || sqm < min)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const activeCount = countActive(filters);
  const chips = buildChips(filters, areas, types, setFilters, t);

  return (
    <div className="mx-auto max-w-(--container-site) px-4 sm:px-6">
      {/* ------------------------------------------------------------------ */}
      {/* Page head — a line, not a slab. The old dark banner here pushed the  */}
      {/* first listing most of a screen down.                                 */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-6 pt-10">
        <div>
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
            <span className="h-px w-7 bg-gold" aria-hidden />
            {t("listing.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-navy sm:text-5xl">
            {t("listing.title")}
          </h1>
        </div>
        <p className="text-end">
          <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
            {t("listing.results")}
          </span>
          <span className="font-display text-2xl font-extrabold tabular-nums text-navy">
            {isLoading ? "—" : t("listing.count", { count: items.length })}
          </span>
        </p>
      </header>

      <div className="grid border-t border-cream-200 lg:grid-cols-[16rem_1fr]">
        {/* ---------------------------------------------------------------- */}
        {/* The rail                                                          */}
        {/* ---------------------------------------------------------------- */}
        <aside className="hidden lg:block lg:pe-8">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-7">
            <FilterRail areas={areas} types={types} filters={filters} onChange={setFilters} />
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* The results                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0 py-7 lg:border-s lg:border-cream-200 lg:ps-10">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mobile: the rail's trigger. Desktop: nothing — the rail is
                already on screen, so a button to reveal it would be a lie. */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-2 border border-cream-200 px-4 py-2.5 text-sm font-bold text-navy transition-colors hover:border-gold lg:hidden"
            >
              <SlidersIcon width={16} height={16} className="text-gold" />
              {t("filters.open")}
              {activeCount > 0 ? (
                <span className="bg-gold px-1.5 py-0.5 text-[11px] tabular-nums text-cream">
                  {activeCount}
                </span>
              ) : null}
            </button>

            <div className="ms-auto inline-flex border border-cream-200">
              <ViewButton
                active={view === "list"}
                onClick={() => setView("list")}
                label={t("listing.viewList")}
                icon={<ListIcon width={15} height={15} />}
              />
              <ViewButton
                active={view === "grid"}
                onClick={() => setView("grid")}
                label={t("listing.viewGrid")}
                icon={<GridIcon width={15} height={15} />}
              />
              <ViewButton
                active={view === "map"}
                onClick={() => setView("map")}
                label={t("listing.viewMap")}
                icon={<MapIcon width={15} height={15} />}
              />
            </div>
          </div>

          {/* Active filters — removable, and only present when there is
              something to remove. */}
          {chips.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 border border-cream-200 px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:border-gold hover:text-gold"
                >
                  {chip.label}
                  <CloseIcon width={12} height={12} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-muted transition-colors hover:text-gold"
              >
                <ResetIcon width={13} height={13} />
                {t("filters.clearAll")}
              </button>
            </div>
          ) : null}

          {/* Results ------------------------------------------------------- */}
          {view === "map" ? (
            <div className="mt-6 border border-cream-200">
              <MapExplorer locale={locale} />
            </div>
          ) : isLoading ? (
            <div className={cn("mt-6", view === "grid" && "grid gap-6 sm:grid-cols-2 xl:grid-cols-3")}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "animate-pulse bg-cream-100",
                    view === "grid" ? "h-80" : "mt-px h-36 border-t border-cream-200",
                  )}
                />
              ))}
            </div>
          ) : isError ? (
            <EmptyState title={t("listing.errorTitle")} body={t("listing.errorBody")} />
          ) : items.length === 0 ? (
            <EmptyState
              icon
              title={t("listing.emptyTitle")}
              body={t("listing.emptyBody")}
              action={
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="mt-6 inline-flex items-center gap-2 bg-navy px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
                >
                  {t("filters.clearAll")}
                  <ResetIcon width={15} height={15} />
                </button>
              }
            />
          ) : (
            <>
              {view === "list" ? (
                <div className="mt-6">
                  {items.map((property, i) => (
                    <PropertyRow
                      key={property.id}
                      property={property}
                      locale={locale}
                      index={i + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((property) => (
                    <PropertyCard key={property.id} property={property} locale={locale} />
                  ))}
                </div>
              )}

              {hasNextPage ? (
                <div className="mt-8 border-t border-cream-200 pt-8">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full border border-cream-200 px-8 py-3.5 text-sm font-bold text-navy transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
                  >
                    {isFetchingNextPage ? t("listing.loadingMore") : t("listing.loadMore")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The rail again, as a sheet, below `lg`                              */}
      {/* ------------------------------------------------------------------ */}
      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("filters.title")}
          className="fixed inset-0 z-50 flex flex-col bg-cream lg:hidden"
        >
          <div className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3">
            <span className="font-display text-lg font-extrabold text-navy">
              {t("filters.title")}
            </span>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label={t("filters.close")}
              className="flex h-10 w-10 items-center justify-center border border-cream-200 text-navy transition-colors hover:border-gold hover:text-gold"
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <FilterRail areas={areas} types={types} filters={filters} onChange={setFilters} />
          </div>

          <div className="border-t border-cream-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="w-full bg-navy px-6 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-gold"
            >
              {t("filters.apply")} · {t("listing.count", { count: items.length })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 border-s border-cream-200 px-3.5 py-2.5 text-xs font-bold transition-colors first:border-s-0 sm:px-4",
        active ? "bg-navy text-cream" : "text-muted hover:text-navy",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: boolean;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-6 border border-dashed border-cream-300 px-6 py-16 text-center">
      {icon ? (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-cream-200 text-gold">
          <SearchIcon width={22} height={22} />
        </span>
      ) : null}
      <p className="font-display text-lg font-extrabold text-navy">{title}</p>
      <p className="mt-2 text-muted">{body}</p>
      {action}
    </div>
  );
}

/** The removable summary of what is currently filtered. Kept beside the results
 *  rather than in the rail: the rail shows the *controls*, this shows the
 *  *state*, and on mobile the controls are behind a sheet. */
function buildChips(
  filters: Filters,
  areas: Area[],
  types: PropertyType[],
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  t: ReturnType<typeof useTranslations>,
): { key: string; label: string; onRemove: () => void }[] {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.area) {
    const name = areas.find((a) => a.slug === filters.area)?.name ?? filters.area;
    chips.push({
      key: "area",
      label: t("filters.chipArea", { value: name }),
      onRemove: () => setFilters((f) => ({ ...f, area: "" })),
    });
  }
  for (const typeKey of filters.types) {
    const name = types.find((pt) => pt.key === typeKey)?.name ?? typeKey;
    chips.push({
      key: `type-${typeKey}`,
      label: t("filters.chipType", { value: name }),
      onRemove: () =>
        setFilters((f) => ({ ...f, types: f.types.filter((k) => k !== typeKey) })),
    });
  }
  for (const purpose of filters.purposes) {
    chips.push({
      key: `purpose-${purpose}`,
      label: t("filters.chipPurpose", { value: t(`purpose.${purpose}`) }),
      onRemove: () =>
        setFilters((f) => ({ ...f, purposes: f.purposes.filter((p) => p !== purpose) })),
    });
  }
  if (filters.priceMin) {
    chips.push({
      key: "priceMin",
      label: t("filters.chipPriceMin", { value: filters.priceMin }),
      onRemove: () => setFilters((f) => ({ ...f, priceMin: "" })),
    });
  }
  if (filters.priceMax) {
    chips.push({
      key: "priceMax",
      label: t("filters.chipPriceMax", { value: filters.priceMax }),
      onRemove: () => setFilters((f) => ({ ...f, priceMax: "" })),
    });
  }
  if (filters.rooms) {
    chips.push({
      key: "rooms",
      label: t("filters.chipRooms", { value: filters.rooms }),
      onRemove: () => setFilters((f) => ({ ...f, rooms: "" })),
    });
  }
  if (filters.sqm) {
    chips.push({
      key: "sqm",
      label: t("filters.chipSqm", { value: filters.sqm }),
      onRemove: () => setFilters((f) => ({ ...f, sqm: "" })),
    });
  }
  for (const status of filters.statuses) {
    chips.push({
      key: `status-${status}`,
      label: t("filters.chipStatus", { value: t(`status.${status}`) }),
      onRemove: () =>
        setFilters((f) => ({ ...f, statuses: f.statuses.filter((s) => s !== status) })),
    });
  }
  if (filters.premiumOnly) {
    chips.push({
      key: "premium",
      label: t("filters.chipPremium"),
      onRemove: () => setFilters((f) => ({ ...f, premiumOnly: false })),
    });
  }
  if (filters.featuredOnly) {
    chips.push({
      key: "featured",
      label: t("filters.chipFeatured"),
      onRemove: () => setFilters((f) => ({ ...f, featuredOnly: false })),
    });
  }

  return chips;
}
