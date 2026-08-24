/**
 * Hand-written mirrors of the backend's Pydantic schemas (see SPEC.md).
 * Field names stay byte-identical to the API — no camelCase renaming — so a
 * response can be handed straight to a component.
 *
 * Money is NUMERIC(12,3) KWD and travels as a string, never a float.
 * Timestamps are ISO 8601 UTC strings, formatted only at display time.
 */

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

/** Every list endpoint is cursor-paginated on (created_at, id). Never offset. */
export type CursorPage<T> = {
  items: T[]
  next_cursor: string | null
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string | null
  refresh_token: string | null
  token_type: string
  /** No MFA in this project (CLAUDE.md rule 9); kept so a backend that ever
   * flips this fails loudly instead of silently. */
  mfa_required: boolean
  challenge_token: string | null
}

export type RefreshResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export type UserOut = {
  id: number
  email: string
  full_name: string
  phone_e164: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type UserCreate = {
  email: string
  password: string
  full_name: string
  phone_e164?: string | null
}

export type UserUpdate = {
  full_name?: string | null
  phone_e164?: string | null
  is_active?: boolean | null
}

export type UserListParams = {
  cursor?: string | null
  limit?: number
  is_active?: boolean | null
}

/** GET /users/me — the single source of truth for permission-driven UI. */
export type CurrentUserOut = {
  id: number
  email: string
  full_name: string
  is_active: boolean
  roles: RoleOut[]
  /** Flattened permission keys across every assigned role. */
  permissions: string[]
}

/* -------------------------------------------------------------------------- */
/* Roles & permissions                                                         */
/* -------------------------------------------------------------------------- */

export type RoleOut = {
  id: number
  code: string
  name_ar: string
  name_en: string
}

export type RoleDetailOut = {
  id: number
  code: string
  name_ar: string
  name_en: string
  description: string | null
  is_system: boolean
  permission_keys: string[]
}

export type PermissionOut = {
  id: number
  key: string
  /** properties | inquiries | requests | taxonomy | users | roles | … */
  group: string
  description: string | null
  is_dangerous: boolean
}

export type RoleCreate = {
  /** lowercase, starts with a letter, snake_case — enforced by the backend. */
  code: string
  name_ar: string
  name_en: string
  description?: string | null
  permission_keys?: string[]
}

export type UserRoleAssignmentOut = {
  id: number
  user_id: number
  role_id: number
  role_code: string
  granted_by_user_id: number | null
  granted_at: string
  expires_at: string | null
}

export type UserRoleAssignIn = {
  role_id: number
  expires_at?: string | null
}

/* -------------------------------------------------------------------------- */
/* Translations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Translations are rows keyed by locale — never JSON blobs, never name_ar /
 * name_en columns (CLAUDE.md rule 3). Slugs are unique per locale.
 *
 * Taxonomy names are the one place the wire format differs from the storage
 * format: the CRUD endpoints project those rows as a single object keyed by
 * locale, `{"ar": "السالمية", "en": "Salmiya"}`, and accept the same shape
 * back. Properties still send and receive an array of translation rows.
 */
export type NameTranslations = Partial<Record<string, string>>

export type PropertyTranslationIn = {
  locale: string
  title: string
  slug?: string | null
  description?: string | null
}

export type PropertyTranslationOut = {
  locale: string
  title: string
  slug: string
  description: string | null
}

/* -------------------------------------------------------------------------- */
/* Taxonomy — areas, property types, amenities                                 */
/* -------------------------------------------------------------------------- */

export type AreaOut = {
  id: number
  slug: string
  sort_order: number
  is_active: boolean
  translations: NameTranslations
}

export type AreaCreate = {
  slug?: string | null
  sort_order?: number
  is_active?: boolean
  translations: NameTranslations
}

export type AreaUpdate = {
  slug?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  translations?: NameTranslations | null
}

export type PropertyTypeOut = {
  id: number
  key: string
  slug: string
  sort_order: number
  is_active: boolean
  translations: NameTranslations
}

export type PropertyTypeCreate = {
  key: string
  slug?: string | null
  sort_order?: number
  is_active?: boolean
  translations: NameTranslations
}

export type PropertyTypeUpdate = {
  key?: string | null
  slug?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  translations?: NameTranslations | null
}

export type AmenityOut = {
  id: number
  key: string
  sort_order: number
  is_active: boolean
  translations: NameTranslations
}

export type AmenityCreate = {
  key: string
  sort_order?: number
  is_active?: boolean
  translations: NameTranslations
}

export type AmenityUpdate = {
  key?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  translations?: NameTranslations | null
}

/** Taxonomies are small reference tables: the API returns every row ordered
 *  by sort_order, with no cursor. `include_inactive` is the only filter it
 *  understands — active/inactive narrowing happens client-side. */
export type TaxonomyListParams = {
  include_inactive?: boolean
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

export type MediaOut = {
  id: number
  storage_key: string
  original_filename: string | null
  mime_type: string
  width_px: number | null
  height_px: number | null
  bytes: number | null
  created_at: string
}

/** One row of a property's gallery with the underlying file inlined. */
export type PropertyMediaItemOut = {
  id: number
  property_id: number
  media_id: number
  sort_order: number
  is_main: boolean
  media: MediaOut
}

export type PropertyMediaUpdate = {
  sort_order?: number | null
  is_main?: boolean | null
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                  */
/* -------------------------------------------------------------------------- */

export type PropertyPurpose = "rent" | "sale"
export type PropertyStatus = "available" | "rented" | "sold" | "reserved"

export type PropertyOut = {
  id: number
  ref_no: string
  purpose: PropertyPurpose
  status: PropertyStatus
  property_type_id: number
  area_id: number
  block: string | null
  address_note: string | null
  /** NUMERIC(12,3) KWD string — monthly rent for `rent`, total for `sale`. */
  price: string
  rooms: number | null
  bathrooms: number | null
  floors: number | null
  area_sqm: string | null
  latitude: string | null
  longitude: string | null
  is_featured: boolean
  is_vip: boolean
  is_premium: boolean
  is_active: boolean
  /** Null = draft. */
  published_at: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  translations: PropertyTranslationOut[]
  amenity_ids: number[]
  media: PropertyMediaItemOut[]
  /** Storage key of the main gallery image, for the list thumbnail. */
  main_image_key: string | null
}

export type PropertyCreate = {
  purpose: PropertyPurpose
  status?: PropertyStatus
  property_type_id: number
  area_id: number
  block?: string | null
  address_note?: string | null
  price: string
  rooms?: number | null
  bathrooms?: number | null
  floors?: number | null
  area_sqm?: string | null
  latitude?: string | null
  longitude?: string | null
  is_featured?: boolean
  is_vip?: boolean
  is_premium?: boolean
  translations: PropertyTranslationIn[]
  amenity_ids?: number[]
}

export type PropertyUpdate = {
  purpose?: PropertyPurpose | null
  status?: PropertyStatus | null
  property_type_id?: number | null
  area_id?: number | null
  block?: string | null
  address_note?: string | null
  price?: string | null
  rooms?: number | null
  bathrooms?: number | null
  floors?: number | null
  area_sqm?: string | null
  latitude?: string | null
  longitude?: string | null
  is_featured?: boolean | null
  is_vip?: boolean | null
  is_premium?: boolean | null
  is_active?: boolean | null
  translations?: PropertyTranslationIn[] | null
  amenity_ids?: number[] | null
}

export type PropertyListParams = {
  cursor?: string | null
  limit?: number
  q?: string | null
  purpose?: PropertyPurpose | null
  status?: PropertyStatus | null
  type_id?: number | null
  area_id?: number | null
  is_featured?: boolean | null
  is_vip?: boolean | null
  is_premium?: boolean | null
  published?: boolean | null
}

/* -------------------------------------------------------------------------- */
/* Inquiries                                                                   */
/* -------------------------------------------------------------------------- */

export type InquirySource = "property" | "contact" | "home"
export type InquiryStatus = "new" | "contacted" | "closed"

export type InquiryOut = {
  id: number
  property_id: number | null
  /** Ref no of the linked property when property_id is set, for display. */
  property_ref_no?: string | null
  name: string
  phone: string
  message: string
  source: InquirySource
  status: InquiryStatus
  created_at: string
}

export type InquiryUpdate = {
  status: InquiryStatus
}

export type InquiryListParams = {
  cursor?: string | null
  limit?: number
  status?: InquiryStatus | null
  source?: InquirySource | null
}

/* -------------------------------------------------------------------------- */
/* Property requests ("Request your property")                                 */
/* -------------------------------------------------------------------------- */

export type PropertyRequestStatus = "new" | "in_progress" | "matched" | "closed"

export type PropertyRequestOut = {
  id: number
  name: string
  phone: string
  purpose: PropertyPurpose | null
  property_type_id: number | null
  area_id: number | null
  budget_min: string | null
  budget_max: string | null
  rooms: number | null
  notes: string | null
  status: PropertyRequestStatus
  created_at: string
}

export type PropertyRequestUpdate = {
  status: PropertyRequestStatus
}

export type PropertyRequestListParams = {
  cursor?: string | null
  limit?: number
  status?: PropertyRequestStatus | null
}

/* -------------------------------------------------------------------------- */
/* Settings & audit                                                            */
/* -------------------------------------------------------------------------- */

export type SettingValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]

export type SettingOut = {
  key: string
  value: SettingValue
  updated_by_user_id?: number | null
  updated_at?: string | null
}

/** PUT /settings — bulk upsert (owner only). */
export type SettingsBulkUpdate = {
  items: { key: string; value: SettingValue }[]
}

/** Only the changed fields land in before_json/after_json — never a full-row
 * snapshot — so the diff view shows exactly what moved. */
export type AuditLogOut = {
  id: number
  actor_user_id: number | null
  actor_type: string
  action: string
  entity_type: string
  entity_id: number | null
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export type AuditListParams = {
  cursor?: string | null
  limit?: number
  entity_type?: string | null
  actor_user_id?: number | null
  action?: string | null
  date_from?: string | null
  date_to?: string | null
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export type PurposeCount = {
  purpose: PropertyPurpose
  count: number
}

/** GET /analytics/dashboard — the one analytics endpoint in this project. */
export type DashboardOut = {
  properties_total: number
  properties_published: number
  properties_available: number
  by_purpose: PurposeCount[]
  new_inquiries_7d: number
  new_requests_7d: number
  recent_inquiries: InquiryOut[]
}

/* -------------------------------------------------------------------------- */
/* Banners — home-page hero slides                                             */
/* -------------------------------------------------------------------------- */

export type BannerTranslationIn = {
  locale: string
  alt_text: string
  /** Locale-specific artwork; null uses the banner's own image. */
  media_id?: number | null
}

export type BannerTranslationOut = {
  locale: string
  alt_text: string
  media_id: number | null
  /** Resolved `/uploads/...` path, null when this locale has no override. */
  image_url: string | null
}

export type BannerOut = {
  id: number
  media_id: number
  image_url: string | null
  href: string | null
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  /** Active *and* inside its scheduling window — what the storefront shows. */
  is_live: boolean
  translations: BannerTranslationOut[]
  created_at: string
  updated_at: string
}

export type BannerCreate = {
  media_id: number
  href?: string | null
  sort_order?: number
  is_active?: boolean
  starts_at?: string | null
  ends_at?: string | null
  translations: BannerTranslationIn[]
}

export type BannerUpdate = {
  media_id?: number | null
  href?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  starts_at?: string | null
  ends_at?: string | null
  translations?: BannerTranslationIn[] | null
}
