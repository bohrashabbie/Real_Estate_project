from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.realestate import InquiryOut, InquiryStatusUpdate
from app.services import inquiry_service

router = APIRouter()


@router.get("")
def list_inquiries(
    status: str | None = Query(None, pattern="^(new|contacted|closed)$"),
    source: str | None = Query(None, pattern="^(property|contact|home)$"),
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("inquiries.view")),
) -> dict:
    return inquiry_service.list_inquiries(db, status=status, source=source, cursor=cursor, limit=limit)


@router.patch("/{inquiry_id}", response_model=InquiryOut)
def update_inquiry(
    inquiry_id: int,
    payload: InquiryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("inquiries.manage")),
):
    return inquiry_service.update_inquiry_status(db, inquiry_id, payload.status, current_user.id)


@router.delete("/{inquiry_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("inquiries.manage")),
) -> None:
    """Soft delete: hidden from the list, kept with its audit trail."""
    inquiry_service.delete_inquiry(db, inquiry_id, current_user.id)


# Permission keys used by this router: inquiries.view, inquiries.manage
