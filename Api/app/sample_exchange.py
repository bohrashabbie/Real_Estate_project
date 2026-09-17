"""One-off sample data for the "exchange" purpose and the home advert band.

    python -m app.sample_exchange

Adds five published "for exchange" (للبدل) listings and, when the advert band
is still empty, two `home_ad` banners -- so the new For exchange page, the
home page's exchange row and the advert band all have something to show the
day they ship. From then on they belong to the admin panel like any other row.

Deliberately *not* part of `app.seed`: that module also seeds settings, and
this runs against a live database whose settings the office has already
edited. Nothing here touches a setting, and every write is idempotent --
listings are keyed by `ref_no`, the adverts by "is the band still empty" --
so running it twice changes nothing the second time.

No new artwork: each listing and advert reuses a photo already uploaded for
an existing listing of the same property type, so the samples look like the
catalogue they sit in.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.realestate import (
    Amenity,
    Area,
    Banner,
    BannerTranslation,
    Property,
    PropertyAmenity,
    PropertyMedia,
    PropertyTranslation,
    PropertyType,
)
from app.services import audit_service
from app.utils import slugify

EXCHANGE: list[dict] = [
    {
        "ref_no": "KW-EX-0001",
        "type": "villa",
        "area": "mishref",
        "price": "420000",
        "rooms": 6,
        "bathrooms": 5,
        "area_sqm": "450.00",
        "lat": "29.275000",
        "lng": "48.058000",
        "featured": True,
        "amenities": ["garden", "maids_room", "driver_room", "parking"],
        "title_en": "6BR Villa in Mishref for Exchange",
        "title_ar": "فيلا ٦ غرف في مشرف للبدل",
        "desc_en": "Corner villa on two floors with a garden, maid's and driver's rooms. "
        "The owner is offering it in exchange for a villa in Qortuba or Surra.",
        "desc_ar": "فيلا زاوية من دورين مع حديقة وغرفتي خادمة وسائق. "
        "المالك يعرضها للبدل مع فيلا في قرطبة أو السرة.",
    },
    {
        "ref_no": "KW-EX-0002",
        "type": "apartment",
        "area": "salmiya",
        "price": "95000",
        "rooms": 3,
        "bathrooms": 2,
        "area_sqm": "140.00",
        "lat": "29.337000",
        "lng": "48.076000",
        "featured": False,
        "amenities": ["sea_view", "elevator", "central_ac"],
        "title_en": "Sea-View 3BR Apartment in Salmiya for Exchange",
        "title_ar": "شقة ٣ غرف بإطلالة بحرية في السالمية للبدل",
        "desc_en": "Third-floor apartment with a sea view and central A/C, offered in "
        "exchange for a larger apartment in Jabriya or Hawally.",
        "desc_ar": "شقة في الدور الثالث بإطلالة بحرية وتكييف مركزي، معروضة للبدل مع "
        "شقة أكبر في الجابرية أو حولي.",
    },
    {
        "ref_no": "KW-EX-0003",
        "type": "floor",
        "area": "jabriya",
        "price": "180000",
        "rooms": 4,
        "bathrooms": 3,
        "area_sqm": "300.00",
        "lat": "29.315000",
        "lng": "48.028000",
        "featured": True,
        "amenities": ["private_entrance", "large_hall", "parking"],
        "title_en": "Full Floor in Jabriya for Exchange",
        "title_ar": "دور كامل في الجابرية للبدل",
        "desc_en": "Full floor with a private entrance and a large hall, offered in "
        "exchange for a floor or small villa in Mishref.",
        "desc_ar": "دور كامل بمدخل خاص وصالة كبيرة، معروض للبدل مع دور أو فيلا صغيرة في مشرف.",
    },
    {
        "ref_no": "KW-EX-0004",
        "type": "villa",
        "area": "qortuba",
        "price": "390000",
        "rooms": 5,
        "bathrooms": 4,
        "area_sqm": "400.00",
        "lat": "29.314000",
        "lng": "47.987000",
        "featured": False,
        "amenities": ["basement", "maids_room", "new_finish"],
        "title_en": "Renovated 5BR Villa in Qortuba for Exchange",
        "title_ar": "فيلا ٥ غرف مجددة في قرطبة للبدل",
        "desc_en": "Newly finished villa with a basement and maid's room. The owner "
        "would exchange it for a villa closer to the sea.",
        "desc_ar": "فيلا بتشطيب جديد مع سرداب وغرفة خادمة. المالك يرغب بالبدل مع فيلا "
        "أقرب إلى البحر.",
    },
    {
        "ref_no": "KW-EX-0005",
        "type": "apartment",
        "area": "kuwait-city",
        "price": "120000",
        "rooms": 2,
        "bathrooms": 2,
        "area_sqm": "110.00",
        "lat": "29.375900",
        "lng": "47.977400",
        "featured": False,
        "amenities": ["elevator", "balcony", "furnished"],
        "title_en": "Furnished 2BR in Kuwait City for Exchange",
        "title_ar": "شقة غرفتين مفروشة في مدينة الكويت للبدل",
        "desc_en": "Furnished two-bedroom apartment with a balcony, offered in exchange "
        "for a similar apartment in Salmiya.",
        "desc_ar": "شقة غرفتين مفروشة مع بلكونة، معروضة للبدل مع شقة مماثلة في السالمية.",
    },
]

ADVERTS: list[dict] = [
    {
        "type": "villa",
        "href": "/properties?type=villa",
        "alt_en": "Villas across Kuwait",
        "alt_ar": "فلل في جميع مناطق الكويت",
    },
    {
        "type": "apartment",
        "href": "/properties?type=apartment",
        "alt_en": "Apartments across Kuwait",
        "alt_ar": "شقق في جميع مناطق الكويت",
    },
]


def _photo_for(db, type_id: int | None) -> int | None:
    """The main photo of an existing listing of this type, else any photo."""
    stmt = (
        select(PropertyMedia.media_id)
        .join(Property, Property.id == PropertyMedia.property_id)
        .where(Property.purpose != "exchange")
        .order_by(PropertyMedia.is_main.desc(), Property.id, PropertyMedia.sort_order)
    )
    if type_id is not None:
        found = db.execute(stmt.where(Property.property_type_id == type_id).limit(1)).scalar()
        if found:
            return found
    return db.execute(stmt.limit(1)).scalar()


def add_exchange_listings(db) -> int:
    areas = {a.slug: a for a in db.execute(select(Area)).scalars()}
    types = {t.key: t for t in db.execute(select(PropertyType)).scalars()}
    amenities = {a.key: a for a in db.execute(select(Amenity)).scalars()}
    now = datetime.now(timezone.utc)
    added = 0

    for spec in EXCHANGE:
        if db.execute(select(Property.id).where(Property.ref_no == spec["ref_no"])).scalar():
            continue
        area = areas.get(spec["area"])
        ptype = types.get(spec["type"])
        if area is None or ptype is None:
            print(f"Skipped {spec['ref_no']}: area or type missing.")
            continue

        prop = Property(
            ref_no=spec["ref_no"],
            purpose="exchange",
            status="available",
            property_type_id=ptype.id,
            area_id=area.id,
            price=Decimal(spec["price"]),
            rooms=spec["rooms"],
            bathrooms=spec["bathrooms"],
            area_sqm=Decimal(spec["area_sqm"]),
            latitude=Decimal(spec["lat"]),
            longitude=Decimal(spec["lng"]),
            is_featured=spec["featured"],
            is_vip=False,
            is_premium=False,
            is_active=True,
            published_at=now,
        )
        db.add(prop)
        db.flush()
        db.add(PropertyTranslation(property_id=prop.id, locale="en", title=spec["title_en"],
                                   slug=slugify(spec["title_en"]), description=spec["desc_en"]))
        db.add(PropertyTranslation(property_id=prop.id, locale="ar", title=spec["title_ar"],
                                   slug=slugify(spec["title_ar"], locale="ar"), description=spec["desc_ar"]))
        photo = _photo_for(db, ptype.id)
        if photo:
            db.add(PropertyMedia(property_id=prop.id, media_id=photo, sort_order=0, is_main=True))
        for key in spec["amenities"]:
            if key in amenities:
                db.add(PropertyAmenity(property_id=prop.id, amenity_id=amenities[key].id))

        audit_service.record(
            db,
            actor_user_id=None,
            actor_type="system",
            action="property.create",
            entity_type="property",
            entity_id=prop.id,
            after={"ref_no": prop.ref_no, "purpose": "exchange", "source": "app.sample_exchange"},
        )
        added += 1
    return added


def add_home_adverts(db) -> int:
    if db.execute(select(Banner.id).where(Banner.placement == "home_ad").limit(1)).scalar():
        return 0
    types = {t.key: t for t in db.execute(select(PropertyType)).scalars()}
    added = 0
    for order, spec in enumerate(ADVERTS):
        ptype = types.get(spec["type"])
        photo = _photo_for(db, ptype.id if ptype else None)
        if not photo:
            print(f"Skipped advert {spec['href']}: no photo to reuse.")
            continue
        banner = Banner(media_id=photo, placement="home_ad", href=spec["href"],
                        sort_order=order, is_active=True)
        db.add(banner)
        db.flush()
        db.add(BannerTranslation(banner_id=banner.id, locale="ar", alt_text=spec["alt_ar"]))
        db.add(BannerTranslation(banner_id=banner.id, locale="en", alt_text=spec["alt_en"]))
        audit_service.record(
            db,
            actor_user_id=None,
            actor_type="system",
            action="banner.create",
            entity_type="banner",
            entity_id=banner.id,
            after={"placement": "home_ad", "href": spec["href"], "source": "app.sample_exchange"},
        )
        added += 1
    return added


def run() -> None:
    db = SessionLocal()
    try:
        listings = add_exchange_listings(db)
        adverts = add_home_adverts(db)
        db.commit()
        print(f"Added {listings} exchange listing(s) and {adverts} home advert(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
