"use client"

import { useQuery } from "@tanstack/react-query"

import { amenitiesApi, areasApi, propertyTypesApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query/keys"
import type { AmenityOut, AreaOut, PropertyTypeOut } from "@/lib/api/types"

/**
 * Option lists for selects and id→name mapping. One big page (limit 200) is
 * plenty for Kuwait's areas / 8 property types / 16 amenities, and keeps the
 * dropdowns a single request instead of a paginated walk.
 */

export function useAreaOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.areas.list({ is_active: activeOnly ? true : null }),
    queryFn: ({ signal }) =>
      areasApi.list({ limit: 200, is_active: activeOnly ? true : null }, signal),
  })
  return { areas: (query.data?.items ?? []) as AreaOut[], query }
}

export function usePropertyTypeOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.propertyTypes.list({
      is_active: activeOnly ? true : null,
    }),
    queryFn: ({ signal }) =>
      propertyTypesApi.list(
        { limit: 200, is_active: activeOnly ? true : null },
        signal
      ),
  })
  return { propertyTypes: (query.data?.items ?? []) as PropertyTypeOut[], query }
}

export function useAmenityOptions(activeOnly = true) {
  const query = useQuery({
    queryKey: queryKeys.amenities.list({ is_active: activeOnly ? true : null }),
    queryFn: ({ signal }) =>
      amenitiesApi.list(
        { limit: 200, is_active: activeOnly ? true : null },
        signal
      ),
  })
  return { amenities: (query.data?.items ?? []) as AmenityOut[], query }
}
