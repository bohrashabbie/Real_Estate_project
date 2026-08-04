from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.schemas.auth import PermissionOut, RoleCreate, RoleDetailOut, RolePermissionsUpdate
from app.services import auth_service

router = APIRouter()


@router.get("", response_model=list[RoleDetailOut])
def list_roles(db: Session = Depends(get_db), _user=Depends(require("roles.view"))) -> list[dict]:
    return auth_service.list_role_details(db)


@router.post("", response_model=RoleDetailOut, status_code=201)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require("roles.manage")),
) -> dict:
    return auth_service.create_role(db, payload, current_user.id)


@router.get("/permissions", response_model=list[PermissionOut])
def list_permissions(db: Session = Depends(get_db), _user=Depends(require("roles.view"))) -> list[dict]:
    """The full permission catalog, for building the role/permission matrix UI."""
    return auth_service.list_permission_dicts(db)


@router.get("/{role_id}", response_model=RoleDetailOut)
def get_role(role_id: int, db: Session = Depends(get_db), _user=Depends(require("roles.view"))) -> dict:
    return auth_service.get_role_detail(db, role_id)


@router.patch("/{role_id}/permissions", response_model=RoleDetailOut)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require("roles.manage")),
) -> dict:
    """Replaces the full permission set for this role."""
    return auth_service.update_role_permissions(db, role_id, payload.permission_keys, current_user.id)


# Permission keys used by this router: roles.view, roles.manage
