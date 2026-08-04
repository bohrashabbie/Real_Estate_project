from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from passlib.hash import argon2
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.cache import (
    AUTHZ_TTL_SECONDS,
    CACHE_TTL_SECONDS,
    Namespace,
    cache,
    invalidate_authz,
)
from app.config import settings
from app.middleware.error import (
    AuthenticationError,
    BusinessRuleError,
    ConflictError,
    NotFoundError,
)
from app.middleware.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
)
from app.models.auth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
    UserSession,
)
from app.services import audit_service

logger = logging.getLogger("app.auth")

MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15


def _get_active_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email, User.is_active.is_(True))
    return db.execute(stmt).scalar_one_or_none()


def authenticate(db: Session, email: str, password: str) -> User:
    user = _get_active_user_by_email(db, email)
    if user is None:
        raise AuthenticationError("Invalid email or password.")

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise AuthenticationError(
            "Account temporarily locked due to repeated failed logins.",
            code="account_locked",
        )

    if not argon2.verify(password, user.password_hash):
        user.failed_login_count = (user.failed_login_count or 0) + 1
        if user.failed_login_count >= MAX_FAILED_LOGINS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        raise AuthenticationError("Invalid email or password.")

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return user


def issue_session(db: Session, user: User, ip: str | None, user_agent: str | None) -> tuple[str, str]:
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        ip=ip,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    db.commit()
    return access_token, refresh_token


def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[str, str, User]:
    token_hash = hash_token(refresh_token)
    stmt = select(UserSession).where(
        UserSession.refresh_token_hash == token_hash,
        UserSession.revoked_at.is_(None),
    )
    session = db.execute(stmt).scalar_one_or_none()
    if session is None or session.expires_at < datetime.now(timezone.utc):
        raise AuthenticationError("Refresh token is invalid or expired.")

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Account no longer active.")

    session.revoked_at = datetime.now(timezone.utc)
    db.commit()

    access_token, new_refresh_token = issue_session(db, user, ip=session.ip, user_agent=session.user_agent)
    return access_token, new_refresh_token, user


def revoke_session(db: Session, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    stmt = select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    session = db.execute(stmt).scalar_one_or_none()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()


def get_user_permissions(db: Session, user: User) -> set[str]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(
            UserRole.user_id == user.id,
            or_(UserRole.expires_at.is_(None), UserRole.expires_at > now),
        )
    )
    return set(db.execute(stmt).scalars().all())


def has_permission(db: Session, user: User, permission_key: str) -> bool:
    """The single hottest check in the app — deps.require() runs it on every
    authenticated request. Cached per (user, key) under a short authz TTL and
    invalidated by every writer that can change what a user may do."""

    def load() -> bool:
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserRole.id)
            .join(RolePermission, RolePermission.role_id == UserRole.role_id)
            .join(Permission, Permission.id == RolePermission.permission_id)
            .where(
                UserRole.user_id == user.id,
                Permission.key == permission_key,
                or_(UserRole.expires_at.is_(None), UserRole.expires_at > now),
            )
            .limit(1)
        )
        return db.execute(stmt).scalar_one_or_none() is not None

    return cache.get_or_set(
        Namespace.USER_GRANTS,
        f"{user.id}:{permission_key}",
        AUTHZ_TTL_SECONDS,
        load,
    )


def get_user_roles(db: Session, user: User) -> list[Role]:
    stmt = select(Role).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user.id)
    return list(db.execute(stmt).scalars().all())


# --------------------------------------------------------------------------
# Staff user management
# --------------------------------------------------------------------------

def create_user(db: Session, data, actor_user_id: int | None) -> User:
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone_e164=data.phone_e164,
        is_active=True,
        created_by_user_id=actor_user_id,
    )
    db.add(user)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="user.create",
        entity_type="user",
        entity_id=None,
        after={"email": data.email, "full_name": data.full_name},
    )
    db.commit()
    db.refresh(user)
    return user


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


def update_user(db: Session, user_id: int, data, actor_user_id: int | None) -> User:
    user = get_user(db, user_id)
    proposed = {f: v for f in ("full_name", "phone_e164", "is_active") if (v := getattr(data, f)) is not None}
    before, after = audit_service.diff_changed_fields(user, proposed)
    for field, value in proposed.items():
        setattr(user, field, value)
    if before:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="user.update",
            entity_type="user",
            entity_id=user.id,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: int, actor_user_id: int | None) -> None:
    user = get_user(db, user_id)
    if not user.is_active:
        return
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        before={"is_active": True},
        after={"is_active": False},
    )
    user.is_active = False
    db.commit()
    invalidate_authz(user_id)


def list_user_role_assignments(db: Session, user_id: int) -> list[dict]:
    stmt = select(UserRole, Role.code).join(Role, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)
    return [
        {
            "id": ur.id,
            "user_id": ur.user_id,
            "role_id": ur.role_id,
            "role_code": code,
            "granted_by_user_id": ur.granted_by_user_id,
            "granted_at": ur.granted_at,
            "expires_at": ur.expires_at,
        }
        for ur, code in db.execute(stmt).all()
    ]


def assign_role(db: Session, user_id: int, data, actor_user_id: int | None) -> dict:
    if get_user(db, user_id) is None:
        raise NotFoundError("User not found")
    if db.get(Role, data.role_id) is None:
        raise NotFoundError("Role not found")

    assignment = UserRole(
        user_id=user_id,
        role_id=data.role_id,
        granted_by_user_id=actor_user_id,
        granted_at=datetime.now(timezone.utc),
        expires_at=data.expires_at,
    )
    db.add(assignment)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="user.assign_role",
        entity_type="user",
        entity_id=user_id,
        after={"role_id": data.role_id},
    )
    db.commit()
    invalidate_authz(user_id)
    db.refresh(assignment)
    role = db.get(Role, assignment.role_id)
    return {
        "id": assignment.id,
        "user_id": assignment.user_id,
        "role_id": assignment.role_id,
        "role_code": role.code,
        "granted_by_user_id": assignment.granted_by_user_id,
        "granted_at": assignment.granted_at,
        "expires_at": assignment.expires_at,
    }


