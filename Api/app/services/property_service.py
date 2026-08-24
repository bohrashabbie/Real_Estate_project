"""Property listings — admin CRUD, media links, publish/unpublish.

ref_no is auto-generated as KW-YYYY-NNNN (NNNN resets each year); the unique
constraint on properties.ref_no is the final arbiter under concurrency.
Every write lands in audit_log via audit_service.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.models.realestate import (
    Amenity,
    Area,
    Property,
    PropertyAmenity,
    PropertyMedia,
    PropertyTranslation,
    PropertyType,
)
from app.models.system import Media
from app.services import audit_service
from app.storage import storage
from app.utils import paginate, slugify

_SCALAR_FIELDS = (
    "purpose",
    "status",
    "property_type_id",
    "area_id",
    "block",
    "address_note",
    "price",
    "rooms",
    "bathrooms",
    "floors",
    "area_sqm",
    "latitude",
    "longitude",
    "is_featured",
    "is_vip",
    "is_premium",
)


def _next_ref_no(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"KW-{year}-"
    last = db.execute(
        select(Property.ref_no)
        .where(Property.ref_no.like(f"{prefix}%"))
        .order_by(Property.ref_no.desc())
        .limit(1)
    ).scalar_one_or_none()
    seq = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def _get_property(db: Session, property_id: int) -> Property:
    prop = db.execute(
        select(Property)
        .options(
            selectinload(Property.translations),
            selectinload(Property.media_links),
            selectinload(Property.amenity_links),
        )
        .where(Property.id == property_id)
    ).scalar_one_or_none()
    if prop is None or not prop.is_active:
        raise NotFoundError("Property not found")
    return prop


def _validate_refs(db: Session, property_type_id: int | None, area_id: int | None) -> None:
    if property_type_id is not None and db.get(PropertyType, property_type_id) is None:
        raise NotFoundError("Property type not found")
    if area_id is not None and db.get(Area, area_id) is None:
        raise NotFoundError("Area not found")


def _validate_amenities(db: Session, amenity_ids: list[int]) -> None:
    if not amenity_ids:
        return
    found = set(
        db.execute(select(Amenity.id).where(Amenity.id.in_(amenity_ids))).scalars().all()
    )
    missing = set(amenity_ids) - found
    if missing:
        raise NotFoundError(f"Unknown amenity ids: {sorted(missing)}")


def _unique_slug(db: Session, locale: str, base: str, property_id: int | None = None) -> str:
    """Appends -2, -3... until the (locale, slug) pair is free."""
    slug = base
    n = 1
    while True:
        stmt = select(PropertyTranslation.id).where(
            PropertyTranslation.locale == locale, PropertyTranslation.slug == slug
        )
        if property_id is not None:
            stmt = stmt.where(PropertyTranslation.property_id != property_id)
        if db.execute(stmt).scalar_one_or_none() is None:
            return slug
        n += 1
        slug = f"{base}-{n}"


def _apply_translations(db: Session, prop: Property, translations) -> None:
    existing = {t.locale: t for t in prop.translations}
    for tr in translations:
        slug = tr.slug or slugify(tr.title, tr.locale)
        if not slug:
            raise BusinessRuleError(f"Could not derive a slug for locale '{tr.locale}'.")
        slug = _unique_slug(db, tr.locale, slug, property_id=prop.id)
        if tr.locale in existing:
            row = existing[tr.locale]
            if tr.slug or row.slug is None:
                row.slug = slug
            row.title = tr.title
            row.description = tr.description
        else:
            db.add(
                PropertyTranslation(
                    property_id=prop.id,
                    locale=tr.locale,
                    title=tr.title,
                    slug=slug,
                    description=tr.description,
                )
            )


def _set_amenities(db: Session, prop: Property, amenity_ids: list[int]) -> None:
    wanted = set(amenity_ids)
    for link in list(prop.amenity_links):
        if link.amenity_id not in wanted:
            db.delete(link)
    current = {link.amenity_id for link in prop.amenity_links}
    for amenity_id in wanted - current:
        db.add(PropertyAmenity(property_id=prop.id, amenity_id=amenity_id))


def _jsonable(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


# --------------------------------------------------------------------------
# Output shapes
# --------------------------------------------------------------------------

def _media_out(media: Media) -> dict:
    return {
        "id": media.id,
        "storage_key": media.storage_key,
        "url": storage.url_for(media.storage_key),
        "original_filename": media.original_filename,
        "mime_type": media.mime_type,
        "width_px": media.width_px,
        "height_px": media.height_px,
        "bytes": media.bytes,
    }


def _media_items(db: Session, prop: Property) -> list[dict]:
    """property_media rows, main image first, each with its media file object
    inlined (the admin's uploader renders these directly)."""
    if not prop.media_links:
        return []
    media_by_id = {
        m.id: m
        for m in db.execute(
            select(Media).where(Media.id.in_([link.media_id for link in prop.media_links]))
        ).scalars()
    }
    links = sorted(prop.media_links, key=lambda l: (not l.is_main, l.sort_order, l.id))
    return [
        {
            "id": link.id,
            "property_id": link.property_id,
            "media_id": link.media_id,
            "url": storage.url_for(media_by_id[link.media_id].storage_key),
            "sort_order": link.sort_order,
            "is_main": link.is_main,
            "media": _media_out(media_by_id[link.media_id]),
        }
        for link in links
        if link.media_id in media_by_id
    ]


def _names(db: Session, prop: Property) -> tuple[dict, dict]:
    area = db.get(Area, prop.area_id)
    ptype = db.get(PropertyType, prop.property_type_id)
    area_names = {t.locale: t.name for t in area.translations} if area else {}
    type_names = {t.locale: t.name for t in ptype.translations} if ptype else {}
    return (
        {"id": prop.area_id, "slug": area.slug if area else None, "names": area_names},
        {"id": prop.property_type_id, "key": ptype.key if ptype else None, "names": type_names},
    )


def detail_out(db: Session, prop: Property) -> dict:
    area, ptype = _names(db, prop)
    media = _media_items(db, prop)
    return {
        "id": prop.id,
        "ref_no": prop.ref_no,
        "purpose": prop.purpose,
        "status": prop.status,
        "area": area,
        "type": ptype,
        "property_type_id": prop.property_type_id,
        "area_id": prop.area_id,
        "block": prop.block,
        "address_note": prop.address_note,
        "price": _jsonable(prop.price),
        "rooms": prop.rooms,
        "bathrooms": prop.bathrooms,
        "floors": prop.floors,
        "area_sqm": _jsonable(prop.area_sqm),
        "latitude": _jsonable(prop.latitude),
        "longitude": _jsonable(prop.longitude),
        "is_featured": prop.is_featured,
        "is_vip": prop.is_vip,
        "is_premium": prop.is_premium,
        "is_active": prop.is_active,
        "published_at": prop.published_at,
        "created_by": prop.created_by,
        "created_at": prop.created_at,
        "updated_at": prop.updated_at,
        "translations": [
            {
                "locale": t.locale,
                "title": t.title,
                "slug": t.slug,
                "description": t.description,
            }
            for t in prop.translations
        ],
        "amenity_ids": sorted(link.amenity_id for link in prop.amenity_links),
        "media": media,
        "main_image": media[0]["url"] if media else None,
        "main_image_key": media[0]["media"]["storage_key"] if media else None,
    }


def list_item_out(db: Session, prop: Property) -> dict:
    area, ptype = _names(db, prop)
    tr = next((t for t in prop.translations if t.locale == "ar"), None) or next(
        iter(prop.translations), None
    )
    media = _media_items(db, prop)
    return {
        "id": prop.id,
        "ref_no": prop.ref_no,
        "title": tr.title if tr else None,
        "slug": tr.slug if tr else None,
        "purpose": prop.purpose,
        "status": prop.status,
        "price": _jsonable(prop.price),
        "area": area,
        "type": ptype,
        "property_type_id": prop.property_type_id,
        "area_id": prop.area_id,
        "block": prop.block,
        "rooms": prop.rooms,
        "bathrooms": prop.bathrooms,
        "is_featured": prop.is_featured,
        "is_vip": prop.is_vip,
        "is_premium": prop.is_premium,
        "published_at": prop.published_at,
        "main_image": media[0]["url"] if media else None,
        "main_image_key": media[0]["media"]["storage_key"] if media else None,
        "images_count": len(media),
        "translations": [
            {"locale": t.locale, "title": t.title, "slug": t.slug} for t in prop.translations
        ],
        "created_at": prop.created_at,
    }


# --------------------------------------------------------------------------
# Queries
# --------------------------------------------------------------------------

def list_properties(
    db: Session,
    *,
    q: str | None = None,
    purpose: str | None = None,
    status: str | None = None,
    type_id: int | None = None,
    area_id: int | None = None,
    is_featured: bool | None = None,
    is_vip: bool | None = None,
    is_premium: bool | None = None,
    published: bool | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> dict:
    stmt: Select = (
        select(Property)
        .options(
            selectinload(Property.translations),
            selectinload(Property.media_links),
            selectinload(Property.amenity_links),
        )
        .where(Property.is_active.is_(True))
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Property.ref_no.ilike(like),
                Property.id.in_(
                    select(PropertyTranslation.property_id).where(
                        PropertyTranslation.title.ilike(like)
                    )
                ),
            )
        )
    if purpose is not None:
        stmt = stmt.where(Property.purpose == purpose)
    if status is not None:
        stmt = stmt.where(Property.status == status)
    if type_id is not None:
        stmt = stmt.where(Property.property_type_id == type_id)
    if area_id is not None:
        stmt = stmt.where(Property.area_id == area_id)
    if is_featured is not None:
        stmt = stmt.where(Property.is_featured == is_featured)
    if is_vip is not None:
        stmt = stmt.where(Property.is_vip == is_vip)
    if is_premium is not None:
        stmt = stmt.where(Property.is_premium == is_premium)
    if published is not None:
        stmt = stmt.where(
            Property.published_at.isnot(None) if published else Property.published_at.is_(None)
        )
    items, next_cursor = paginate(db, stmt, Property, cursor, limit)
    return {"items": [list_item_out(db, p) for p in items], "next_cursor": next_cursor}


def get_property_detail(db: Session, property_id: int) -> dict:
    return detail_out(db, _get_property(db, property_id))


# --------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------

def create_property(db: Session, data, actor_user_id: int) -> dict:
    _validate_refs(db, data.property_type_id, data.area_id)
    _validate_amenities(db, data.amenity_ids)
    if len({tr.locale for tr in data.translations}) != len(data.translations):
        raise BusinessRuleError("Duplicate locale in translations.")

    prop = Property(
        ref_no=_next_ref_no(db),
        purpose=data.purpose,
        status=data.status,
        property_type_id=data.property_type_id,
        area_id=data.area_id,
        block=data.block,
        address_note=data.address_note,
        price=data.price,
        rooms=data.rooms,
        bathrooms=data.bathrooms,
        floors=data.floors,
        area_sqm=data.area_sqm,
        latitude=data.latitude,
        longitude=data.longitude,
        is_featured=data.is_featured,
        is_vip=data.is_vip,
        is_premium=data.is_premium,
        created_by=actor_user_id,
    )
    db.add(prop)
    db.flush()
    _apply_translations(db, prop, data.translations)
    for amenity_id in set(data.amenity_ids):
        db.add(PropertyAmenity(property_id=prop.id, amenity_id=amenity_id))

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="property.create",
        entity_type="property",
        entity_id=prop.id,
        after={
            "ref_no": prop.ref_no,
            "purpose": prop.purpose,
            "price": _jsonable(prop.price),
            "area_id": prop.area_id,
            "property_type_id": prop.property_type_id,
        },
    )
    db.commit()
    return get_property_detail(db, prop.id)


