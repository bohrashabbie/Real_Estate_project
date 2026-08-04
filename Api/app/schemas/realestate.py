from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Purpose = Literal["rent", "sale"]
PropertyStatusValue = Literal["available", "rented", "sold", "reserved"]
InquirySourceValue = Literal["property", "contact", "home"]
InquiryStatusValue = Literal["new", "contacted", "closed"]
RequestStatusValue = Literal["new", "in_progress", "matched", "closed"]

Locale = Literal["ar", "en"]


# --------------------------------------------------------------------------
# Taxonomy: areas, property types, amenities
# --------------------------------------------------------------------------

class AreaCreate(BaseModel):
    slug: str | None = None  # derived from the English name when omitted
    sort_order: int = 0
    is_active: bool = True
    translations: dict[Locale, str]  # {"ar": "السالمية", "en": "Salmiya"}


class AreaUpdate(BaseModel):
    slug: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: dict[Locale, str] | None = None


class PropertyTypeCreate(BaseModel):
    key: str = Field(min_length=2, max_length=32, pattern=r"^[a-z][a-z0-9_]*$")
    slug: str | None = None
    sort_order: int = 0
    is_active: bool = True
    translations: dict[Locale, str]


class PropertyTypeUpdate(BaseModel):
    slug: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: dict[Locale, str] | None = None


class AmenityCreate(BaseModel):
    key: str = Field(min_length=2, max_length=32, pattern=r"^[a-z][a-z0-9_]*$")
    sort_order: int = 0
    is_active: bool = True
    translations: dict[Locale, str]


class AmenityUpdate(BaseModel):
    sort_order: int | None = None
    is_active: bool | None = None
    translations: dict[Locale, str] | None = None


# --------------------------------------------------------------------------
# Properties
# --------------------------------------------------------------------------

class PropertyTranslationIn(BaseModel):
    locale: Locale
    title: str = Field(min_length=1)
    slug: str | None = None  # derived from title when omitted
    description: str | None = None


class PropertyCreate(BaseModel):
    purpose: Purpose
    status: PropertyStatusValue = "available"
    property_type_id: int
    area_id: int
    block: str | None = Field(None, max_length=20)
    address_note: str | None = None
    price: Decimal = Field(gt=0)
    rooms: int | None = Field(None, ge=0)
    bathrooms: int | None = Field(None, ge=0)
    floors: int | None = Field(None, ge=0)
    area_sqm: Decimal | None = Field(None, gt=0)
    latitude: Decimal | None = Field(None, ge=-90, le=90)
    longitude: Decimal | None = Field(None, ge=-180, le=180)
    is_featured: bool = False
    is_premium: bool = False
    translations: list[PropertyTranslationIn] = Field(min_length=1)
    amenity_ids: list[int] = []


class PropertyUpdate(BaseModel):
    purpose: Purpose | None = None
    status: PropertyStatusValue | None = None
    property_type_id: int | None = None
    area_id: int | None = None
    block: str | None = Field(None, max_length=20)
    address_note: str | None = None
    price: Decimal | None = Field(None, gt=0)
    rooms: int | None = Field(None, ge=0)
    bathrooms: int | None = Field(None, ge=0)
    floors: int | None = Field(None, ge=0)
    area_sqm: Decimal | None = Field(None, gt=0)
    latitude: Decimal | None = Field(None, ge=-90, le=90)
    longitude: Decimal | None = Field(None, ge=-180, le=180)
    is_featured: bool | None = None
    is_premium: bool | None = None
    translations: list[PropertyTranslationIn] | None = None
    amenity_ids: list[int] | None = None


class PropertyMediaPatch(BaseModel):
    sort_order: int | None = None
    is_main: bool | None = None


# --------------------------------------------------------------------------
# Inquiries & property requests (admin side)
# --------------------------------------------------------------------------

class InquiryStatusUpdate(BaseModel):
    status: InquiryStatusValue


class PropertyRequestStatusUpdate(BaseModel):
    status: RequestStatusValue


class InquiryOut(BaseModel):
    id: int
    property_id: int | None
    property_ref_no: str | None = None
    name: str
    phone: str
    message: str
    source: InquirySourceValue
    status: InquiryStatusValue
    created_at: datetime

    model_config = {"from_attributes": True}


class PropertyRequestOut(BaseModel):
    id: int
    name: str
    phone: str
    purpose: Purpose | None
    property_type_id: int | None
    area_id: int | None
    budget_min: Decimal | None
    budget_max: Decimal | None
    rooms: int | None
    notes: str | None
    status: RequestStatusValue
    created_at: datetime

    model_config = {"from_attributes": True}
