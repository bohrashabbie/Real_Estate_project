from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.realestate import BannerCreate, BannerReorder, BannerUpdate
from app.schemas.system import MediaOut
from app.services import banner_service, media_service

router = APIRouter()


@router.get("")
def list_banners(
    include_inactive: bool = True,
    db: Session = Depends(get_db),
    _user=Depends(require("banners.view")),
) -> list[dict]:
    return banner_service.list_banners(db, include_inactive=include_inactive)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_banner(
    payload: BannerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("banners.manage")),
) -> dict:
    return banner_service.create_banner(db, payload, current_user.id)


@router.post("/upload", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
def upload_banner_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("banners.manage")),
) -> dict:
    """Banner artwork goes through the same media pipeline as property photos.

    It needs its own endpoint because /media/upload is gated on
    properties.edit — a manager who only runs marketing shouldn't need listing
    permissions to swap the home-page hero.
    """
    return media_service.media_out(media_service.upload_media(db, file, current_user.id))


@router.post("/reorder")
def reorder_banners(
    payload: BannerReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("banners.manage")),
) -> list[dict]:
    return banner_service.reorder_banners(db, payload.items, current_user.id)


@router.get("/{banner_id}")
def get_banner(
    banner_id: int, db: Session = Depends(get_db), _user=Depends(require("banners.view"))
) -> dict:
    return banner_service.get_banner(db, banner_id)


@router.patch("/{banner_id}")
def update_banner(
    banner_id: int,
    payload: BannerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("banners.manage")),
) -> dict:
    return banner_service.update_banner(db, banner_id, payload, current_user.id)


@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def soft_delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("banners.manage")),
) -> None:
    banner_service.soft_delete_banner(db, banner_id, current_user.id)


# Permission keys used by this router: banners.view, banners.manage
