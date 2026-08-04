from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.realestate import PropertyCreate, PropertyMediaPatch, PropertyUpdate
from app.services import media_service, property_service

router = APIRouter()


@router.get("")
def list_properties(
    q: str | None = None,
    purpose: str | None = Query(None, pattern="^(rent|sale)$"),
    status_: str | None = Query(None, alias="status", pattern="^(available|rented|sold|reserved)$"),
    type_id: int | None = None,
    area_id: int | None = None,
    is_featured: bool | None = None,
    is_premium: bool | None = None,
    published: bool | None = None,
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("properties.view")),
) -> dict:
    return property_service.list_properties(
        db,
        q=q,
        purpose=purpose,
        status=status_,
        type_id=type_id,
        area_id=area_id,
        is_featured=is_featured,
        is_premium=is_premium,
        published=published,
        cursor=cursor,
        limit=limit,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.create")),
) -> dict:
    return property_service.create_property(db, payload, current_user.id)


@router.get("/{property_id}")
def get_property(
    property_id: int, db: Session = Depends(get_db), _user=Depends(require("properties.view"))
) -> dict:
    return property_service.get_property_detail(db, property_id)


@router.patch("/{property_id}")
def update_property(
    property_id: int,
    payload: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.edit")),
) -> dict:
    return property_service.update_property(db, property_id, payload, current_user.id)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.delete")),
) -> None:
    property_service.soft_delete_property(db, property_id, current_user.id)


@router.post("/{property_id}/publish")
def publish_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.publish")),
) -> dict:
    return property_service.set_published(db, property_id, True, current_user.id)


@router.post("/{property_id}/unpublish")
def unpublish_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.publish")),
) -> dict:
    return property_service.set_published(db, property_id, False, current_user.id)


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------

@router.post("/{property_id}/media", status_code=status.HTTP_201_CREATED)
def upload_property_media(
    property_id: int,
    file: UploadFile = File(...),
    sort_order: int = 0,
    is_main: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.edit")),
) -> dict:
    """Multipart upload → media row + property_media link in one call."""
    media = media_service.upload_media(db, file, current_user.id)
    return property_service.attach_media(db, property_id, media, sort_order, is_main, current_user.id)


@router.patch("/{property_id}/media/{property_media_id}")
def update_property_media(
    property_id: int,
    property_media_id: int,
    payload: PropertyMediaPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.edit")),
) -> dict:
    return property_service.update_media_link(db, property_id, property_media_id, payload, current_user.id)


@router.delete("/{property_id}/media/{property_media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property_media(
    property_id: int,
    property_media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.edit")),
) -> None:
    property_service.detach_media(db, property_id, property_media_id, current_user.id)


# Permission keys used by this router: properties.view, properties.create,
# properties.edit, properties.delete, properties.publish
