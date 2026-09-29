from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.services import geocode_service

router = APIRouter()


@router.get("")
def locate(
    area_id: int = Query(..., ge=1),
    block: str | None = Query(None, max_length=40),
    address: str | None = Query(None, max_length=200),
    db: Session = Depends(get_db),
    _user=Depends(require("properties.edit")),
) -> dict:
    """Coordinates for a property's area / block / address note, for the admin
    form's map pin. `precision` says what matched: address, block or area."""
    return geocode_service.locate(db, area_id, block, address)


# Permission keys used by this router: properties.edit
