from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.schemas.realestate import PropertyRequestOut, PropertyRequestStatusUpdate
from app.services import inquiry_service

router = APIRouter()


@router.get("")
def list_property_requests(
    status: str | None = Query(None, pattern="^(new|in_progress|matched|closed)$"),
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require("requests.view")),
) -> dict:
    result = inquiry_service.list_property_requests(db, status=status, cursor=cursor, limit=limit)
    return {
        "items": [PropertyRequestOut.model_validate(r) for r in result["items"]],
        "next_cursor": result["next_cursor"],
    }


@router.patch("/{request_id}", response_model=PropertyRequestOut)
def update_property_request(
    request_id: int,
    payload: PropertyRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("requests.manage")),
):
    return inquiry_service.update_property_request_status(db, request_id, payload.status, current_user.id)


# Permission keys used by this router: requests.view, requests.manage
