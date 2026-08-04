/**
 * Mirror of Api/app/permissions.py (see SPEC.md). Nav and UI gating reference
 * these constants so a typo becomes a TypeScript error instead of a silently
 * hidden button.
 *
 * This list is cosmetic only — the backend's require() dependency is the actual
 * security boundary. Hiding a button here prevents confusion, not access.
 */
export const PERMISSIONS = {
  // properties
  propertiesView: "properties.view",
  propertiesCreate: "properties.create",
  propertiesEdit: "properties.edit",
  propertiesDelete: "properties.delete",
  propertiesPublish: "properties.publish",

  // inquiries & property requests
  inquiriesView: "inquiries.view",
  inquiriesManage: "inquiries.manage",
  requestsView: "requests.view",
  requestsManage: "requests.manage",

  // taxonomy (areas / property types / amenities)
  taxonomyView: "taxonomy.view",
  taxonomyManage: "taxonomy.manage",

  // administration
  usersView: "users.view",
  usersManage: "users.manage",
  rolesView: "roles.view",
  rolesManage: "roles.manage",
  settingsView: "settings.view",
  settingsManage: "settings.manage",
  auditView: "audit.view",
  analyticsView: "analytics.view",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Display order for the permission matrix; matches the backend's groups. */
export const PERMISSION_GROUP_ORDER = [
  "properties",
  "inquiries",
  "requests",
  "taxonomy",
  "users",
  "roles",
  "settings",
  "audit",
  "analytics",
] as const

export function sortPermissionGroups(groups: string[]): string[] {
  const order = PERMISSION_GROUP_ORDER as readonly string[]
  return [...groups].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    // Unknown groups (added backend-side later) sort last, alphabetically.
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
