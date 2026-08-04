from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.system import Media
from app.storage import storage

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


def upload_media(db: Session, file: UploadFile, uploaded_by_user_id: int) -> Media:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BusinessRuleError(
            f"Unsupported file type: {file.content_type}. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )
    data = file.file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise BusinessRuleError("File exceeds the 15MB upload limit.")

    checksum = hashlib.sha256(data).hexdigest()
    now = datetime.now(timezone.utc)
    key = storage.build_key(f"{now:%Y}/{now:%m}", f"{uuid4().hex}{_EXTENSIONS[file.content_type]}")
    storage.save_bytes(key, data)

    media = Media(
        storage_key=key,
        original_filename=file.filename,
        mime_type=file.content_type,
        bytes=len(data),
        checksum_sha256=checksum,
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def get_media(db: Session, media_id: int) -> Media:
    media = db.get(Media, media_id)
    if media is None:
        raise NotFoundError("Media not found")
    return media


def media_out(media: Media) -> dict:
    return {
        "id": media.id,
        "storage_key": media.storage_key,
        "url": storage.url_for(media.storage_key),
        "original_filename": media.original_filename,
        "mime_type": media.mime_type,
        "width_px": media.width_px,
        "height_px": media.height_px,
        "bytes": media.bytes,
        "created_at": media.created_at,
    }
