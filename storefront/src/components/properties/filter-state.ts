import type { PropertyStatus } from "@/lib/api";

/**
 * Listing filter state and its URL encoding.
 *
 * Lifted out of `listing-view.tsx` when the filters moved into their own rail:
 * the view owns the query and the results, the rail owns the controls, and both
 * need this shape. The URL stays the shareable source of truth either way.
 */
export interface Filters {
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

export const EMPTY_FILTERS: Filters = {
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

export const STATUS_OPTIONS: PropertyStatus[] = ["available", "reserved", "sold"];

export function fromSearchParams(params: URLSearchParams): Filters {
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

export function toQueryString(filters: Filters): string {
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

/** How many distinct choices the visitor has made — drives the "Filters (3)"
 *  badge on the mobile trigger and whether "clear" is offered at all. */
export function countActive(filters: Filters): number {
  return (
    (filters.area ? 1 : 0) +
    filters.types.length +
    filters.purposes.length +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0) +
    (filters.rooms ? 1 : 0) +
    (filters.sqm ? 1 : 0) +
    filters.statuses.length +
    (filters.premiumOnly ? 1 : 0) +
    (filters.featuredOnly ? 1 : 0)
  );
}
