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
  type PropertyStatus,
  type PropertyType,
} from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { roomsFilterApplies } from "@/lib/property";
import { cn } from "@/lib/utils";
import { MapTabs } from "@/components/map/map-tabs";
import { PropertyCard } from "@/components/property/property-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { OptionGrid, type PickerOption } from "@/components/ui/option-picker";
import {
  BedIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  ExpandIcon,
  HomeIcon,
  MapIcon,
  PinIcon,
  ResetIcon,
  SearchIcon,
  SwapIcon,
  TagIcon,
} from "@/components/ui/icons";

// Map view is heavy (maplibre) — load it only when the visitor switches to it.
const MapExplorer = dynamic(
  () => import("@/components/map/map-explorer").then((m) => m.MapExplorer),
  { ssr: false },
);

/**
 * /properties — client-filterable list.
 *
 * The URL is the shareable source of truth: filter state initialises from the
 * search params and every change is written back (debounced for the free-text
 * inputs). The API takes single-valued `type`/`status`, so multi-selections
 * and the sqm / featured filters are applied client-side on the fetched pages.
 */

interface Filters {
  area: string;
  types: string[];
  purposes: string[]; // both checked == everyone
  priceMin: string;
  priceMax: string;
  rooms: string;
  sqm: string;
  statuses: string[];
  premiumOnly: boolean;
  featuredOnly: boolean;
}

const EMPTY_FILTERS: Filters = {
  area: "",
  types: [],
  purposes: [],
  priceMin: "",
  priceMax: "",
  rooms: "",
  sqm: "",
  statuses: [],
  premiumOnly: false,
  featuredOnly: false,
};

const STATUS_OPTIONS: PropertyStatus[] = ["available", "reserved", "sold"];

/** Which filter's sheet is currently up. One at a time, by design. */
type FilterKey = "area" | "types" | "purposes" | "price" | "rooms" | "sqm" | "statuses";

/** Price brackets are a single-select list like every other filter, so the
 *  min/max pair has to survive as one option value. */
const BRACKET_SEPARATOR = "|";

function fromSearchParams(params: URLSearchParams): Filters {
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  return {
    area: params.get("area") ?? "",
    types: list("type"),
    purposes: list("purpose").filter((p) => p === "rent" || p === "sale"),
    priceMin: params.get("price_min") ?? "",
    priceMax: params.get("price_max") ?? "",
    rooms: params.get("rooms") ?? "",
    sqm: params.get("sqm") ?? "",
    statuses: list("status"),
    premiumOnly: params.get("premium") === "1",
    featuredOnly: params.get("featured") === "1",
  };
}

function toQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.area) params.set("area", filters.area);
  if (filters.types.length) params.set("type", filters.types.join(","));
  if (filters.purposes.length) params.set("purpose", filters.purposes.join(","));
  if (filters.priceMin) params.set("price_min", filters.priceMin);
  if (filters.priceMax) params.set("price_max", filters.priceMax);
  if (filters.rooms) params.set("rooms", filters.rooms);
  if (filters.sqm) params.set("sqm", filters.sqm);
  if (filters.statuses.length) params.set("status", filters.statuses.join(","));
  if (filters.premiumOnly) params.set("premium", "1");
  if (filters.featuredOnly) params.set("featured", "1");
  return params.toString();
}

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

  const [filters, setFilters] = useState<Filters>(() => fromSearchParams(new URLSearchParams(searchParams)));
  // Nothing is expanded on arrival: the visitor sees results first, and opens
  // one filter at a time from the bar.
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [view, setView] = useState<"grid" | "map">("grid");

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
      if (filters.purposes.length > 1) {
        // Both purposes = everyone; nothing to exclude.
      }
      if (filters.statuses.length > 1 && !filters.statuses.includes(item.status)) return false;
      if (filters.sqm) {
        const min = Number.parseFloat(filters.sqm);
        const sqm = item.area_sqm === null ? null : Number.parseFloat(String(item.area_sqm));
        if (Number.isFinite(min) && (sqm === null || sqm < min)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const activePurposeTab =
    filters.purposes.length === 1 ? filters.purposes[0] : "all";

  // Land and floors have no rooms; offering "3+ rooms" against them can only
  // return nothing. The control is withdrawn — and any room count already
  // chosen is dropped with it, because a filter the visitor can no longer see
  // must not keep narrowing their results.
  const showRooms = roomsFilterApplies(filters.types);
  useEffect(() => {
    if (showRooms) return;
    setOpenFilter((open) => (open === "rooms" ? null : open));
    setFilters((f) => (f.rooms ? { ...f, rooms: "" } : f));
  }, [showRooms]);

  // Tap-first price brackets — sale money is a different order of magnitude
  // than rent, so the presets follow the active purpose tab.
  const priceBrackets: { min: string; max: string }[] =
    activePurposeTab === "sale"
      ? [
          { min: "", max: "100000" },
          { min: "100000", max: "250000" },
          { min: "250000", max: "500000" },
          { min: "500000", max: "" },
        ]
      : [
          { min: "", max: "300" },
          { min: "300", max: "500" },
          { min: "500", max: "1000" },
          { min: "1000", max: "" },
        ];
  // Must not be `toLocaleString()` with no locale: Node picks the server's
  // default locale and the browser picks the visitor's, so an ar-KW visitor
  // got Arabic-Indic digits client-side against Latin digits in the HTML and
  // React threw a hydration mismatch. `formatAmount` pins en-US, matching how
  // prices are rendered everywhere else on the site.
  const formatBracketValue = (value: string) => formatAmount(value);
  const bracketLabel = (bracket: { min: string; max: string }) =>
    bracket.min && bracket.max
      ? `${formatBracketValue(bracket.min)} – ${formatBracketValue(bracket.max)}`
      : bracket.max
        ? t("filters.priceUpTo", { value: formatBracketValue(bracket.max) })
        : t("filters.priceAtLeast", { value: formatBracketValue(bracket.min) });

  // Selected-filter chips.
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
      onRemove: () => setFilters((f) => ({ ...f, types: f.types.filter((k) => k !== typeKey) })),
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

  const priceOptions: PickerOption[] = priceBrackets.map((bracket) => ({
    value: `${bracket.min}${BRACKET_SEPARATOR}${bracket.max}`,
    label: bracketLabel(bracket),
  }));

  // One entry per sheet. `label` is what the closed pill reads — the chosen
  // value where there is one, the filter's name where there is not — so the bar
  // doubles as a summary of what is currently applied. Rooms is absent entirely
  // when the selected types have none.
  const areaName = filters.area
    ? (areas.find((a) => a.slug === filters.area)?.name ?? filters.area)
    : null;
  const typeNames = filters.types
    .map((key) => types.find((pt) => pt.key === key)?.name ?? key)
    .join("، ");
  const triggers: {
    key: FilterKey;
    title: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
  }[] = [
    {
      key: "area",
      title: t("filters.area"),
      label: areaName ?? t("filters.area"),
      icon: <PinIcon width={15} height={15} />,
      active: Boolean(filters.area),
    },
    {
      key: "types",
      title: t("filters.propertyType"),
      label: typeNames || t("filters.propertyType"),
      icon: <HomeIcon width={15} height={15} />,
      active: filters.types.length > 0,
    },
    {
      key: "purposes",
      title: t("filters.purpose"),
      label:
        filters.purposes.length === 1
          ? t(`purpose.${filters.purposes[0]}`)
          : t("filters.purpose"),
      icon: <SwapIcon width={15} height={15} />,
      active: filters.purposes.length > 0,
    },
    {
      key: "price",
      title: t("filters.price"),
      label: t("filters.price"),
      icon: <TagIcon width={15} height={15} />,
      active: Boolean(filters.priceMin || filters.priceMax),
    },
    ...(showRooms
      ? [
          {
            key: "rooms" as const,
            title: t("filters.allRooms"),
            label: filters.rooms
              ? t("filters.roomsAtLeast", { count: Number(filters.rooms) })
              : t("filters.allRooms"),
            icon: <BedIcon width={15} height={15} />,
            active: Boolean(filters.rooms),
          },
        ]
      : []),
    {
      key: "sqm",
      title: t("filters.sqmMin"),
      label: filters.sqm
        ? t("filters.sqmAtLeast", { value: filters.sqm })
        : t("filters.sqmMin"),
      icon: <ExpandIcon width={15} height={15} />,
      active: Boolean(filters.sqm),
    },
    {
      key: "statuses",
      title: t("filters.status"),
      label: t("filters.status"),
      icon: <CheckIcon width={15} height={15} />,
      active: filters.statuses.length > 0 || filters.premiumOnly,
    },
  ];
  const activeTrigger = triggers.find((trigger) => trigger.key === openFilter);

  return (
    <div>
      {/* Page banner */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="gold-glow absolute -top-32 start-1/2 h-72 w-[36rem] -translate-x-1/2 rtl:translate-x-1/2" aria-hidden />
        <header className="relative mx-auto max-w-(--container-site) px-4 pb-20 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-16">
          <p className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-gold-light">
            <span className="h-px w-8 bg-gold" aria-hidden />
            {t("listing.eyebrow")}
            <span className="h-px w-8 bg-gold" aria-hidden />
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">
            {t("listing.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">{t("listing.subtitle")}</p>
        </header>
      </section>

      <div className="mx-auto max-w-(--container-site) px-4 pb-14 sm:px-6">
      {/* Filter bar — collapsed. Each control raises its own sheet from the
          bottom of the screen, one at a time, over results that keep updating
          live behind it. The old design stacked every fieldset open at once,
          which put the first listing two screens below the filters. */}
      <section className="relative z-10 -mt-8 rounded-3xl bg-white p-4 shadow-float ring-1 ring-cream-200 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-extrabold text-navy">{t("filters.title")}</p>
          {chips.length > 0 ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-bold text-navy ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
            >
              {t("filters.clearAll")}
              <ResetIcon width={15} height={15} className="text-gold" />
            </button>
          ) : null}
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {triggers.map((trigger) => (
            <button
              key={trigger.key}
              type="button"
              onClick={() => setOpenFilter(trigger.key)}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors",
                trigger.active
                  ? "border-gold bg-gold-100 text-navy"
                  : "border-cream-200 bg-white text-navy hover:border-gold/60 hover:bg-cream-50",
              )}
            >
              <span className="text-gold">{trigger.icon}</span>
              {trigger.label}
              <ChevronDownIcon width={14} height={14} className="text-gold" />
            </button>
          ))}
        </div>
      </section>

      <BottomSheet
        open={openFilter !== null}
        title={activeTrigger?.title ?? t("filters.title")}
        subtitle={t("listing.count", { count: items.length })}
        onClose={() => setOpenFilter(null)}
      >
        {openFilter === "area" ? (
          <OptionGrid
            options={areas.map((area) => ({ value: area.slug, label: area.name }))}
            value={filters.area ? [filters.area] : []}
            onChange={(next) => setFilters((f) => ({ ...f, area: next[0] ?? "" }))}
            searchable
            searchLabel={t("picker.searchPlaceholder", { field: t("filters.area") })}
            allLabel={t("home.allAreas")}
            allHint={t("picker.areaCount", { count: areas.length })}
            emptyLabel={t("filters.noAreas")}
            onPicked={() => setOpenFilter(null)}
          />
        ) : null}

        {openFilter === "types" ? (
          <OptionGrid
            options={types.map((type) => ({ value: type.key, label: type.name }))}
            value={filters.types}
            onChange={(next) => setFilters((f) => ({ ...f, types: next }))}
            multiple
            allLabel={t("home.allTypes")}
            emptyLabel={t("filters.noTypes")}
          />
        ) : null}

        {openFilter === "purposes" ? (
          <OptionGrid
            options={(["rent", "sale"] as const).map((purpose) => ({
              value: purpose,
              label: t(`purpose.${purpose}`),
            }))}
            value={filters.purposes}
            onChange={(next) => setFilters((f) => ({ ...f, purposes: next }))}
            multiple
            allLabel={t("filters.everyone")}
          />
        ) : null}

        {openFilter === "price" ? (
          <div>
            <OptionGrid
              options={priceOptions}
              value={
                filters.priceMin || filters.priceMax
                  ? [`${filters.priceMin}${BRACKET_SEPARATOR}${filters.priceMax}`]
                  : []
              }
              onChange={(next) => {
                const [min = "", max = ""] = (next[0] ?? "").split(BRACKET_SEPARATOR);
                setFilters((f) => ({ ...f, priceMin: min, priceMax: max }));
              }}
              allLabel={t("filters.any")}
            />
            {/* The brackets cover the common asks; the pair below is the escape
                hatch for anything between them. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={t("filters.priceFrom")}
                value={filters.priceMin}
                onChange={(event) => setFilters((f) => ({ ...f, priceMin: event.target.value }))}
                className="rounded-xl border border-cream-200 bg-white px-4 py-3 font-semibold text-navy outline-none transition-colors focus:border-gold"
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={t("filters.priceTo")}
                value={filters.priceMax}
                onChange={(event) => setFilters((f) => ({ ...f, priceMax: event.target.value }))}
                className="rounded-xl border border-cream-200 bg-white px-4 py-3 font-semibold text-navy outline-none transition-colors focus:border-gold"
              />
            </div>
          </div>
        ) : null}

        {openFilter === "rooms" ? (
          <OptionGrid
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: t("filters.roomsAtLeast", { count: n }),
            }))}
            value={filters.rooms ? [filters.rooms] : []}
            onChange={(next) => setFilters((f) => ({ ...f, rooms: next[0] ?? "" }))}
            allLabel={t("filters.any")}
            onPicked={() => setOpenFilter(null)}
          />
        ) : null}

        {openFilter === "sqm" ? (
          <OptionGrid
            options={[100, 200, 400, 600, 1000].map((n) => ({
              value: String(n),
              label: t("filters.sqmAtLeast", { value: n }),
            }))}
            value={filters.sqm ? [filters.sqm] : []}
            onChange={(next) => setFilters((f) => ({ ...f, sqm: next[0] ?? "" }))}
            allLabel={t("filters.any")}
            onPicked={() => setOpenFilter(null)}
          />
        ) : null}

        {openFilter === "statuses" ? (
          <div>
            <OptionGrid
              options={STATUS_OPTIONS.map((status) => ({
                value: status,
                label: t(`status.${status}`),
              }))}
              value={filters.statuses}
              onChange={(next) => setFilters((f) => ({ ...f, statuses: next }))}
              multiple
              allLabel={t("filters.any")}
            />
            <label className="mt-3 flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl border border-cream-200 bg-white px-3.5 py-3 text-sm font-bold text-navy">
              {t("filters.premiumOnly")}
              <input
                type="checkbox"
                checked={filters.premiumOnly}
                onChange={(event) =>
                  setFilters((f) => ({ ...f, premiumOnly: event.target.checked }))
                }
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  filters.premiumOnly
                    ? "border-gold bg-gold text-white"
                    : "border-cream-300 bg-cream-50 text-transparent",
                )}
              >
                <CheckIcon width={12} height={12} strokeWidth={3} />
              </span>
            </label>
          </div>
        ) : null}
      </BottomSheet>

      {/* Selected filters */}
      {chips.length > 0 ? (
        <section className="mt-5 rounded-3xl bg-white p-5 shadow-card ring-1 ring-cream-200">
          <p className="mb-3 text-base font-bold text-navy">{t("filters.selected")}</p>
          <div className="flex flex-wrap gap-2.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-cream px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-100"
              >
                <CloseIcon width={14} height={14} className="text-gold-dark" />
                {chip.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold text-navy ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
          >
            {t("filters.clearAll")}
            <ResetIcon width={16} height={16} className="text-gold" />
          </button>
        </section>
      ) : null}

      {/* Purpose quick tabs */}
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {(
          [
            { key: "rent", label: t("purpose.rent") },
            { key: "sale", label: t("purpose.sale") },
            { key: "all", label: t("filters.everyone") },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                purposes: tab.key === "all" ? [] : [tab.key],
              }))
            }
            className={cn(
              "rounded-2xl px-4 py-3 text-sm font-bold shadow-sm ring-1 transition-colors sm:text-base",
              activePurposeTab === tab.key
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-cream-200 hover:bg-cream-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View toggle + count */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-card ring-1 ring-cream-200">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
              view === "grid" ? "bg-navy text-white shadow-card" : "text-muted hover:text-navy",
            )}
          >
            <HomeIcon width={16} height={16} />
            {t("listing.viewGrid")}
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
              view === "map" ? "bg-navy text-white shadow-card" : "text-muted hover:text-navy",
            )}
          >
            <MapIcon width={16} height={16} />
            {t("listing.viewMap")}
          </button>
        </div>
        {view === "grid" ? (
          <p className="text-end">
            <span className="block text-sm font-semibold text-muted">{t("listing.results")}</span>
            <span className="font-display text-2xl font-extrabold text-navy">
              {t("listing.count", { count: items.length })}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">{t("listing.mapNote")}</p>
        )}
      </div>

      {/* Results */}
      {view === "map" ? (
        <div className="mt-8">
          <MapTabs>
            <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cream-200">
              <MapExplorer locale={locale} />
            </div>
          </MapTabs>
        </div>
      ) : isLoading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-2xl bg-white shadow-card ring-1 ring-cream-200"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-8 rounded-3xl border border-dashed border-cream-300 bg-white/70 p-14 text-center">
          <p className="text-lg font-bold text-navy">{t("listing.errorTitle")}</p>
          <p className="mt-2 text-muted">{t("listing.errorBody")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-cream-300 bg-white/70 p-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 text-gold">
            <SearchIcon width={24} height={24} />
          </span>
          <p className="mt-4 text-lg font-bold text-navy">{t("listing.emptyTitle")}</p>
          <p className="mt-2 text-muted">{t("listing.emptyBody")}</p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-700"
          >
            {t("filters.clearAll")}
            <ResetIcon width={16} height={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((property) => (
              <PropertyCard key={property.id} property={property} locale={locale} />
            ))}
          </div>
          {hasNextPage ? (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3.5 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700 disabled:opacity-60"
              >
                {isFetchingNextPage ? t("listing.loadingMore") : t("listing.loadMore")}
              </button>
            </div>
          ) : null}
        </>
      )}
      </div>
    </div>
  );
}
