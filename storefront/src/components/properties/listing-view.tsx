"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { PropertyCard } from "@/components/property/property-card";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PinIcon,
  ResetIcon,
  SearchIcon,
} from "@/components/ui/icons";

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
  const [panelOpen, setPanelOpen] = useState(true);

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

  return (
    <div className="mx-auto max-w-(--container-site) px-4 py-10 sm:px-6">
      <header className="text-center">
        <p className="text-sm font-bold tracking-wide text-gold">{t("listing.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{t("listing.title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("listing.subtitle")}</p>
      </header>

      {/* Filter panel */}
      <section className="mt-8 rounded-3xl bg-white shadow-card ring-1 ring-cream-200">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 p-5 text-start"
          aria-expanded={panelOpen}
        >
          <span className="text-lg font-bold text-navy">{t("filters.title")}</span>
          <ChevronDownIcon
            width={20}
            height={20}
            className={cn("text-gold transition-transform", panelOpen ? "rotate-180" : undefined)}
          />
        </button>

        {panelOpen ? (
          <div className="flex flex-col gap-6 border-t border-cream-200 p-5">
            {/* Areas */}
            <fieldset>
              <legend className="mb-3 text-base font-bold text-navy">{t("filters.area")}</legend>
              <div className="grid max-h-72 grid-cols-2 gap-2.5 overflow-y-auto pe-1 sm:grid-cols-3 lg:grid-cols-4">
                {areas.map((area) => {
                  const selected = filters.area === area.slug;
                  return (
                    <button
                      key={area.slug}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, area: selected ? "" : area.slug }))
                      }
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-sm font-semibold transition-colors",
                        selected
                          ? "border-gold bg-gold-100 text-navy"
                          : "border-cream-200 bg-cream/60 text-navy hover:border-gold/60",
                      )}
                    >
                      <PinIcon width={18} height={18} className="text-gold" />
                      {area.name}
                    </button>
                  );
                })}
                {areas.length === 0 ? (
                  <p className="col-span-full text-sm text-muted">{t("filters.noAreas")}</p>
                ) : null}
              </div>
            </fieldset>

            {/* Purpose */}
            <fieldset className="border-t border-cream-200 pt-5">
              <legend className="float-start mb-3 text-base font-bold text-navy">
                {t("filters.purpose")}
              </legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5 clear-both pt-1">
                {(["rent", "sale"] as const).map((purpose) => (
                  <FilterCheckbox
                    key={purpose}
                    label={t(`purpose.${purpose}`)}
                    checked={filters.purposes.includes(purpose)}
                    onChange={(checked) =>
                      setFilters((f) => ({
                        ...f,
                        purposes: checked
                          ? [...f.purposes, purpose]
                          : f.purposes.filter((p) => p !== purpose),
                      }))
                    }
                  />
                ))}
              </div>
            </fieldset>

            {/* Property type */}
            <fieldset className="border-t border-cream-200 pt-5">
              <legend className="float-start mb-3 text-base font-bold text-navy">
                {t("filters.propertyType")}
              </legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5 clear-both pt-1">
                {types.map((type) => (
                  <FilterCheckbox
                    key={type.key}
                    label={type.name}
                    checked={filters.types.includes(type.key)}
                    onChange={(checked) =>
                      setFilters((f) => ({
                        ...f,
                        types: checked
                          ? [...f.types, type.key]
                          : f.types.filter((k) => k !== type.key),
                      }))
                    }
                  />
                ))}
                {types.length === 0 ? (
                  <p className="text-sm text-muted">{t("filters.noTypes")}</p>
                ) : null}
              </div>
            </fieldset>

            {/* Price */}
            <fieldset className="border-t border-cream-200 pt-5">
              <legend className="float-start mb-3 text-base font-bold text-navy">
                {t("filters.price")}
              </legend>
              <div className="grid grid-cols-2 gap-3 clear-both pt-1">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t("filters.priceFrom")}
                  value={filters.priceMin}
                  onChange={(event) =>
                    setFilters((f) => ({ ...f, priceMin: event.target.value }))
                  }
                  className="rounded-2xl border border-cream-200 bg-white px-4 py-3 text-navy outline-none transition-colors focus:border-gold"
                />
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t("filters.priceTo")}
                  value={filters.priceMax}
                  onChange={(event) =>
                    setFilters((f) => ({ ...f, priceMax: event.target.value }))
                  }
                  className="rounded-2xl border border-cream-200 bg-white px-4 py-3 text-navy outline-none transition-colors focus:border-gold"
                />
              </div>
            </fieldset>

            {/* Rooms & space */}
            <fieldset className="border-t border-cream-200 pt-5">
              <legend className="float-start mb-3 text-base font-bold text-navy">
                {t("filters.roomsAndSpace")}
              </legend>
              <div className="grid grid-cols-2 gap-3 clear-both pt-1">
                <select
                  value={filters.rooms}
                  onChange={(event) => setFilters((f) => ({ ...f, rooms: event.target.value }))}
                  className="appearance-none rounded-2xl border border-cream-200 bg-white px-4 py-3 text-navy outline-none transition-colors focus:border-gold"
                >
                  <option value="">{t("filters.allRooms")}</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {t("filters.roomsAtLeast", { count: n })}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t("filters.sqmMin")}
                  value={filters.sqm}
                  onChange={(event) => setFilters((f) => ({ ...f, sqm: event.target.value }))}
                  className="rounded-2xl border border-cream-200 bg-white px-4 py-3 text-navy outline-none transition-colors focus:border-gold"
                />
              </div>
            </fieldset>

            {/* Status + premium */}
            <fieldset className="border-t border-cream-200 pt-5">
              <legend className="float-start mb-3 text-base font-bold text-navy">
                {t("filters.status")}
              </legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5 clear-both pt-1">
                {STATUS_OPTIONS.map((status) => (
                  <FilterCheckbox
                    key={status}
                    label={t(`status.${status}`)}
                    checked={filters.statuses.includes(status)}
                    onChange={(checked) =>
                      setFilters((f) => ({
                        ...f,
                        statuses: checked
                          ? [...f.statuses, status]
                          : f.statuses.filter((s) => s !== status),
                      }))
                    }
                  />
                ))}
                <FilterCheckbox
                  label={t("filters.premiumOnly")}
                  checked={filters.premiumOnly}
                  onChange={(checked) => setFilters((f) => ({ ...f, premiumOnly: checked }))}
                />
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-cream-200 bg-white px-6 py-3.5 text-base font-bold text-navy shadow-sm transition-colors hover:bg-cream-100"
            >
              {t("filters.clear")}
              <ResetIcon width={18} height={18} className="text-gold" />
            </button>
          </div>
        ) : null}
      </section>

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

      {/* Count + share note */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("listing.shareNote")}</p>
        <p className="text-end">
          <span className="block text-sm font-semibold text-muted">{t("listing.results")}</span>
          <span className="text-2xl font-bold text-navy">
            {t("listing.count", { count: items.length })}
          </span>
        </p>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-semibold text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-5.5 w-5.5 items-center justify-center rounded-md border transition-colors",
          checked ? "border-gold bg-gold text-white" : "border-cream-300 bg-white text-transparent",
        )}
      >
        <CheckIcon width={14} height={14} strokeWidth={3} />
      </span>
      {label}
    </label>
  );
}
