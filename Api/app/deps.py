from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.error import AuthenticationError, PermissionDeniedError
from app.middleware.security import decode_access_token
from app.models.auth import User
from app.permissions import all_permission_keys
from app.services import auth_service

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthenticationError("Missing bearer token.")
    payload = decode_access_token(credentials.credentials)
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise AuthenticationError("Account no longer active.")
    return user


def require(permission_key: str):
    """FastAPI dependency factory enforcing RBAC.

    No location scoping in this project — a grant is a grant everywhere.
    Frontend button-hiding is not enforcement — this dependency is.
    """
    if permission_key not in all_permission_keys():
        raise ValueError(f"Unknown permission key: {permission_key!r} — add it to app/permissions.py first.")

    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not auth_service.has_permission(db, current_user, permission_key):
            raise PermissionDeniedError(f"Missing permission: {permission_key}")
        return current_user

    return dependency