def revoke_role(db: Session, user_id: int, user_role_id: int, actor_user_id: int | None) -> None:
    assignment = db.get(UserRole, user_role_id)
    if assignment is None or assignment.user_id != user_id:
        raise NotFoundError("Role assignment not found")
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="user.revoke_role",
        entity_type="user",
        entity_id=user_id,
        before={"role_id": assignment.role_id},
    )
    db.delete(assignment)
    db.commit()
    invalidate_authz(user_id)


# --------------------------------------------------------------------------
# Roles & permissions
# --------------------------------------------------------------------------

def list_role_details(db: Session) -> list[dict]:
    """Every role with its permission keys, in two queries (no N+1). Cached:
    roles change rarely, and every writer invalidates Namespace.ROLES."""

    def load() -> list[dict]:
        roles = list(db.execute(select(Role).order_by(Role.id)).scalars().all())
        rows = db.execute(
            select(RolePermission.role_id, Permission.key).join(
                Permission, Permission.id == RolePermission.permission_id
            )
        ).all()
        keys_by_role: dict[int, list[str]] = {}
        for role_id, key in rows:
            keys_by_role.setdefault(role_id, []).append(key)
        return [
            {
                "id": role.id,
                "code": role.code,
                "name_ar": role.name_ar,
                "name_en": role.name_en,
                "description": role.description,
                "is_system": role.is_system,
                "permission_keys": sorted(keys_by_role.get(role.id, [])),
            }
            for role in roles
        ]

    return cache.get_or_set(Namespace.ROLES, "all", CACHE_TTL_SECONDS, load)


def _resolve_permissions(db: Session, permission_keys: list[str]) -> list[Permission]:
    permissions = list(db.execute(select(Permission).where(Permission.key.in_(permission_keys))).scalars().all())
    missing = set(permission_keys) - {p.key for p in permissions}
    if missing:
        raise BusinessRuleError(f"Unknown permission keys: {sorted(missing)}")
    return permissions


def create_role(db: Session, data, actor_user_id: int | None) -> dict:
    if db.execute(select(Role).where(Role.code == data.code)).scalar_one_or_none():
        raise ConflictError(f"A role with code '{data.code}' already exists.")

    permissions = _resolve_permissions(db, data.permission_keys)

    role = Role(
        code=data.code,
        name_ar=data.name_ar,
        name_en=data.name_en,
        description=data.description,
        is_system=False,
    )
    db.add(role)
    db.flush()  # assigns role.id for the RolePermission rows below

    now = datetime.now(timezone.utc)
    for perm in permissions:
        db.add(RolePermission(role_id=role.id, permission_id=perm.id, granted_by_user_id=actor_user_id, granted_at=now))

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="role.create",
        entity_type="role",
        entity_id=role.id,
        after={"code": role.code, "name_en": role.name_en, "permission_keys": sorted(p.key for p in permissions)},
    )
    db.commit()
    # New role: nobody holds it yet, but the roles list cache is now stale.
    cache.invalidate(Namespace.ROLES)
    return get_role_detail(db, role.id)


def get_role_detail(db: Session, role_id: int) -> dict:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFoundError("Role not found")
    keys = db.execute(
        select(Permission.key).join(RolePermission, RolePermission.permission_id == Permission.id).where(
            RolePermission.role_id == role_id
        )
    ).scalars().all()
    return {
        "id": role.id,
        "code": role.code,
        "name_ar": role.name_ar,
        "name_en": role.name_en,
        "description": role.description,
        "is_system": role.is_system,
        "permission_keys": sorted(keys),
    }


def update_role_permissions(db: Session, role_id: int, permission_keys: list[str], actor_user_id: int | None) -> dict:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFoundError("Role not found")

    permissions = _resolve_permissions(db, permission_keys)
    found_keys = {p.key for p in permissions}

    before_keys = sorted(
        db.execute(
            select(Permission.key).join(RolePermission, RolePermission.permission_id == Permission.id).where(
                RolePermission.role_id == role_id
            )
        ).scalars().all()
    )

    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
    now = datetime.now(timezone.utc)
    for perm in permissions:
        db.add(RolePermission(role_id=role_id, permission_id=perm.id, granted_by_user_id=actor_user_id, granted_at=now))

    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action="role.permissions_update",
        entity_type="role",
        entity_id=role_id,
        before={"permission_keys": before_keys},
        after={"permission_keys": sorted(found_keys)},
    )
    db.commit()
    # This changes what every holder of the role may do, and the user->role
    # mapping isn't tracked in memory, so the whole authz namespace drops.
    invalidate_authz()
    return get_role_detail(db, role_id)


def list_permission_dicts(db: Session) -> list[dict]:
    """The permission catalog as plain dicts — only changes at deploy time."""

    def load() -> list[dict]:
        return [
            {
                "id": p.id,
                "key": p.key,
                "group": p.group,
                "description": p.description,
                "is_dangerous": p.is_dangerous,
            }
            for p in db.execute(select(Permission).order_by(Permission.id)).scalars().all()
        ]

    return cache.get_or_set(
        Namespace.PERMISSION_CATALOG, "all", CACHE_TTL_SECONDS, load
    )
