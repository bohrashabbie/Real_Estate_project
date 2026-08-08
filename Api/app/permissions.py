"""Every permission key the admin panel understands, and the 4 default roles.

Routers must reference permission keys defined here via require("some.key") —
never invent a key inline. deps.require() validates against this list at
import time so a typo fails fast instead of silently granting nothing.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PermissionDef:
    key: str
    group: str
    description: str
    is_dangerous: bool = False


PERMISSIONS: list[PermissionDef] = [
    # properties
    PermissionDef("properties.view", "properties", "View property listings"),
    PermissionDef("properties.create", "properties", "Create property listings"),
    PermissionDef("properties.edit", "properties", "Edit property listings and their media"),
    PermissionDef("properties.delete", "properties", "Soft-delete property listings", is_dangerous=True),
    PermissionDef("properties.publish", "properties", "Publish or unpublish property listings"),
    # inquiries & property requests
    PermissionDef("inquiries.view", "inquiries", "View inquiries"),
    PermissionDef("inquiries.manage", "inquiries", "Update inquiry status"),
    PermissionDef("requests.view", "inquiries", "View property requests"),
    PermissionDef("requests.manage", "inquiries", "Update property request status"),
    # taxonomy — areas, property types, amenities
    PermissionDef("taxonomy.view", "taxonomy", "View areas, property types and amenities"),
    PermissionDef("taxonomy.manage", "taxonomy", "Create/edit areas, property types and amenities"),
    # banners — home-page hero slides
    PermissionDef("banners.view", "banners", "View home-page banners"),
    PermissionDef("banners.manage", "banners", "Upload, edit, reorder and hide home-page banners"),
    # system
    PermissionDef("users.view", "system", "View staff accounts"),
    PermissionDef("users.manage", "system", "Create/edit staff accounts and assign roles", is_dangerous=True),
    PermissionDef("roles.view", "system", "View roles and their permissions"),
    PermissionDef("roles.manage", "system", "Create roles and change what they grant", is_dangerous=True),
    PermissionDef("settings.view", "system", "View site settings"),
    PermissionDef("settings.manage", "system", "Change site settings", is_dangerous=True),
    PermissionDef("audit.view", "system", "View the audit log"),
    # analytics
    PermissionDef("analytics.view", "analytics", "View the dashboard analytics"),
]

DEFAULT_ROLES: list[dict] = [
    {
        "code": "owner",
        "name_ar": "المالك",
        "name_en": "Owner",
        "description": "Full access to everything. Cannot be deleted.",
        "is_system": True,
    },
    {
        "code": "manager",
        "name_ar": "مدير المكتب",
        "name_en": "Manager",
        "description": "Runs the office day to day: full property, inquiry and taxonomy access.",
        "is_system": True,
    },
    {
        "code": "agent",
        "name_ar": "وسيط عقاري",
        "name_en": "Agent",
        "description": "Creates and edits listings, handles inquiries and property requests.",
        "is_system": False,
    },
    {
        "code": "viewer",
        "name_ar": "مشاهد",
        "name_en": "Viewer",
        "description": "Read-only access across the admin.",
        "is_system": False,
    },
]

_ALL_KEYS = [p.key for p in PERMISSIONS]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": _ALL_KEYS,
    # Manager runs operations but does not touch staff accounts, roles, or the
    # owner-only settings.
    "manager": [
        k
        for k in _ALL_KEYS
        if k not in {"users.manage", "roles.manage", "settings.manage"}
    ],
    "agent": [
        "properties.view",
        "properties.create",
        "properties.edit",
        "properties.publish",
        "inquiries.view",
        "inquiries.manage",
        "requests.view",
        "requests.manage",
        "taxonomy.view",
        # Agents see what the home page is promoting but don't change it —
        # banners are the office's marketing surface, a manager decision.
        "banners.view",
        "analytics.view",
    ],
    "viewer": [
        "properties.view",
        "inquiries.view",
        "requests.view",
        "taxonomy.view",
        "banners.view",
        "settings.view",
        "analytics.view",
    ],
}


def all_permission_keys() -> set[str]:
    return set(_ALL_KEYS)
