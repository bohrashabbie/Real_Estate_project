"""Areas, property types and amenities — CRUD with translations.

All three share the same shape (row + *_translations keyed by locale), so one
generic implementation covers them. Soft delete only (is_active=false); the
domain tables reference these rows via FK and nothing referenced is ever
hard-deleted.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import ConflictError, NotFoundError
from app.models.realestate import (
    Amenity,
    AmenityTranslation,
    Area,
    AreaTranslation,
    PropertyType,
    PropertyTypeTranslation,
)
from app.services import audit_service
from app.utils import slugify

_TRANSLATION_MODEL = {
    Area: (AreaTranslation, "area_id"),
    PropertyType: (PropertyTypeTranslation, "property_type_id"),
    Amenity: (AmenityTranslation, "amenity_id"),
}

_ENTITY_TYPE = {Area: "area", PropertyType: "property_type", Amenity: "amenity"}


def _translations_dict(row) -> dict[str, str]:
    return {t.locale: t.name for t in row.translations}


def _out(row) -> dict:
    out = {
        "id": row.id,
        "sort_order": row.sort_order,
        "is_active": row.is_active,
        "translations": _translations_dict(row),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
    if hasattr(row, "slug"):
        out["slug"] = row.slug
    if hasattr(row, "key"):
        out["key"] = row.key
    return out


def list_rows(db: Session, model, include_inactive: bool = True) -> list[dict]:
    stmt = select(model).options(selectinload(model.translations)).order_by(model.sort_order, model.id)
    if not include_inactive:
        stmt = stmt.where(model.is_active.is_(True))
    return [_out(row) for row in db.execute(stmt).scalars().all()]


def get_row(db: Session, model, row_id: int) -> dict:
    row = db.get(model, row_id)
    if row is None:
        raise NotFoundError(f"{_ENTITY_TYPE[model].replace('_', ' ').title()} not found")
    return _out(row)


def _apply_translations(db: Session, model, row, translations: dict[str, str]) -> None:
    translation_model, fk_name = _TRANSLATION_MODEL[model]
    existing = {t.locale: t for t in row.translations}
    for locale, name in translations.items():
        if locale in existing:
            existing[locale].name = name
        else:
            db.add(translation_model(**{fk_name: row.id, "locale": locale, "name": name}))


def create_row(db: Session, model, data, actor_user_id: int) -> dict:
    kwargs: dict = {"sort_order": data.sort_order, "is_active": data.is_active}
    if hasattr(model, "key") and hasattr(data, "key"):
        if db.execute(select(model).where(model.key == data.key)).scalar_one_or_none():
            raise ConflictError(f"A {_ENTITY_TYPE[model]} with key '{data.key}' already exists.")
        kwargs["key"] = data.key
    if hasattr(model, "slug"):
        slug = getattr(data, "slug", None) or slugify(
            data.translations.get("en") or next(iter(data.translations.values()))
        )
        if db.execute(select(model).where(model.slug == slug)).scalar_one_or_none():
            raise ConflictError(f"A {_ENTITY_TYPE[model]} with slug '{slug}' already exists.")
        kwargs["slug"] = slug

    row = model(**kwargs)
    db.add(row)
    db.flush()
    _apply_translations(db, model, row, data.translations)

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"{_ENTITY_TYPE[model]}.create",
        entity_type=_ENTITY_TYPE[model],
        entity_id=row.id,
        after={**{k: v for k, v in kwargs.items()}, "translations": data.translations},
    )
    db.commit()
    db.refresh(row)
    return _out(row)


def update_row(db: Session, model, row_id: int, data, actor_user_id: int) -> dict:
    row = db.get(model, row_id)
    if row is None:
        raise NotFoundError(f"{_ENTITY_TYPE[model].replace('_', ' ').title()} not found")

    scalar_fields = [f for f in ("slug", "sort_order", "is_active") if hasattr(row, f) and hasattr(data, f)]
    proposed = {f: v for f in scalar_fields if (v := getattr(data, f)) is not None}
    before, after = audit_service.diff_changed_fields(row, proposed)
    for field, value in proposed.items():
        setattr(row, field, value)

    if data.translations:
        before_tr = _translations_dict(row)
        _apply_translations(db, model, row, data.translations)
        changed = {k: v for k, v in data.translations.items() if before_tr.get(k) != v}
        if changed:
            before["translations"] = {k: before_tr.get(k) for k in changed}
            after["translations"] = changed

    if before or after:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action=f"{_ENTITY_TYPE[model]}.update",
            entity_type=_ENTITY_TYPE[model],
            entity_id=row.id,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(row)
    return _out(row)


def soft_delete_row(db: Session, model, row_id: int, actor_user_id: int) -> None:
    row = db.get(model, row_id)
    if row is None:
        raise NotFoundError(f"{_ENTITY_TYPE[model].replace('_', ' ').title()} not found")
    if not row.is_active:
        return
    row.is_active = False
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"{_ENTITY_TYPE[model]}.delete",
        entity_type=_ENTITY_TYPE[model],
        entity_id=row.id,
        before={"is_active": True},
        after={"is_active": False},
    )
    db.commit()
