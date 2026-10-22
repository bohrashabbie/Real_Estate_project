from __future__ import annotations

from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field


class SettingUpdate(BaseModel):
    value: dict | list | str | int | float | bool | None
    group: str | None = None
    is_public: bool | None = None


class SettingItem(BaseModel):
    key: str
    value: dict | list | str | int | float | bool | None


class SettingsBulkUpdate(BaseModel):
    """PUT /settings — {"items": [{key, value}, ...]} upserted in one shot
    (owner only). Shape fixed by the admin frontend contract."""

    items: list[SettingItem]


class SettingOut(BaseModel):
    key: str
    value: dict | list | str | int | float | bool | None
    group: str
    is_public: bool
    updated_by_user_id: int | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaOut(BaseModel):
    id: int
    storage_key: str
    url: str | None = None
    original_filename: str | None
    mime_type: str
    width_px: int | None
    height_px: int | None
    bytes: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None
    actor_type: str
    action: str
    entity_type: str
    entity_id: int | None
    before_json: dict | None
    after_json: dict | None
    ip: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SiteTextItem(BaseModel):
    # The string's path in the storefront's language files, e.g. "hero.title".
    key: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$")
    locale: Literal["ar", "en"]
    # Empty puts the default back.
    value: str = Field(max_length=3000)


class SiteTextsBulkUpdate(BaseModel):
    """PUT /site-texts — the Website Content page saves a section at a time."""

    items: list[SiteTextItem] = Field(max_length=1000)
