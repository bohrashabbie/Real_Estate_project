import {
  Building2,
  ClipboardList,
  FileClock,
  GalleryHorizontal,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/permissions"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  labelKey: string
  icon: LucideIcon
  /** Nav items are filtered by permission key, never by role name. */
  permission: string | null
}

export type NavSection = {
  labelKey: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "sectionOverview",
    items: [
      {
        href: "/dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
        permission: null,
      },
    ],
  },
  {
    labelKey: "sectionListings",
    items: [
      {
        href: "/properties",
        labelKey: "properties",
        icon: Building2,
        permission: PERMISSIONS.propertiesView,
      },
      {
        href: "/banners",
        labelKey: "banners",
        icon: GalleryHorizontal,
        permission: PERMISSIONS.bannersView,
      },
    ],
  },
  {
    labelKey: "sectionCustomers",
    items: [
      {
        href: "/inquiries",
        labelKey: "inquiries",
        icon: MessageSquare,
        permission: PERMISSIONS.inquiriesView,
      },
      {
        href: "/requests",
        labelKey: "requests",
        icon: ClipboardList,
        permission: PERMISSIONS.requestsView,
      },
    ],
  },
  {
    labelKey: "sectionTaxonomy",
    items: [
      {
        href: "/areas",
        labelKey: "areas",
        icon: MapPin,
        permission: PERMISSIONS.taxonomyView,
      },
      {
        href: "/property-types",
        labelKey: "propertyTypes",
        icon: LayoutGrid,
        permission: PERMISSIONS.taxonomyView,
      },
      {
        href: "/amenities",
        labelKey: "amenities",
        icon: Sparkles,
        permission: PERMISSIONS.taxonomyView,
      },
    ],
  },
  {
    labelKey: "sectionAdministration",
    items: [
      {
        href: "/users",
        labelKey: "users",
        icon: Users,
        permission: PERMISSIONS.usersView,
      },
      {
        href: "/roles",
        labelKey: "roles",
        icon: ShieldCheck,
        permission: PERMISSIONS.rolesView,
      },
      {
        href: "/settings",
        labelKey: "settings",
        icon: Settings,
        permission: PERMISSIONS.settingsView,
      },
      {
        href: "/audit",
        labelKey: "audit",
        icon: FileClock,
        permission: PERMISSIONS.auditView,
      },
    ],
  },
]
