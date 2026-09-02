from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.realestate import InquirySourceValue, Purpose


class PublicInquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=5, max_length=32)
    message: str = Field(min_length=1, max_length=4000)
    property_id: int | None = None
    source: InquirySourceValue = "contact"


class PublicPropertyRequestIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=5, max_length=32)
    purpose: Purpose | None = None
    property_type_id: int | None = None
    area_id: int | None = None
    budget_min: Decimal | None = Field(None, ge=0)
    budget_max: Decimal | None = Field(None, ge=0)
    rooms: int | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=4000)


class SmartSearchIn(BaseModel):
    """The "answer 5 quick questions" wizard payload. Everything optional —
    filters are relaxed progressively server-side."""

    purpose: Purpose | None = None
    type: str | None = None  # property_type key
    area: list[str] | None = None  # area slugs, matched on any
    budget_max: Decimal | None = Field(None, gt=0)
    rooms: int | None = Field(None, ge=0)
