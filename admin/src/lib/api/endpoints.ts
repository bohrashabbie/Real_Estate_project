import { api, apiUpload } from "./client"
import type {
  AmenityCreate,
  AmenityOut,
  AmenityUpdate,
  AreaCreate,
  AreaOut,
  AreaUpdate,
  AuditListParams,
  AuditLogOut,
  BannerCreate,
  BannerOut,
  BannerUpdate,
  CurrentUserOut,
  CursorPage,
  DashboardOut,
  InquiryListParams,
  InquiryOut,
  InquiryUpdate,
  MediaOut,
  PermissionOut,
  PropertyCreate,
  PropertyListParams,
  PropertyMediaItemOut,
  PropertyMediaUpdate,
  PropertyOut,
  PropertyRequestListParams,
  PropertyRequestOut,
  PropertyRequestUpdate,
  PropertyTypeCreate,
  PropertyTypeOut,
  PropertyTypeUpdate,
  PropertyUpdate,
  RoleCreate,
  RoleDetailOut,
  SettingOut,
  SettingsBulkUpdate,
  TaxonomyListParams,
  UserCreate,
  UserListParams,
  UserOut,
  UserRoleAssignIn,
  UserRoleAssignmentOut,
  UserUpdate,
} from "./types"

/**
 * One thin typed function per backend route. No caching, no react-query here —
 * hooks compose these. Paths are relative to NEXT_PUBLIC_API_BASE_URL (/api/v1).
 */

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const authApi = {
  /** Current user with roles + flattened permission keys. */
  me: () => api.get<CurrentUserOut>("/users/me"),
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export const usersApi = {
  list: (params: UserListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<UserOut>>("/users", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        is_active: params.is_active ?? undefined,
      },
      signal,
    }),

  get: (userId: number, signal?: AbortSignal) =>
    api.get<UserOut>(`/users/${userId}`, { signal }),

  create: (payload: UserCreate) => api.post<UserOut>("/users", payload),

  update: (userId: number, payload: UserUpdate) =>
    api.patch<UserOut>(`/users/${userId}`, payload),

  /** Soft-deactivate. The backend never hard-deletes a user. */
  deactivate: (userId: number) => api.del(`/users/${userId}`),

  listRoles: (userId: number, signal?: AbortSignal) =>
    api.get<UserRoleAssignmentOut[]>(`/users/${userId}/roles`, { signal }),

  assignRole: (userId: number, payload: UserRoleAssignIn) =>
    api.post<UserRoleAssignmentOut>(`/users/${userId}/roles`, payload),

  revokeRole: (userId: number, userRoleId: number) =>
    api.del(`/users/${userId}/roles/${userRoleId}`),
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

export const rolesApi = {
  /** Returns full detail including permission_keys — no per-role fetch needed. */
  list: (signal?: AbortSignal) => api.get<RoleDetailOut[]>("/roles", { signal }),

  get: (roleId: number, signal?: AbortSignal) =>
    api.get<RoleDetailOut>(`/roles/${roleId}`, { signal }),

  /** The full catalog of permission keys, grouped. */
  permissions: (signal?: AbortSignal) =>
    api.get<PermissionOut[]>("/roles/permissions", { signal }),

  /** Replaces the role's permission set wholesale. */
  setPermissions: (roleId: number, permissionKeys: string[]) =>
    api.patch<RoleDetailOut>(`/roles/${roleId}/permissions`, {
      permission_keys: permissionKeys,
    }),

  create: (payload: RoleCreate) => api.post<RoleDetailOut>("/roles", payload),
}

/* -------------------------------------------------------------------------- */
/* Taxonomy — areas, property types, amenities                                 */
/* -------------------------------------------------------------------------- */

function taxonomyQuery(params: TaxonomyListParams) {
  return {
    cursor: params.cursor ?? undefined,
    limit: params.limit,
    is_active: params.is_active ?? undefined,
  }
}

export const areasApi = {
  list: (params: TaxonomyListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<AreaOut>>("/areas", {
      query: taxonomyQuery(params),
      signal,
    }),
  create: (payload: AreaCreate) => api.post<AreaOut>("/areas", payload),
  update: (areaId: number, payload: AreaUpdate) =>
    api.patch<AreaOut>(`/areas/${areaId}`, payload),
  /** Soft-delete: sets is_active=false, never removes the row. */
  deactivate: (areaId: number) => api.del(`/areas/${areaId}`),
}

export const propertyTypesApi = {
  list: (params: TaxonomyListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<PropertyTypeOut>>("/property-types", {
      query: taxonomyQuery(params),
      signal,
    }),
  create: (payload: PropertyTypeCreate) =>
    api.post<PropertyTypeOut>("/property-types", payload),
  update: (typeId: number, payload: PropertyTypeUpdate) =>
    api.patch<PropertyTypeOut>(`/property-types/${typeId}`, payload),
  deactivate: (typeId: number) => api.del(`/property-types/${typeId}`),
}

export const amenitiesApi = {
  list: (params: TaxonomyListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<AmenityOut>>("/amenities", {
      query: taxonomyQuery(params),
      signal,
    }),
  create: (payload: AmenityCreate) => api.post<AmenityOut>("/amenities", payload),
  update: (amenityId: number, payload: AmenityUpdate) =>
    api.patch<AmenityOut>(`/amenities/${amenityId}`, payload),
  deactivate: (amenityId: number) => api.del(`/amenities/${amenityId}`),
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                  */
/* -------------------------------------------------------------------------- */

export const propertiesApi = {
  list: (params: PropertyListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<PropertyOut>>("/properties", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        q: params.q ?? undefined,
        purpose: params.purpose ?? undefined,
        status: params.status ?? undefined,
        type_id: params.type_id ?? undefined,
        area_id: params.area_id ?? undefined,
        is_featured: params.is_featured ?? undefined,
        is_premium: params.is_premium ?? undefined,
        published: params.published ?? undefined,
      },
      signal,
    }),

  get: (propertyId: number, signal?: AbortSignal) =>
    api.get<PropertyOut>(`/properties/${propertyId}`, { signal }),

  create: (payload: PropertyCreate) =>
    api.post<PropertyOut>("/properties", payload),

  update: (propertyId: number, payload: PropertyUpdate) =>
    api.patch<PropertyOut>(`/properties/${propertyId}`, payload),

  /** Soft-delete: archives the listing (is_active=false). */
  delete: (propertyId: number) => api.del(`/properties/${propertyId}`),

  publish: (propertyId: number) =>
    api.post<PropertyOut>(`/properties/${propertyId}/publish`),

  unpublish: (propertyId: number) =>
    api.post<PropertyOut>(`/properties/${propertyId}/unpublish`),

  /** Multipart upload → media row + property_media link in one call. */
  uploadMedia: (propertyId: number, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiUpload<PropertyMediaItemOut>(
      `/properties/${propertyId}/media`,
      formData
    )
  },

  /** Reorder or set the main image. */
  updateMedia: (
    propertyId: number,
    propertyMediaId: number,
    payload: PropertyMediaUpdate
  ) =>
    api.patch<PropertyMediaItemOut>(
      `/properties/${propertyId}/media/${propertyMediaId}`,
      payload
    ),

  deleteMedia: (propertyId: number, propertyMediaId: number) =>
    api.del(`/properties/${propertyId}/media/${propertyMediaId}`),
}

/* -------------------------------------------------------------------------- */
/* Media (generic upload, GRC-style storage.py → ./uploads)                    */
/* -------------------------------------------------------------------------- */

export const mediaApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiUpload<MediaOut>("/media/upload", formData)
  },
}

/* -------------------------------------------------------------------------- */
/* Inquiries                                                                   */
/* -------------------------------------------------------------------------- */

export const inquiriesApi = {
  list: (params: InquiryListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<InquiryOut>>("/inquiries", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        status: params.status ?? undefined,
        source: params.source ?? undefined,
      },
      signal,
    }),

  updateStatus: (inquiryId: number, payload: InquiryUpdate) =>
    api.patch<InquiryOut>(`/inquiries/${inquiryId}`, payload),
}

/* -------------------------------------------------------------------------- */
/* Property requests                                                           */
/* -------------------------------------------------------------------------- */

export const propertyRequestsApi = {
  list: (params: PropertyRequestListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<PropertyRequestOut>>("/property-requests", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        status: params.status ?? undefined,
      },
      signal,
    }),

  updateStatus: (requestId: number, payload: PropertyRequestUpdate) =>
    api.patch<PropertyRequestOut>(`/property-requests/${requestId}`, payload),
}

