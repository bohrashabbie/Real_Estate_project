from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.realestate import Inquiry, Property, PropertyRequest
from app.services import inquiry_service


def dashboard(db: Session) -> dict:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active = Property.is_active.is_(True)

    total = db.execute(select(func.count()).select_from(Property).where(active)).scalar_one()
    published = db.execute(
        select(func.count()).select_from(Property).where(active, Property.published_at.isnot(None))
    ).scalar_one()
    available = db.execute(
        select(func.count()).select_from(Property).where(active, Property.status == "available")
    ).scalar_one()
    purpose_counts = dict(
        db.execute(
            select(Property.purpose, func.count()).where(active).group_by(Property.purpose)
        ).all()
    )
    new_inquiries_7d = db.execute(
        select(func.count()).select_from(Inquiry).where(Inquiry.created_at >= week_ago)
    ).scalar_one()
    new_requests_7d = db.execute(
        select(func.count()).select_from(PropertyRequest).where(PropertyRequest.created_at >= week_ago)
    ).scalar_one()
    recent = list(
        db.execute(
            select(Inquiry).order_by(Inquiry.created_at.desc(), Inquiry.id.desc()).limit(5)
        ).scalars().all()
    )

    # Shape fixed by the admin frontend contract.
    return {
        "properties_total": total,
        "properties_published": published,
        "properties_available": available,
        "by_purpose": [
            {"purpose": purpose, "count": purpose_counts.get(purpose, 0)}
            for purpose in ("rent", "sale")
        ],
        "new_inquiries_7d": new_inquiries_7d,
        "new_requests_7d": new_requests_7d,
        "recent_inquiries": inquiry_service.inquiry_dicts(db, recent),
    }
