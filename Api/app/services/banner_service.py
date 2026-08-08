"""Home-page hero slides — CRUD with translations, ordering and scheduling.

Same translated-row shape as the taxonomies (row + `*_translations` keyed by
locale), with two differences worth knowing:

* The **image is translatable.** The artwork carries its own baked-in headline,
  so a bilingual site may need one file per locale. `Banner.media_id` is the
  fallback used everywhere; a translation row overrides it when set.
* Slides have an optional **live window** (`starts_at`/`ends_at`). The public
  read filters on it, so the office can queue a seasonal promo in advance
  instead of remembering to switch it on.

Soft delete only (`is_active=false`) — a hidden banner keeps its audit trail
and can be brought back without re-uploading.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.realestate import Banner, BannerTranslation
from app.models.system import Media
from app.services import audit_service
from app.storage import storage

ENTITY_TYPE = "banner"


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------

def _media_urls(db: Session, banners: list[Banner]) -> dict[int, str]:
    """One query for every media row the given banners reference."""
    media_ids = set()
    for banner in banners:
        media_ids.add(banner.media_id)
        media_ids.update(t.media_id for t in banner.translations if t.media_id)
    if not media_ids:
        return {}
    rows = db.execute(select(Media.id, Media.storage_key).where(Media.id.in_(media_ids))).all()
    return {media_id: storage.url_for(key) for media_id, key in rows}


def _out(banner: Banner, urls: dict[int, str]) -> dict:
    return {
        "id": banner.id,
        "media_id": banner.media_id,
        "image_url": urls.get(banner.media_id),
        "href": banner.href,
        "sort_order": banner.sort_order,
        "is_active": banner.is_active,
        "starts_at": banner.starts_at,
        "ends_at": banner.ends_at,
        "is_live": is_live(banner),
        "translations": [
            {
                "locale": t.locale,
                "alt_text": t.alt_text,
                "media_id": t.media_id,
                "image_url": urls.get(t.media_id) if t.media_id else None,
            }
            for t in sorted(banner.translations, key=lambda t: t.locale)
        ],
        "created_at": banner.created_at,
        "updated_at": banner.updated_at,
    }


def is_live(banner: Banner, now: datetime | None = None) -> bool:
    """Active *and* inside its scheduling window — what the storefront shows."""
    if not banner.is_active:
        return False
    now = now or datetime.now(timezone.utc)
    if banner.starts_at and banner.starts_at > now:
        return False
    if banner.ends_at and banner.ends_at < now:
        return False
    return True


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

def _base_stmt():
    return (
        select(Banner)
        .options(selectinload(Banner.translations))
        .order_by(Banner.sort_order, Banner.id)
    )


def list_banners(db: Session, include_inactive: bool = True) -> list[dict]:
    stmt = _base_stmt()
    if not include_inactive:
        stmt = stmt.where(Banner.is_active.is_(True))
    banners = list(db.execute(stmt).scalars().all())
    urls = _media_urls(db, banners)
    return [_out(banner, urls) for banner in banners]


def _get_or_404(db: Session, banner_id: int) -> Banner:
    banner = db.get(Banner, banner_id)
    if banner is None:
        raise NotFoundError("Banner not found")
    return banner


def get_banner(db: Session, banner_id: int) -> dict:
    banner = _get_or_404(db, banner_id)
    return _out(banner, _media_urls(db, [banner]))


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

def _assert_media_exists(db: Session, media_id: int | None) -> None:
    if media_id is None:
        return
    if db.get(Media, media_id) is None:
        raise NotFoundError(f"Media {media_id} not found")


def _validate_window(starts_at: datetime | None, ends_at: datetime | None) -> None:
    if starts_at and ends_at and ends_at <= starts_at:
        raise BusinessRuleError("The banner's end date must be after its start date.")


def _apply_translations(db: Session, banner: Banner, translations) -> None:
    """Upsert by locale. Locales absent from the payload are left alone, so a
    partial save can't silently wipe the other language."""
    existing = {t.locale: t for t in banner.translations}
    for item in translations:
        _assert_media_exists(db, item.media_id)
        row = existing.get(item.locale)
        if row is None:
            db.add(
                BannerTranslation(
                    banner_id=banner.id,
                    locale=item.locale,
                    alt_text=item.alt_text,
                    media_id=item.media_id,
                )
            )
        else:
            row.alt_text = item.alt_text
            row.media_id = item.media_id


def _translations_audit(translations) -> dict:
    return {t.locale: {"alt_text": t.alt_text, "media_id": t.media_id} for t in translations}


