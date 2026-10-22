"""The office's own wording for the public website (the Website Content page).

The storefront's strings all have defaults in its language files; this only
stores the ones the office changed, keyed by the string's path ("hero.title")
and locale. An empty value deletes the row, which puts the default back.

Placeholders like {count} are checked in the admin form (it knows the
defaults) and again by the storefront before it uses a value, so a typo can
never break a page.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system import SiteText
from app.services import audit_service


def _out(row: SiteText) -> dict:
    return {
        "key": row.key,
        "locale": row.locale,
        "value": row.value,
        "updated_at": row.updated_at,
    }


def list_texts(db: Session) -> list[dict]:
    rows = db.execute(select(SiteText).order_by(SiteText.key, SiteText.locale)).scalars()
    return [_out(row) for row in rows]


def save_texts(db: Session, items, actor_user_id: int) -> list[dict]:
    """Upsert each changed string; an empty value resets it to the default.
    One audit row per string that actually changed."""
    now = datetime.now(timezone.utc)
    for item in items:
        value = item.value.strip()
        row = db.get(SiteText, (item.key, item.locale))
        before = {"key": item.key, "locale": item.locale, "value": row.value if row else None}
        if not value:
            if row is None:
                continue
            db.delete(row)
            after = {"key": item.key, "locale": item.locale, "value": None}
            action = "site_text.reset"
        else:
            if row is not None and row.value == value:
                continue
            if row is None:
                row = SiteText(key=item.key, locale=item.locale)
                db.add(row)
            row.value = value
            row.updated_by_user_id = actor_user_id
            row.updated_at = now
            after = {"key": item.key, "locale": item.locale, "value": value}
            action = "site_text.update"
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action=action,
            entity_type="site_text",
            entity_id=None,
            before=before,
            after=after,
        )
    db.commit()
    return list_texts(db)


def public_texts(db: Session, locale: str) -> dict[str, str]:
    """{key: value} for one locale -- what the storefront lays over its defaults."""
    rows = db.execute(select(SiteText).where(SiteText.locale == locale)).scalars()
    return {row.key: row.value for row in rows}
