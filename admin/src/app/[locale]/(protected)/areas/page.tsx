"use client"

import { TaxonomyPage } from "@/components/taxonomy/taxonomy-page"
import { areasApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { TaxonomyAdapter } from "@/components/taxonomy/taxonomy-page"

const adapter: TaxonomyAdapter = {
  list: (params, signal) => areasApi.list(params, signal),
  create: (payload) =>
    areasApi.create({
      slug: payload.code,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  update: (id, payload) =>
    areasApi.update(id, {
      slug: payload.code,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      translations: payload.translations,
    }),
  deactivate: (id) => areasApi.deactivate(id),
}

export default function AreasPage() {
  return (
    <TaxonomyPage
      namespace="areas"
      codeField="slug"
      adapter={adapter}
      queryKeyAll={queryKeys.areas.all}
      listKey={(params) => queryKeys.areas.list(params)}
    />
  )
}
