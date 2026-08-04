from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.auth import User
from app.schemas.auth import (
    CurrentUserOut,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshRequest,
    RefreshResponse,
    RoleOut,
)
from app.services import auth_service

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    user = auth_service.authenticate(db, payload.email, payload.password)
    access_token, refresh_token = auth_service.issue_session(
        db, user, ip=_client_ip(request), user_agent=request.headers.get("user-agent")
    )
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> RefreshResponse:
    access_token, refresh_token, _user = auth_service.rotate_refresh_token(db, payload.refresh_token)
    return RefreshResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    auth_service.revoke_session(db, payload.refresh_token)


@router.get("/me", response_model=CurrentUserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CurrentUserOut:
    roles = auth_service.get_user_roles(db, current_user)
    permissions = auth_service.get_user_permissions(db, current_user)
    return CurrentUserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        roles=[RoleOut.model_validate(role) for role in roles],
        permissions=sorted(permissions),
    )


# Permission keys used by this router: none beyond a valid bearer token for
# /me. login/refresh/logout are intentionally reachable without a token —
# that's the point of the flow.
