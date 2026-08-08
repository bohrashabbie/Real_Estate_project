"""The storefront's unauthenticated read/submit surface, mounted at /public/v1.

Same idea as GRC's /shop/v1 router: no bearer token, locale-aware output,
and only ever published + active data.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.public import PublicInquiryIn, PublicPropertyRequestIn, SmartSearchIn
from app.services import banner_service, inquiry_service, public_service

router = APIRouter(tags=["public"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/settings")
def settings(db: Session = Depends(get_db)) -> dict:
    return public_service.public_settings(db)


@router.get("/areas")
def areas(locale: str = "ar", db: Session = Depends(get_db)) -> list[dict]:
    return public_service.list_areas(db, public_service.normalize_locale(locale))


@router.get("/property-types")
def property_types(locale: str = "ar", db: Session = Depends(get_db)) -> list[dict]:
    return public_service.list_property_types(db, public_service.normalize_locale(locale))


@router.get("/amenities")
def amenities(locale: str = "ar", db: Session = Depends(get_db)) -> list[dict]:
    return public_service.list_amenities(db, public_service.normalize_locale(locale))


@router.get("/banners")
def banners(locale: str = "ar", db: Session = Depends(get_db)) -> list[dict]:
    """Home-page hero slides: active, inside their scheduling window, in order."""
    return banner_service.public_banners(db, public_service.normalize_locale(locale))


@router.get("/properties")
def properties(
    purpose: str | None = Query(None, pattern="^(rent|sale)$"),
    type: str | None = None,  # property_type key
    area: str | None = None,  # area slug
    price_min: Decimal | None = Query(None, ge=0),
    price_max: Decimal | None = Query(None, ge=0),
    rooms: int | None = Query(None, ge=0),  # meaning >=
    status_: str | None = Query(None, alias="status", pattern="^(available|rented|sold|reserved)$"),
    premium_only: bool = False,
    q: str | None = None,
    cursor: str | None = None,
    limit: int = Query(24, ge=1, le=100),
    locale: str = "ar",
    db: Session = Depends(get_db),
) -> dict:
    return public_service.property_list(
        db,
        public_service.normalize_locale(locale),
        purpose=purpose,
        type_key=type,
        area_slug=area,
        price_min=price_min,
        price_max=price_max,
        rooms=rooms,
        status=status_,
        premium_only=premium_only,
        q=q,
        cursor=cursor,
        limit=limit,
    )


@router.get("/properties/featured")
def featured_properties(locale: str = "ar", db: Session = Depends(get_db)) -> dict:
    return public_service.featured_properties(db, public_service.normalize_locale(locale))


@router.get("/properties/{slug}")
def property_detail(slug: str, locale: str = "ar", db: Session = Depends(get_db)) -> dict:
    return public_service.property_detail(db, slug, public_service.normalize_locale(locale))


@router.post("/inquiries", status_code=status.HTTP_201_CREATED)
def create_inquiry(
    payload: PublicInquiryIn, request: Request, db: Session = Depends(get_db)
) -> dict:
    inquiry = inquiry_service.create_inquiry(db, payload, _client_ip(request))
    return {"id": inquiry.id, "status": inquiry.status, "created_at": inquiry.created_at}


@router.post("/property-requests", status_code=status.HTTP_201_CREATED)
def create_property_request(
    payload: PublicPropertyRequestIn, request: Request, db: Session = Depends(get_db)
) -> dict:
    req = inquiry_service.create_property_request(db, payload, _client_ip(request))
    return {"id": req.id, "status": req.status, "created_at": req.created_at}


@router.post("/smart-search")
def smart_search(payload: SmartSearchIn, locale: str = "ar", db: Session = Depends(get_db)) -> dict:
    return public_service.smart_search(db, payload, public_service.normalize_locale(locale))
