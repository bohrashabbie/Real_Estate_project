"use client"

import { TaxonomyPage } from "@/components/taxonomy/taxonomy-page"
import { amenitiesApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { TaxonomyAdapter } from "@/components/taxonomy/taxonomy-page"

const adapter: TaxonomyAdapter = {
  list: (params, signal) => amenitiesApi.list(params, signal),
  create: (payload) =>
    amenitiesApi.create({
      key: payload.code ?? "",
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  // `key` is intentionally absent: it is immutable once created (properties
  // reference it), and the backend's update schema drops it.
  update: (id, payload) =>
    amenitiesApi.update(id, {
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  deactivate: (id) => amenitiesApi.deactivate(id),
}

export default function AmenitiesPage() {
  return (
    <TaxonomyPage
      namespace="amenities"
      codeField="key"
      adapter={adapter}
      queryKeyAll={queryKeys.amenities.all}
      listKey={(params) => queryKeys.amenities.list(params)}
    />
  )
}
