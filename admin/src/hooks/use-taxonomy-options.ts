"use client"

import { useQuery } from "@tanstack/react-query"

import { amenitiesApi, areasApi, propertyTypesApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { AmenityOut, AreaOut, PropertyTypeOut } from "@/lib/api/types"

/**
 * Option lists for selects and id→name mapping.
 *
 * The taxonomy endpoints answer a bare array, not a `{items, next_cursor}`
 * page — they are small reference tables the API returns whole, ordered by
 * sort_order. Reading `.items` here silently produced empty dropdowns.
 */

export function useAreaOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.areas.list({ include_inactive: !activeOnly }),
    queryFn: ({ signal }) =>
      areasApi.list({ include_inactive: !activeOnly }, signal),
  })
  return { areas: (query.data ?? []) as AreaOut[], query }
}

export function usePropertyTypeOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.propertyTypes.list({ include_inactive: !activeOnly }),
    queryFn: ({ signal }) =>
      propertyTypesApi.list({ include_inactive: !activeOnly }, signal),
  })
  return { propertyTypes: (query.data ?? []) as PropertyTypeOut[], query }
}

export function useAmenityOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.amenities.list({ include_inactive: !activeOnly }),
    queryFn: ({ signal }) =>
      amenitiesApi.list({ include_inactive: !activeOnly }, signal),
  })
  return { amenities: (query.data ?? []) as AmenityOut[], query }
}
