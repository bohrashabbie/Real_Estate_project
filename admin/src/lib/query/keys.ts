import type {
  AuditListParams,
  InquiryListParams,
  PropertyListParams,
  PropertyRequestListParams,
  UserListParams,
} from "@/lib/api/types"

/**
 * One registry for every query key, so invalidation after a mutation can't
 * silently miss a cache entry because two files spelled a key differently.
 */
export const queryKeys = {
  currentUser: ["current-user"] as const,

  users: {
    all: ["users"] as const,
    list: (params: Pick<UserListParams, "is_active">) =>
      ["users", "list", params] as const,
    detail: (userId: number) => ["users", "detail", userId] as const,
    roles: (userId: number) => ["users", "roles", userId] as const,
  },

  roles: {
    all: ["roles"] as const,
    list: () => ["roles", "list"] as const,
    detail: (roleId: number) => ["roles", "detail", roleId] as const,
    permissions: () => ["roles", "permissions"] as const,
  },

  areas: {
    all: ["areas"] as const,
    list: (params: { is_active?: boolean | null } = {}) =>
      ["areas", "list", params] as const,
  },

  propertyTypes: {
    all: ["property-types"] as const,
    list: (params: { is_active?: boolean | null } = {}) =>
      ["property-types", "list", params] as const,
  },

  amenities: {
    all: ["amenities"] as const,
    list: (params: { is_active?: boolean | null } = {}) =>
      ["amenities", "list", params] as const,
  },

  properties: {
    all: ["properties"] as const,
    list: (params: Omit<PropertyListParams, "cursor" | "limit">) =>
      ["properties", "list", params] as const,
    detail: (propertyId: number) =>
      ["properties", "detail", propertyId] as const,
  },

  inquiries: {
    all: ["inquiries"] as const,
    list: (params: Omit<InquiryListParams, "cursor" | "limit">) =>
      ["inquiries", "list", params] as const,
  },

  propertyRequests: {
    all: ["property-requests"] as const,
    list: (params: Omit<PropertyRequestListParams, "cursor" | "limit">) =>
      ["property-requests", "list", params] as const,
  },

  settings: {
    all: ["settings"] as const,
    list: () => ["settings", "list"] as const,
  },

  audit: {
    all: ["audit"] as const,
    list: (params: Omit<AuditListParams, "cursor" | "limit">) =>
      ["audit", "list", params] as const,
  },

  analytics: {
    all: ["analytics"] as const,
    dashboard: () => ["analytics", "dashboard"] as const,
  },
} as const
