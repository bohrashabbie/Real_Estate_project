from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.middleware.error import NotFoundError
from app.models.system import Setting
from app.services import audit_service


def get_setting(db: Session, key: str) -> Setting:
    setting = db.get(Setting, key)
    if setting is None:
        raise NotFoundError("Setting not found")
    return setting


def list_settings(db: Session, group: str | None = None) -> list[Setting]:
    stmt = select(Setting)
    if group is not None:
        stmt = stmt.where(Setting.group == group)
    return list(db.execute(stmt).scalars().all())


def upsert_setting(db: Session, key: str, data, actor_user_id: int) -> Setting:
    setting = db.get(Setting, key)
    before = {"value": setting.value} if setting is not None else None

    if setting is None:
        setting = Setting(
            key=key,
            value=data.value,
            group=data.group or "site",
            is_public=data.is_public if data.is_public is not None else False,
            updated_by_user_id=actor_user_id,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(setting)
    else:
        setting.value = data.value
        if data.group is not None:
            setting.group = data.group
        if data.is_public is not None:
            setting.is_public = data.is_public
        setting.updated_by_user_id = actor_user_id
        setting.updated_at = datetime.now(timezone.utc)

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="settings.update",
        entity_type="setting",
        entity_id=None,
        before=before,
        after={"value": data.value},
    )
    db.commit()
    db.refresh(setting)
    return setting


def bulk_upsert_settings(db: Session, items, actor_user_id: int) -> list[Setting]:
    """PUT /settings — upsert every {key, value} item in one transaction with
    one audit row carrying only the keys that actually changed."""
    now = datetime.now(timezone.utc)
    before: dict = {}
    after: dict = {}
    for item in items:
        key, value = item.key, item.value
        setting = db.get(Setting, key)
        if setting is None:
            setting = Setting(
                key=key,
                value=value,
                group="site",
                is_public=True,
                updated_by_user_id=actor_user_id,
                updated_at=now,
            )
            db.add(setting)
            after[key] = value
        elif setting.value != value:
            before[key] = setting.value
            after[key] = value
            setting.value = value
            setting.updated_by_user_id = actor_user_id
            setting.updated_at = now

    if after:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="settings.update",
            entity_type="setting",
            entity_id=None,
            before=before or None,
            after=after,
        )
    db.commit()
    return list_settings(db)