def update_property(db: Session, property_id: int, data, actor_user_id: int) -> dict:
    prop = _get_property(db, property_id)
    _validate_refs(db, data.property_type_id, data.area_id)

    proposed = {f: v for f in _SCALAR_FIELDS if (v := getattr(data, f)) is not None}
    before, after = audit_service.diff_changed_fields(prop, proposed)
    for field, value in proposed.items():
        setattr(prop, field, value)

    if data.translations is not None:
        if len({tr.locale for tr in data.translations}) != len(data.translations):
            raise BusinessRuleError("Duplicate locale in translations.")
        before_tr = {t.locale: t.title for t in prop.translations}
        _apply_translations(db, prop, data.translations)
        after["translations"] = {tr.locale: tr.title for tr in data.translations}
        before["translations"] = before_tr

    if data.amenity_ids is not None:
        _validate_amenities(db, data.amenity_ids)
        before_ids = sorted(link.amenity_id for link in prop.amenity_links)
        if before_ids != sorted(set(data.amenity_ids)):
            _set_amenities(db, prop, data.amenity_ids)
            before["amenity_ids"] = before_ids
            after["amenity_ids"] = sorted(set(data.amenity_ids))

    if before or after:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="property.update",
            entity_type="property",
            entity_id=prop.id,
            before=before,
            after=after,
        )
    db.commit()
    return get_property_detail(db, prop.id)


