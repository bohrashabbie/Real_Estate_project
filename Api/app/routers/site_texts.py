from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.system import SiteTextsBulkUpdate
from app.services import site_text_service

router = APIRouter()


@router.get("")
def list_site_texts(
    db: Session = Depends(get_db),
    _user=Depends(require("content.view")),
) -> list[dict]:
    """The strings the office has changed; everything else is the default."""
    return site_text_service.list_texts(db)


@router.put("")
def save_site_texts(
    payload: SiteTextsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("content.manage")),
) -> list[dict]:
    """Save edited strings; an empty value puts the default back."""
    return site_text_service.save_texts(db, payload.items, current_user.id)


# Permission keys used by this router: content.view, content.manage
