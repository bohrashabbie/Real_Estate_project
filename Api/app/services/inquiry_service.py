"""Inquiries and property requests.

Public inserts come through the /public/v1 endpoints with an in-memory
rate-limit-lite (per-IP sliding hour window); staff read and move rows
between statuses — never delete them.
"""

from __future__ import annotations

import threading
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.middleware.error import NotFoundError, RateLimitError
from app.models.realestate import Area, Inquiry, Property, PropertyRequest, PropertyType
from app.services import audit_service
from app.utils import paginate

# ---------------------------------------------------------------------------
# Rate-limit-lite: max N submissions per IP per hour, in-process memory only.
# Correct for the current single-worker deployment; move to Redis if the API
# is ever scaled out.
# ---------------------------------------------------------------------------

MAX_PER_HOUR = 5
_WINDOW_SECONDS = 3600.0

_submissions: dict[str, list[float]] = {}
_lock = threading.Lock()


def check_rate_limit(ip: str | None) -> None:
    if ip is None:
        return
    now = time.monotonic()
    with _lock:
        stamps = [t for t in _submissions.get(ip, []) if now - t < _WINDOW_SECONDS]
        if len(stamps) >= MAX_PER_HOUR:
            _submissions[ip] = stamps
            raise RateLimitError("Too many submissions from this address. Please try again later.")
        stamps.append(now)
        _submissions[ip] = stamps


# ---------------------------------------------------------------------------
# Inquiries
# ---------------------------------------------------------------------------

def create_inquiry(db: Session, data, ip: str | None) -> Inquiry:
    check_rate_limit(ip)
    if data.property_id is not None:
        prop = db.get(Property, data.property_id)
        if prop is None or not prop.is_active:
            raise NotFoundError("Property not found")
    inquiry = Inquiry(
        property_id=data.property_id,
        name=data.name.strip(),
        phone=data.phone.strip(),
        message=data.message.strip(),
        source=data.source,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry


def inquiry_dicts(db: Session, inquiries: list[Inquiry]) -> list[dict]:
    """InquiryOut-shaped dicts with property_ref_no resolved in one query
    (the admin's inquiry table links each row to its listing)."""
    property_ids = {i.property_id for i in inquiries if i.property_id is not None}
    ref_nos: dict[int, str] = {}
    if property_ids:
        ref_nos = dict(
            db.execute(
                select(Property.id, Property.ref_no).where(Property.id.in_(property_ids))
            ).all()
        )
    return [
        {
            "id": i.id,
            "property_id": i.property_id,
            "property_ref_no": ref_nos.get(i.property_id) if i.property_id is not None else None,
            "name": i.name,
            "phone": i.phone,
            "message": i.message,
            "source": i.source,
            "status": i.status,
            "created_at": i.created_at,
        }
        for i in inquiries
    ]


def list_inquiries(
    db: Session,
    *,
    status: str | None = None,
    source: str | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> dict:
    stmt = select(Inquiry)
    if status is not None:
        stmt = stmt.where(Inquiry.status == status)
    if source is not None:
        stmt = stmt.where(Inquiry.source == source)
    items, next_cursor = paginate(db, stmt, Inquiry, cursor, limit)
    return {"items": inquiry_dicts(db, items), "next_cursor": next_cursor}


def update_inquiry_status(db: Session, inquiry_id: int, status: str, actor_user_id: int) -> dict:
    inquiry = db.get(Inquiry, inquiry_id)
    if inquiry is None:
        raise NotFoundError("Inquiry not found")
    if inquiry.status != status:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="inquiry.status_update",
            entity_type="inquiry",
            entity_id=inquiry.id,
            before={"status": inquiry.status},
            after={"status": status},
        )
        inquiry.status = status
    db.commit()
    db.refresh(inquiry)
    return inquiry_dicts(db, [inquiry])[0]


# ---------------------------------------------------------------------------
# Property requests
# ---------------------------------------------------------------------------

def create_property_request(db: Session, data, ip: str | None) -> PropertyRequest:
    check_rate_limit(ip)
    if data.property_type_id is not None and db.get(PropertyType, data.property_type_id) is None:
        raise NotFoundError("Property type not found")
    if data.area_id is not None and db.get(Area, data.area_id) is None:
        raise NotFoundError("Area not found")
    request = PropertyRequest(
        name=data.name.strip(),
        phone=data.phone.strip(),
        purpose=data.purpose,
        property_type_id=data.property_type_id,
        area_id=data.area_id,
        budget_min=data.budget_min,
        budget_max=data.budget_max,
        rooms=data.rooms,
        notes=data.notes,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def list_property_requests(
    db: Session, *, status: str | None = None, cursor: str | None = None, limit: int = 50
) -> dict:
    stmt = select(PropertyRequest)
    if status is not None:
        stmt = stmt.where(PropertyRequest.status == status)
    items, next_cursor = paginate(db, stmt, PropertyRequest, cursor, limit)
    return {"items": items, "next_cursor": next_cursor}


def update_property_request_status(db: Session, request_id: int, status: str, actor_user_id: int) -> PropertyRequest:
    request = db.get(PropertyRequest, request_id)
    if request is None:
        raise NotFoundError("Property request not found")
    if request.status != status:
        audit_service.record(
            db,
            actor_user_id=actor_user_id,
            action="property_request.status_update",
            entity_type="property_request",
            entity_id=request.id,
            before={"status": request.status},
            after={"status": status},
        )
        request.status = status
    db.commit()
    db.refresh(request)
    return request