def soft_delete_property(db: Session, property_id: int, actor_user_id: int) -> None:
    prop = _get_property(db, property_id)
    prop.is_active = False
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="property.delete",
        entity_type="property",
        entity_id=prop.id,
        before={"is_active": True},
        after={"is_active": False},
    )
    db.commit()


def set_published(db: Session, property_id: int, publish: bool, actor_user_id: int) -> dict:
    prop = _get_property(db, property_id)
    if publish and not prop.translations:
        raise BusinessRuleError("Cannot publish a property without translations.")
    was = prop.published_at
    if publish and was is None:
        prop.published_at = datetime.now(timezone.utc)
    elif not publish and was is not None:
        prop.published_at = None
    else:
        return detail_out(db, prop)  # no-op

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="property.publish" if publish else "property.unpublish",
        entity_type="property",
        entity_id=prop.id,
        before={"published_at": _jsonable(was)},
        after={"published_at": _jsonable(prop.published_at)},
    )
    db.commit()
    return get_property_detail(db, prop.id)


# --------------------------------------------------------------------------
# Media links
# --------------------------------------------------------------------------

def attach_media(db: Session, property_id: int, media: Media, sort_order: int, is_main: bool, actor_user_id: int) -> dict:
    prop = _get_property(db, property_id)
    if is_main:
        for link in prop.media_links:
            link.is_main = False
    elif not prop.media_links:
        is_main = True  # first image becomes the main one by default
    link = PropertyMedia(property_id=prop.id, media_id=media.id, sort_order=sort_order, is_main=is_main)
    db.add(link)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="property.media_attach",
        entity_type="property",
        entity_id=prop.id,
        after={"media_id": media.id, "sort_order": sort_order, "is_main": is_main},
    )
    db.commit()
    db.refresh(link)
    return {
        "id": link.id,
        "media_id": link.media_id,
        "url": storage.url_for(media.storage_key),
        "sort_order": link.sort_order,
        "is_main": link.is_main,
    }


