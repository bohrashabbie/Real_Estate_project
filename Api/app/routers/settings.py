from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.system import Setting
from app.schemas.system import SettingOut, SettingsBulkUpdate, SettingUpdate
from app.services import system_service

router = APIRouter()


@router.get("", response_model=list[SettingOut])
def list_settings(
    group: str | None = None, db: Session = Depends(get_db), _user=Depends(require("settings.view"))
) -> list[Setting]:
    return system_service.list_settings(db, group)


@router.put("", response_model=list[SettingOut])
def bulk_update_settings(
    payload: SettingsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("settings.manage")),
) -> list[Setting]:
    """Owner-only bulk upsert: {"items": [{key, value}, ...]}."""
    return system_service.bulk_upsert_settings(db, payload.items, current_user.id)


@router.get("/{key}", response_model=SettingOut)
def get_setting(key: str, db: Session = Depends(get_db), _user=Depends(require("settings.view"))) -> Setting:
    return system_service.get_setting(db, key)


@router.patch("/{key}", response_model=SettingOut)
def update_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("settings.manage")),
) -> Setting:
    """Creates the key if it doesn't exist yet (upsert)."""
    return system_service.upsert_setting(db, key, payload, current_user.id)


# Permission keys used by this router: settings.view, settings.manage