def create_banner(db: Session, data, actor_user_id: int) -> dict:
    _assert_media_exists(db, data.media_id)
    _validate_window(data.starts_at, data.ends_at)

    banner = Banner(
        media_id=data.media_id,
        href=data.href,
        sort_order=data.sort_order,
        is_active=data.is_active,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        created_by=actor_user_id,
    )
    db.add(banner)
    db.flush()
    _apply_translations(db, banner, data.translations)

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="banner.create",
        entity_type=ENTITY_TYPE,
        entity_id=banner.id,
        after={
            "media_id": data.media_id,
            "href": data.href,
            "sort_order": data.sort_order,
            "is_active": data.is_active,
            "translations": _translations_audit(data.translations),
        },
    )
    db.commit()
    db.refresh(banner)
    return _out(banner, _media_urls(db, [banner]))


def update_banner(db: Session, banner_id: int, data, actor_user_id: int) -> dict:
    banner = _get_or_404(db, banner_id)

    proposed: dict = {}
    for field in ("media_id", "href", "sort_order", "is_active", "starts_at", "ends_at"):
        value = getattr(data, field)
        if value is not None:
            proposed[field] = value
    _assert_media_exists(db, proposed.get("media_id"))
    _validate_window(
        proposed.get("starts_at", banner.starts_at),
        proposed.get("ends_at", banner.ends_at),
    )

    before, after = audit_service.diff_changed_fields(banner, proposed)
    for field, value in proposed.items():
        setattr(banner, field, value)

    if data.translations:
        before_tr = _translations_audit(banner.translations)
        _apply_translations(db, banner, data.translations)
        after_tr = _translations_audit(data.translations)
        changed = {k: v for k, v in after_tr.items() if before_tr.get(k) != v}
        if changed:
            before["translations"] = {k: before_tr.get(k) for k in changed}
            after["translations"] = changed

    if before or after:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="banner.update",
            entity_type=ENTITY_TYPE,
            entity_id=banner.id,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(banner)
    return _out(banner, _media_urls(db, [banner]))


def reorder_banners(db: Session, items, actor_user_id: int) -> list[dict]:
    """Persist a whole drag-and-drop result in one transaction — reordering one
    slide at a time would leave the list briefly inconsistent."""
    wanted = {item.id: item.sort_order for item in items}
    banners = list(db.execute(select(Banner).where(Banner.id.in_(wanted))).scalars().all())
    missing = set(wanted) - {b.id for b in banners}
    if missing:
        raise NotFoundError(f"Banner(s) not found: {', '.join(str(i) for i in sorted(missing))}")

    changed: dict[int, list[int]] = {}
    for banner in banners:
        new_order = wanted[banner.id]
        if banner.sort_order != new_order:
            changed[banner.id] = [banner.sort_order, new_order]
            banner.sort_order = new_order

    if changed:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="banner.reorder",
            entity_type=ENTITY_TYPE,
            entity_id=None,
            before={str(k): v[0] for k, v in changed.items()},
            after={str(k): v[1] for k, v in changed.items()},
        )
    db.commit()
    return list_banners(db)


def soft_delete_banner(db: Session, banner_id: int, actor_user_id: int) -> None:
    banner = _get_or_404(db, banner_id)
    if not banner.is_active:
        return
    banner.is_active = False
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="banner.delete",
        entity_type=ENTITY_TYPE,
        entity_id=banner.id,
        before={"is_active": True},
        after={"is_active": False},
    )
    db.commit()


# ---------------------------------------------------------------------------
# Public read
# ---------------------------------------------------------------------------

def public_banners(db: Session, locale: str) -> list[dict]:
    """Live slides only, flattened for one locale.

    Falls back locale → ar → en for both the alt text and the artwork, so a
    banner translated only into Arabic still renders on the English site
    rather than vanishing from it.
    """
    banners = list(db.execute(_base_stmt().where(Banner.is_active.is_(True))).scalars().all())
    banners = [b for b in banners if is_live(b)]
    urls = _media_urls(db, banners)

    out = []
    for banner in banners:
        by_locale = {t.locale: t for t in banner.translations}
        preferred = [by_locale[loc] for loc in (locale, "ar", "en") if loc in by_locale]
        alt = next((t.alt_text for t in preferred if t.alt_text), "")
        media_id = next((t.media_id for t in preferred if t.media_id), None) or banner.media_id
        image_url = urls.get(media_id)
        if not image_url:
            continue  # media row vanished — skip rather than render a broken img
        out.append({"id": banner.id, "image_url": image_url, "alt": alt, "href": banner.href})
    return out