/* -------------------------------------------------------------------------- */
/* Settings & audit                                                            */
/* -------------------------------------------------------------------------- */

export const settingsApi = {
  list: (signal?: AbortSignal) => api.get<SettingOut[]>("/settings", { signal }),

  /** PUT bulk — owner only per SPEC.md. */
  updateBulk: (payload: SettingsBulkUpdate) =>
    api.put<SettingOut[]>("/settings", payload),
}

export const auditApi = {
  list: (params: AuditListParams = {}, signal?: AbortSignal) =>
    api.get<CursorPage<AuditLogOut>>("/audit", {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit,
        entity_type: params.entity_type ?? undefined,
        actor_user_id: params.actor_user_id ?? undefined,
        action: params.action ?? undefined,
        date_from: params.date_from ?? undefined,
        date_to: params.date_to ?? undefined,
      },
      signal,
    }),
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export const analyticsApi = {
  dashboard: (signal?: AbortSignal) =>
    api.get<DashboardOut>("/analytics/dashboard", { signal }),
}

/* -------------------------------------------------------------------------- */
/* Banners — home-page hero slides                                             */
/* -------------------------------------------------------------------------- */

export const bannersApi = {
  list: (params: { include_inactive?: boolean } = {}, signal?: AbortSignal) =>
    api.get<BannerOut[]>("/banners", {
      query: { include_inactive: params.include_inactive ?? true },
      signal,
    }),

  create: (payload: BannerCreate) => api.post<BannerOut>("/banners", payload),

  update: (bannerId: number, payload: BannerUpdate) =>
    api.patch<BannerOut>(`/banners/${bannerId}`, payload),

  /** Soft-delete: hides the slide, keeps the row and its audit trail. */
  deactivate: (bannerId: number) => api.del(`/banners/${bannerId}`),

  /** Artwork upload. Separate from /media/upload so running marketing doesn't
   *  require property-editing permissions. */
  upload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiUpload<MediaOut>("/banners/upload", formData)
  },

  /** Whole new order in one request — moving slides one at a time would leave
   *  the list briefly inconsistent for anyone else looking at it. */
  reorder: (items: { id: number; sort_order: number }[]) =>
    api.post<BannerOut[]>("/banners/reorder", { items }),
}
