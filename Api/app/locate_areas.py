"""Look up every area's centre and radius on OpenStreetMap, once.

    python -m app.locate_areas            # only areas not located yet
    python -m app.locate_areas --refresh  # all of them again

Fills `areas.latitude/longitude/radius_m`, which both maps use to fly to an
area and shade it when it is picked. One request a second (the lookup
service's rule), so ~160 areas take about three minutes. Safe to re-run: by
default it skips areas that already have a location. Touches nothing but
those three columns.
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from app.database import SessionLocal
from app.middleware.error import AppError
from app.models.realestate import Area
from app.services import geocode_service


def run(refresh: bool = False) -> None:
    db = SessionLocal()
    try:
        stmt = select(Area.id).where(Area.is_active.is_(True)).order_by(Area.sort_order, Area.id)
        if not refresh:
            stmt = stmt.where(Area.latitude.is_(None))
        ids = list(db.execute(stmt).scalars())
        found = missing = 0
        for number, area_id in enumerate(ids, start=1):
            try:
                result = geocode_service.area_location(db, area_id, refresh=refresh)
            except AppError as exc:
                print(f"[{number}/{len(ids)}] area {area_id}: lookup failed ({exc})")
                missing += 1
                continue
            if result["found"]:
                found += 1
                print(f"[{number}/{len(ids)}] {result['label']}: {result['lat']}, {result['lng']} r={result['radius_m']}m")
            else:
                missing += 1
                print(f"[{number}/{len(ids)}] area {area_id}: not found on the map")
        print(f"Located {found} area(s); {missing} without a location.")
    finally:
        db.close()


if __name__ == "__main__":
    run(refresh="--refresh" in sys.argv)