def _get_media_link(db: Session, property_id: int, property_media_id: int) -> PropertyMedia:
    link = db.get(PropertyMedia, property_media_id)
    if link is None or link.property_id != property_id:
        raise NotFoundError("Property media not found")
    return link


def update_media_link(db: Session, property_id: int, property_media_id: int, data, actor_user_id: int) -> dict:
    prop = _get_property(db, property_id)
    link = _get_media_link(db, property_id, property_media_id)
    proposed = {}
    if data.sort_order is not None:
        proposed["sort_order"] = data.sort_order
    if data.is_main is not None:
        proposed["is_main"] = data.is_main
        if data.is_main:
            for other in prop.media_links:
                if other.id != link.id:
                    other.is_main = False
    before, after = audit_service.diff_changed_fields(link, proposed)
    for field, value in proposed.items():
        setattr(link, field, value)
    if before:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="property.media_update",
            entity_type="property",
            entity_id=property_id,
            before=before,
            after=after,
        )
    db.commit()
    media = db.get(Media, link.media_id)
    return {
        "id": link.id,
        "media_id": link.media_id,
        "url": storage.url_for(media.storage_key) if media else None,
        "sort_order": link.sort_order,
        "is_main": link.is_main,
    }


def detach_media(db: Session, property_id: int, property_media_id: int, actor_user_id: int) -> None:
    _get_property(db, property_id)
    link = _get_media_link(db, property_id, property_media_id)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="property.media_detach",
        entity_type="property",
        entity_id=property_id,
        before={"media_id": link.media_id, "property_media_id": link.id},
    )
    db.delete(link)
    db.commit()
