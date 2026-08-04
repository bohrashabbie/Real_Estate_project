"""Password hashing, JWT issuance/verification, and refresh-token helpers.

Access tokens are JWTs (short-lived, stateless). Refresh tokens are opaque
random strings, not JWTs: rotate_refresh_token validates them purely via the
stored hash + user_sessions.expires_at, so there is nothing to gain from
making them parseable, and an opaque token leaks no metadata if intercepted.

No MFA in this build (per CLAUDE.md) — login is a plain access + refresh pair.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.hash import argon2

from app.config import settings
from app.middleware.error import AuthenticationError

ACCESS_TOKEN_TYPE = "access"


def hash_password(password: str) -> str:
    return argon2.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return argon2.verify(password, password_hash)


def _encode(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "typ": token_type, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return _encode(subject, ACCESS_TOKEN_TYPE, timedelta(minutes=settings.access_token_expire_minutes))


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthenticationError("Invalid or expired access token.") from exc
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise AuthenticationError("Invalid token type.")
    return payload


def create_refresh_token(subject: str) -> str:
    del subject  # opaque token; identity is resolved via the user_sessions row, not the token itself
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
