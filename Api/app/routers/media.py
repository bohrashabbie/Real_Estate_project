from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.system import MediaOut
from app.services import media_service

router = APIRouter()


@router.post("/upload", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
def upload_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("properties.edit")),
) -> dict:
    return media_service.media_out(media_service.upload_media(db, file, current_user.id))


@router.get("/{media_id}", response_model=MediaOut)
def get_media(media_id: int, db: Session = Depends(get_db), _user=Depends(require("properties.view"))) -> dict:
    return media_service.media_out(media_service.get_media(db, media_id))


# Permission keys used by this router: properties.edit, properties.view
