"""Areas, property types and amenities — three parallel CRUD routers built
from one factory, since the resources share the same translated-row shape.

NOTE: no `from __future__ import annotations` here — the endpoint annotations
reference the factory's closure variables (create_schema/update_schema), which
FastAPI can only resolve if they are evaluated eagerly at definition time.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.realestate import Amenity, Area, PropertyType
from app.schemas.realestate import (
    AmenityCreate,
    AmenityUpdate,
    AreaCreate,
    AreaUpdate,
    PropertyTypeCreate,
    PropertyTypeUpdate,
)
from app.services import taxonomy_service

def _build_router(model, create_schema, update_schema) -> APIRouter:
    router = APIRouter()

    @router.get("")
    def list_rows(
        include_inactive: bool = True,
        db: Session = Depends(get_db),
        _user=Depends(require("taxonomy.view")),
    ) -> list[dict]:
        return taxonomy_service.list_rows(db, model, include_inactive=include_inactive)

    @router.post("", status_code=status.HTTP_201_CREATED)
    def create_row(
        payload: create_schema,
        db: Session = Depends(get_db),
        current_user: User = Depends(require("taxonomy.manage")),
    ) -> dict:
        return taxonomy_service.create_row(db, model, payload, current_user.id)

    @router.get("/{row_id}")
    def get_row(
        row_id: int, db: Session = Depends(get_db), _user=Depends(require("taxonomy.view"))
    ) -> dict:
        return taxonomy_service.get_row(db, model, row_id)

    @router.patch("/{row_id}")
    def update_row(
        row_id: int,
        payload: update_schema,
        db: Session = Depends(get_db),
        current_user: User = Depends(require("taxonomy.manage")),
    ) -> dict:
        return taxonomy_service.update_row(db, model, row_id, payload, current_user.id)

    @router.delete("/{row_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
    def soft_delete_row(
        row_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require("taxonomy.manage")),
    ) -> None:
        taxonomy_service.soft_delete_row(db, model, row_id, current_user.id)

    return router


areas_router = _build_router(Area, AreaCreate, AreaUpdate)
property_types_router = _build_router(PropertyType, PropertyTypeCreate, PropertyTypeUpdate)
amenities_router = _build_router(Amenity, AmenityCreate, AmenityUpdate)

# Permission keys used by this router: taxonomy.view, taxonomy.manage
