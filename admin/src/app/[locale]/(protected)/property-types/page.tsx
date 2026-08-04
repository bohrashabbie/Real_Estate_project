"use client"

import { TaxonomyPage } from "@/components/taxonomy/taxonomy-page"
import { propertyTypesApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { TaxonomyAdapter } from "@/components/taxonomy/taxonomy-page"

const adapter: TaxonomyAdapter = {
  list: (params, signal) => propertyTypesApi.list(params, signal),
  create: (payload) =>
    propertyTypesApi.create({
      key: payload.code ?? "",
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  update: (id, payload) =>
    propertyTypesApi.update(id, {
      key: payload.code,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  deactivate: (id) => propertyTypesApi.deactivate(id),
}

export default function PropertyTypesPage() {
  return (
    <TaxonomyPage
      namespace="propertyTypes"
      codeField="key"
      adapter={adapter}
      queryKeyAll={queryKeys.propertyTypes.all}
      listKey={(params) => queryKeys.propertyTypes.list(params)}
    />
  )
}
