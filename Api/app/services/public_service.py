"""Read side of the storefront (/public/v1).

Public endpoints only ever expose published + active properties, and only
active taxonomy rows. `locale` picks the translation with fallback to the
other locale so a half-translated listing still renders.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import NotFoundError
from app.models.realestate import (
    Amenity,
    Area,
    Property,
    PropertyAmenity,
    PropertyMedia,
    PropertyTranslation,
    PropertyType,
)
from app.models.system import Media, Setting
from app.storage import storage
from app.utils import paginate

PUBLIC_SETTING_KEYS = {
    "site.phone": "phone",
    "site.whatsapp": "whatsapp",
    "site.email": "email",
    "site.instagram": "instagram",
    "site.x": "x",
    "site.snapchat": "snapchat",
    "site.name_ar": "name_ar",
    "site.name_en": "name_en",
    # Page copy the office can edit without a deploy. Each is a plain
    # site.<field>_<locale> pair rather than a translations table — these are
    # singleton strings (one hero, one footer), not rows keyed by an entity,
    # so the *_translations pattern the rest of the schema uses would only
    # add a join for no benefit. A blank value means "not set"; every reader
    # falls back to the storefront's own next-intl copy for that string.
    "site.footer_blurb_ar": "footer_blurb_ar",
    "site.footer_blurb_en": "footer_blurb_en",
    "site.footer_tagline_ar": "footer_tagline_ar",
    "site.footer_tagline_en": "footer_tagline_en",
    "site.hero_title_ar": "hero_title_ar",
    "site.hero_title_en": "hero_title_en",
    "site.hero_subtitle_ar": "hero_subtitle_ar",
    "site.hero_subtitle_en": "hero_subtitle_en",
    "site.hero_cta_ar": "hero_cta_ar",
    "site.hero_cta_en": "hero_cta_en",
    "site.vip_kicker_ar": "vip_kicker_ar",
    "site.vip_kicker_en": "vip_kicker_en",
    "site.vip_title_ar": "vip_title_ar",
    "site.vip_title_en": "vip_title_en",
    "site.vip_cta_ar": "vip_cta_ar",
    "site.vip_cta_en": "vip_cta_en",
    "site.featured_kicker_ar": "featured_kicker_ar",
    "site.featured_kicker_en": "featured_kicker_en",
    "site.featured_title_ar": "featured_title_ar",
    "site.featured_title_en": "featured_title_en",
    "site.featured_cta_ar": "featured_cta_ar",
    "site.featured_cta_en": "featured_cta_en",
    "site.all_kicker_ar": "all_kicker_ar",
    "site.all_kicker_en": "all_kicker_en",
    "site.all_title_ar": "all_title_ar",
    "site.all_title_en": "all_title_en",
    "site.all_body_ar": "all_body_ar",
    "site.all_body_en": "all_body_en",
    "site.all_cta_ar": "all_cta_ar",
    "site.all_cta_en": "all_cta_en",
    "site.types_kicker_ar": "types_kicker_ar",
    "site.types_kicker_en": "types_kicker_en",
    "site.types_title_ar": "types_title_ar",
    "site.types_title_en": "types_title_en",
    "site.types_body_ar": "types_body_ar",
    "site.types_body_en": "types_body_en",
}


def normalize_locale(locale: str | None) -> str:
    return "en" if (locale or "").lower().startswith("en") else "ar"


def _translated(rows, locale: str, field: str = "name", fallback: str = "") -> str:
    rows = list(rows)
    for wanted in (locale, "ar", "en"):
        row = next((item for item in rows if item.locale == wanted), None)
        if row is not None and getattr(row, field, None):
            return str(getattr(row, field))
    return fallback


def _translation_row(rows, locale: str):
    rows = list(rows)
    return next((row for row in rows if row.locale == locale), None) or next(iter(rows), None)


def _money(value) -> str | None:
    return f"{Decimal(value):.3f}" if value is not None else None


# ---------------------------------------------------------------------------
# Settings & taxonomy
# ---------------------------------------------------------------------------

def public_settings(db: Session) -> dict:
    rows = db.execute(select(Setting).where(Setting.key.in_(PUBLIC_SETTING_KEYS))).scalars().all()
    out = {alias: None for alias in PUBLIC_SETTING_KEYS.values()}
    for row in rows:
        out[PUBLIC_SETTING_KEYS[row.key]] = row.value
    return out


def list_areas(db: Session, locale: str) -> list[dict]:
    rows = db.execute(
        select(Area)
        .options(selectinload(Area.translations))
        .where(Area.is_active.is_(True))
        .order_by(Area.sort_order, Area.id)
    ).scalars().all()
    return [{"id": a.id, "slug": a.slug, "name": _translated(a.translations, locale)} for a in rows]


def list_property_types(db: Session, locale: str) -> list[dict]:
    rows = db.execute(
        select(PropertyType)
        .options(selectinload(PropertyType.translations))
        .where(PropertyType.is_active.is_(True))
        .order_by(PropertyType.sort_order, PropertyType.id)
    ).scalars().all()
    return [
        {"id": t.id, "key": t.key, "slug": t.slug, "name": _translated(t.translations, locale)}
        for t in rows
    ]


def list_amenities(db: Session, locale: str) -> list[dict]:
    rows = db.execute(
        select(Amenity)
        .options(selectinload(Amenity.translations))
        .where(Amenity.is_active.is_(True))
        .order_by(Amenity.sort_order, Amenity.id)
    ).scalars().all()
    return [{"id": a.id, "key": a.key, "name": _translated(a.translations, locale)} for a in rows]


# ---------------------------------------------------------------------------
# Property list shapes
# ---------------------------------------------------------------------------

def _base_stmt() -> Select:
    return (
        select(Property)
        .options(
            selectinload(Property.translations),
            selectinload(Property.media_links),
        )
        .where(Property.is_active.is_(True), Property.published_at.isnot(None))
    )


def _lookup_maps(db: Session, props: list[Property]) -> tuple[dict, dict]:
    area_ids = {p.area_id for p in props}
    type_ids = {p.property_type_id for p in props}
    areas = {
        a.id: a
        for a in db.execute(
            select(Area).options(selectinload(Area.translations)).where(Area.id.in_(area_ids or {0}))
        ).scalars()
    }
    types = {
        t.id: t
        for t in db.execute(
            select(PropertyType)
            .options(selectinload(PropertyType.translations))
            .where(PropertyType.id.in_(type_ids or {0}))
        ).scalars()
    }
    return areas, types


def _media_urls(db: Session, props: list[Property]) -> dict[int, str]:
    media_ids = {link.media_id for p in props for link in p.media_links}
    if not media_ids:
        return {}
    rows = db.execute(select(Media.id, Media.storage_key).where(Media.id.in_(media_ids))).all()
    return {media_id: storage.url_for(key) for media_id, key in rows}


def _main_image(prop: Property, urls: dict[int, str]) -> str | None:
    links = sorted(prop.media_links, key=lambda l: (not l.is_main, l.sort_order, l.id))
    for link in links:
        if link.media_id in urls:
            return urls[link.media_id]
    return None


def _item(prop: Property, locale: str, areas: dict, types: dict, urls: dict[int, str]) -> dict:
    tr = _translation_row(prop.translations, locale)
    area = areas.get(prop.area_id)
    ptype = types.get(prop.property_type_id)
    return {
        "id": prop.id,
        "ref_no": prop.ref_no,
        "slug": tr.slug if tr else None,
        "title": tr.title if tr else None,
        "purpose": prop.purpose,
        "status": prop.status,
        "price": _money(prop.price),
        "currency": "KWD",
        "type": {
            "key": ptype.key if ptype else None,
            "name": _translated(ptype.translations, locale) if ptype else None,
        },
        "area": {
            "slug": area.slug if area else None,
            "name": _translated(area.translations, locale) if area else None,
        },
        "block": prop.block,
        "rooms": prop.rooms,
        "bathrooms": prop.bathrooms,
        "floors": prop.floors,
        "area_sqm": str(prop.area_sqm) if prop.area_sqm is not None else None,
        "is_premium": prop.is_premium,
        "is_featured": prop.is_featured,
        "is_vip": prop.is_vip,
        "main_image": _main_image(prop, urls),
        "images_count": len(prop.media_links),
        "published_at": prop.published_at,
    }


def _items(db: Session, props: list[Property], locale: str) -> list[dict]:
    areas, types = _lookup_maps(db, props)
    urls = _media_urls(db, props)
    return [_item(p, locale, areas, types, urls) for p in props]


# ---------------------------------------------------------------------------
# Listing, featured, detail
# ---------------------------------------------------------------------------

def _apply_filters(
    stmt: Select,
    *,
    purpose: str | None = None,
    type_key: str | None = None,
    area_slug: str | None = None,
    price_min: Decimal | None = None,
    price_max: Decimal | None = None,
    rooms: int | None = None,
    status: str | None = None,
    premium_only: bool = False,
    vip_only: bool = False,
    q: str | None = None,
) -> Select:
    if purpose:
        stmt = stmt.where(Property.purpose == purpose)
    if type_key:
        stmt = stmt.where(
            Property.property_type_id.in_(select(PropertyType.id).where(PropertyType.key == type_key))
        )
    if area_slug:
        stmt = stmt.where(Property.area_id.in_(select(Area.id).where(Area.slug == area_slug)))
    if price_min is not None:
        stmt = stmt.where(Property.price >= price_min)
    if price_max is not None:
        stmt = stmt.where(Property.price <= price_max)
    if rooms is not None:
        stmt = stmt.where(Property.rooms >= rooms)
    if status:
        stmt = stmt.where(Property.status == status)
    if premium_only:
        stmt = stmt.where(Property.is_premium.is_(True))
    if vip_only:
        stmt = stmt.where(Property.is_vip.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Property.ref_no.ilike(like),
                Property.id.in_(
                    select(PropertyTranslation.property_id).where(PropertyTranslation.title.ilike(like))
                ),
            )
        )
    return stmt


def property_list(
    db: Session,
    locale: str,
    *,
    purpose: str | None = None,
    type_key: str | None = None,
    area_slug: str | None = None,
    price_min: Decimal | None = None,
    price_max: Decimal | None = None,
    rooms: int | None = None,
    status: str | None = None,
    premium_only: bool = False,
    vip_only: bool = False,
    q: str | None = None,
    cursor: str | None = None,
    limit: int = 24,
) -> dict:
    stmt = _apply_filters(
        _base_stmt(),
        purpose=purpose,
        type_key=type_key,
        area_slug=area_slug,
        price_min=price_min,
        price_max=price_max,
        rooms=rooms,
        status=status,
        premium_only=premium_only,
        vip_only=vip_only,
        q=q,
    )
    props, next_cursor = paginate(db, stmt, Property, cursor, limit)
    return {"items": _items(db, props, locale), "next_cursor": next_cursor}


def featured_properties(db: Session, locale: str, limit: int = 10) -> dict:
    props = list(
        db.execute(
            _base_stmt()
            .where(Property.is_featured.is_(True))
            .order_by(Property.created_at.desc(), Property.id.desc())
            .limit(limit)
        ).scalars().all()
    )
    return {"items": _items(db, props, locale)}


def vip_properties(db: Session, locale: str, limit: int = 12) -> dict:
    """The office's VIP row — same contract as `featured_properties`, own flag.

    Kept as its own query rather than a parameter on the featured one so the
    two rows can be ordered and capped independently later without either
    changing shape for the other. `_base_stmt()` already restricts to
    published + active, so nothing unpublished can reach the VIP row either.
    """
    props = list(
        db.execute(
            _base_stmt()
            .where(Property.is_vip.is_(True))
            .order_by(Property.created_at.desc(), Property.id.desc())
            .limit(limit)
        ).scalars().all()
    )
    return {"items": _items(db, props, locale)}


def property_detail(db: Session, slug: str, locale: str) -> dict:
    stmt = (
        _base_stmt()
        .options(selectinload(Property.amenity_links))
        .where(
            or_(
                Property.id.in_(
                    select(PropertyTranslation.property_id).where(PropertyTranslation.slug == slug)
                ),
                Property.ref_no == slug,  # also match ref_no per SPEC
            )
        )
    )
    prop = db.execute(stmt).scalars().first()
    if prop is None:
        raise NotFoundError("Property not found")

    items = _items(db, [prop], locale)
    item = items[0]
    tr = _translation_row(prop.translations, locale)

    amenity_ids = [link.amenity_id for link in prop.amenity_links]
    amenities = []
    if amenity_ids:
        rows = db.execute(
            select(Amenity)
            .options(selectinload(Amenity.translations))
            .where(Amenity.id.in_(amenity_ids), Amenity.is_active.is_(True))
            .order_by(Amenity.sort_order, Amenity.id)
        ).scalars().all()
        amenities = [{"key": a.key, "name": _translated(a.translations, locale)} for a in rows]

    urls = _media_urls(db, [prop])
    links = sorted(prop.media_links, key=lambda l: (not l.is_main, l.sort_order, l.id))
    images = [
        {
            "url": urls[link.media_id],
            "alt": item["title"],
            "is_main": link.is_main,
            "sort_order": link.sort_order,
        }
        for link in links
        if link.media_id in urls
    ]

    item.update(
        {
            "description": tr.description if tr else None,
            "amenities": amenities,
            "images": images,
            "latitude": str(prop.latitude) if prop.latitude is not None else None,
            "longitude": str(prop.longitude) if prop.longitude is not None else None,
            "created_at": prop.created_at,
        }
    )
    return item


# ---------------------------------------------------------------------------
# Smart search — progressive filter relaxation
# ---------------------------------------------------------------------------

SMART_SEARCH_LIMIT = 10
_MIN_RESULTS = 3


def smart_search(db: Session, data, locale: str) -> dict:
    """Top-10 matches for the 5-question wizard. If fewer than 3 listings match
    the full filter set, relax progressively — drop rooms, then stretch the
    budget by 20%, then drop the area — recording which filters were relaxed."""

    def run(*, rooms, budget_max, area_slug) -> list[Property]:
        stmt = _apply_filters(
            _base_stmt(),
            purpose=data.purpose,
            type_key=data.type,
            area_slug=area_slug,
            price_max=budget_max,
            rooms=rooms,
            status="available",
        )
        stmt = stmt.order_by(Property.created_at.desc(), Property.id.desc()).limit(SMART_SEARCH_LIMIT)
        return list(db.execute(stmt).scalars().all())

    rooms = data.rooms
    budget_max = data.budget_max
    area_slug = data.area
    relaxed: list[str] = []

    props = run(rooms=rooms, budget_max=budget_max, area_slug=area_slug)

    if len(props) < _MIN_RESULTS and rooms is not None:
        rooms = None
        relaxed.append("rooms")
        props = run(rooms=rooms, budget_max=budget_max, area_slug=area_slug)

    if len(props) < _MIN_RESULTS and budget_max is not None:
        budget_max = (Decimal(budget_max) * Decimal("1.2")).quantize(Decimal("0.001"))
        relaxed.append("budget_max")
        props = run(rooms=rooms, budget_max=budget_max, area_slug=area_slug)

    if len(props) < _MIN_RESULTS and area_slug is not None:
        area_slug = None
        relaxed.append("area")
        props = run(rooms=rooms, budget_max=budget_max, area_slug=area_slug)

    return {"items": _items(db, props, locale), "relaxed": relaxed}
