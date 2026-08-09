"""Seed permissions, the 4 default roles, the owner user, Kuwait areas,
property types, amenities, site settings, and 12 realistic sample properties.

Run with: python -m app.seed
Idempotent — safe to re-run; existing rows are left alone.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.middleware.security import hash_password
from app.models.auth import Permission, Role, RolePermission, User, UserRole
from app.models.realestate import (
    Amenity,
    AmenityTranslation,
    Area,
    AreaTranslation,
    Banner,
    BannerTranslation,
    Property,
    PropertyAmenity,
    PropertyTranslation,
    PropertyType,
    PropertyTypeTranslation,
)
from app.models.system import Media, Setting
from app.permissions import DEFAULT_ROLES, PERMISSIONS, ROLE_PERMISSIONS
from app.storage import storage
from app.utils import slugify

OWNER_EMAIL = settings.owner_email.strip().lower()
OWNER_PASSWORD = settings.owner_password


# ---------------------------------------------------------------------------
# RBAC + owner
# ---------------------------------------------------------------------------

def seed_permissions(db) -> dict[str, Permission]:
    existing = {p.key: p for p in db.query(Permission).all()}
    for pdef in PERMISSIONS:
        if pdef.key in existing:
            continue
        perm = Permission(
            key=pdef.key, group=pdef.group, description=pdef.description, is_dangerous=pdef.is_dangerous
        )
        db.add(perm)
        existing[pdef.key] = perm
    db.flush()
    return existing


def seed_roles(db) -> dict[str, Role]:
    existing = {r.code: r for r in db.query(Role).all()}
    for rdef in DEFAULT_ROLES:
        if rdef["code"] in existing:
            continue
        role = Role(**rdef)
        db.add(role)
        existing[rdef["code"]] = role
    db.flush()
    return existing


def seed_role_permissions(db, roles: dict[str, Role], permissions: dict[str, Permission]) -> None:
    existing_pairs = {(rp.role_id, rp.permission_id) for rp in db.query(RolePermission).all()}
    now = datetime.now(timezone.utc)
    for role_code, perm_keys in ROLE_PERMISSIONS.items():
        role = roles[role_code]
        for key in perm_keys:
            perm = permissions[key]
            if (role.id, perm.id) in existing_pairs:
                continue
            db.add(RolePermission(role_id=role.id, permission_id=perm.id, granted_at=now))


def seed_owner_user(db, owner_role: Role) -> User:
    user = db.query(User).filter(User.email == OWNER_EMAIL).first()
    if user is not None:
        return user
    if not OWNER_PASSWORD:
        raise RuntimeError("Set OWNER_PASSWORD in .env before running the seed command.")
    user = User(
        email=OWNER_EMAIL,
        password_hash=hash_password(OWNER_PASSWORD),
        full_name="Owner",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(
        UserRole(
            user_id=user.id,
            role_id=owner_role.id,
            granted_at=datetime.now(timezone.utc),
        )
    )
    print(f"Seeded owner user: {OWNER_EMAIL}")
    return user


# ---------------------------------------------------------------------------
# Taxonomy
# ---------------------------------------------------------------------------

AREAS: list[tuple[str, str]] = [
    # (en, ar) — slug is derived from the English name
    ("Kuwait City", "مدينة الكويت"),
    ("Salmiya", "السالمية"),
    ("Hawally", "حولي"),
    ("Sabah Al Salem", "صباح السالم"),
    ("Jabriya", "الجابرية"),
    ("Mangaf", "المنقف"),
    ("Fahaheel", "الفحيحيل"),
    ("Mahboula", "المهبولة"),
    ("Salwa", "سلوى"),
    ("Rumaithiya", "الرميثية"),
    ("Bayan", "بيان"),
    ("Mishref", "مشرف"),
    ("Qortuba", "قرطبة"),
    ("Yarmouk", "اليرموك"),
    ("Khaitan", "خيطان"),
    ("Farwaniya", "الفروانية"),
    ("Jahra", "الجهراء"),
    ("Fintas", "الفنطاس"),
    ("Abu Halifa", "أبو حليفة"),
    ("Egaila", "العقيلة"),
    ("Sabahiya", "الصباحية"),
    ("Qibla", "القبلة"),
    ("Sharq", "شرق"),
    ("Bneid Al-Qar", "بنيد القار"),
    ("Mansouriya", "المنصورية"),
    ("Dasma", "الدسمة"),
    ("Shaab", "الشعب"),
]

PROPERTY_TYPES: list[tuple[str, str, str]] = [
    # (key, en, ar)
    ("villa", "Villa", "فيلا"),
    ("apartment", "Apartment", "شقة"),
    ("floor", "Floor", "دور"),
    ("land", "Land", "أرض"),
    ("office", "Office", "مكتب"),
    ("chalet", "Chalet", "شاليه"),
    ("commercial", "Commercial", "تجاري"),
    ("other", "Other", "أخرى"),
]

AMENITIES: list[tuple[str, str, str]] = [
    # (key, en, ar)
    ("private_entrance", "Private entrance", "مدخل خاص"),
    ("maids_room", "Maid's room", "غرفة خادمة"),
    ("driver_room", "Driver's room", "غرفة سائق"),
    ("large_hall", "Large hall", "صالة كبيرة"),
    ("two_entrances", "Two entrances", "مدخلان"),
    ("storage", "Storage", "مخزن"),
    ("new_finish", "New finish", "تشطيب جديد"),
    ("central_ac", "Central A/C", "تكييف مركزي"),
    ("balcony", "Balcony", "بلكونة"),
    ("elevator", "Elevator", "مصعد"),
    ("parking", "Parking", "موقف سيارات"),
    ("garden", "Garden", "حديقة"),
    ("swimming_pool", "Swimming pool", "مسبح"),
    ("sea_view", "Sea view", "إطلالة بحرية"),
    ("furnished", "Furnished", "مفروش"),
    ("basement", "Basement", "سرداب"),
]

SETTINGS: list[tuple[str, str]] = [
    ("site.phone", "+965 22405060"),
    ("site.whatsapp", "+965 99887766"),
    ("site.email", "info@kwt25.com"),
    ("site.instagram", "kwt25_realestate"),
    ("site.name_ar", "Kwt25"),
    ("site.name_en", "Kwt25"),
]


def seed_areas(db) -> dict[str, Area]:
    existing = {a.slug: a for a in db.query(Area).all()}
    for sort_order, (en, ar) in enumerate(AREAS):
        slug = slugify(en)
        if slug in existing:
            continue
        area = Area(slug=slug, sort_order=sort_order, is_active=True)
        db.add(area)
        db.flush()
        db.add(AreaTranslation(area_id=area.id, locale="en", name=en))
        db.add(AreaTranslation(area_id=area.id, locale="ar", name=ar))
        existing[slug] = area
    db.flush()
    return existing


def seed_property_types(db) -> dict[str, PropertyType]:
    existing = {t.key: t for t in db.query(PropertyType).all()}
    for sort_order, (key, en, ar) in enumerate(PROPERTY_TYPES):
        if key in existing:
            continue
        ptype = PropertyType(key=key, slug=slugify(en), sort_order=sort_order, is_active=True)
        db.add(ptype)
        db.flush()
        db.add(PropertyTypeTranslation(property_type_id=ptype.id, locale="en", name=en))
        db.add(PropertyTypeTranslation(property_type_id=ptype.id, locale="ar", name=ar))
        existing[key] = ptype
    db.flush()
    return existing


def seed_amenities(db) -> dict[str, Amenity]:
    existing = {a.key: a for a in db.query(Amenity).all()}
    for sort_order, (key, en, ar) in enumerate(AMENITIES):
        if key in existing:
            continue
        amenity = Amenity(key=key, sort_order=sort_order, is_active=True)
        db.add(amenity)
        db.flush()
        db.add(AmenityTranslation(amenity_id=amenity.id, locale="en", name=en))
        db.add(AmenityTranslation(amenity_id=amenity.id, locale="ar", name=ar))
        existing[key] = amenity
    db.flush()
    return existing


def seed_settings(db) -> None:
    now = datetime.now(timezone.utc)
    for key, value in SETTINGS:
        if db.get(Setting, key) is None:
            db.add(Setting(key=key, value=value, group="site", is_public=True, updated_at=now))


# ---------------------------------------------------------------------------
# Home-page banners
# ---------------------------------------------------------------------------

SEED_ASSETS = Path(__file__).resolve().parent.parent / "seed_assets"

# The office's launch artwork. Seeded exactly like areas or property types:
# the row exists so the site has something to show on day one, and from then
# on it belongs to the admin panel — nothing here is re-applied on re-runs.
BANNERS: list[dict] = [
    {
        "file": "01-smart-search.jpeg",
        "mime": "image/jpeg",
        "href": "/smart-search",
        "alt_ar": "لا تبحث بين العقارات… خلّ عقارك المناسب يوصلك — البحث الذكي",
        "alt_en": "Stop scrolling listings — let smart search bring the right property to you",
    },
]


def seed_banners(db, owner: User) -> None:
    if db.execute(select(Banner.id).limit(1)).scalar_one_or_none() is not None:
        return  # already seeded — never overwrite what staff have since edited

    for order, spec in enumerate(BANNERS):
        source = SEED_ASSETS / spec["file"]
        if not source.exists():
            print(f"Skipped banner {spec['file']}: asset missing.")
            continue

        data = source.read_bytes()
        now = datetime.now(timezone.utc)
        # Same storage path convention as a real admin upload, so a seeded
        # banner is indistinguishable from one the office uploads later.
        key = storage.build_key(f"{now:%Y}/{now:%m}", f"{uuid4().hex}.jpg")
        storage.save_bytes(key, data)

        media = Media(
            storage_key=key,
            original_filename=spec["file"],
            mime_type=spec["mime"],
            bytes=len(data),
            checksum_sha256=hashlib.sha256(data).hexdigest(),
            uploaded_by_user_id=owner.id,
        )
        db.add(media)
        db.flush()

        banner = Banner(
            media_id=media.id,
            href=spec["href"],
            sort_order=order,
            is_active=True,
            created_by=owner.id,
        )
        db.add(banner)
        db.flush()
        db.add(BannerTranslation(banner_id=banner.id, locale="ar", alt_text=spec["alt_ar"]))
        db.add(BannerTranslation(banner_id=banner.id, locale="en", alt_text=spec["alt_en"]))

    print(f"Seeded {len(BANNERS)} banner(s).")


# ---------------------------------------------------------------------------
# Sample properties
# ---------------------------------------------------------------------------

PROPERTIES: list[dict] = [
    {
        "purpose": "rent",
        "type": "apartment",
        "area": "salmiya",
        "block": "10",
        "price": "450.000",
        "rooms": 2,
        "bathrooms": 2,
        "floors": None,
        "area_sqm": "110.00",
        "lat": "29.333600",
        "lng": "48.076400",
        "featured": True,
        "premium": True,
        "amenities": ["central_ac", "elevator", "parking", "balcony", "new_finish"],
        "title_en": "Modern 2BR Apartment in Salmiya",
        "title_ar": "شقة حديثة غرفتين في السالمية",
        "desc_en": "Bright two-bedroom apartment on a high floor in the heart of Salmiya, "
        "minutes from the Gulf Road and Marina Mall. New finish, central A/C, "
        "covered parking and building elevator.",
        "desc_ar": "شقة مضيئة من غرفتين في دور مرتفع في قلب السالمية، على بعد دقائق من "
        "شارع الخليج ومارينا مول. تشطيب جديد وتكييف مركزي وموقف مظلل ومصعد.",
    },
    {
        "purpose": "rent",
        "type": "apartment",
        "area": "mahboula",
        "block": "2",
        "price": "280.000",
        "rooms": 1,
        "bathrooms": 1,
        "floors": None,
        "area_sqm": "65.00",
        "lat": "29.144800",
        "lng": "48.130900",
        "featured": False,
        "premium": False,
        "amenities": ["central_ac", "elevator", "furnished"],
        "title_en": "Furnished 1BR Apartment in Mahboula",
        "title_ar": "شقة مفروشة غرفة واحدة في المهبولة",
        "desc_en": "Fully furnished one-bedroom apartment near the coastal road in Mahboula. "
        "Ideal for singles or couples, ready to move in.",
        "desc_ar": "شقة مفروشة بالكامل من غرفة واحدة قرب الطريق الساحلي في المهبولة. "
        "مثالية للعزاب أو المتزوجين، جاهزة للسكن فوراً.",
    },
    {
        "purpose": "rent",
        "type": "floor",
        "area": "jabriya",
        "block": "7",
        "price": "650.000",
        "rooms": 3,
        "bathrooms": 2,
        "floors": 1,
        "area_sqm": "220.00",
        "lat": "29.316300",
        "lng": "48.018900",
        "featured": True,
        "premium": False,
        "amenities": ["private_entrance", "large_hall", "central_ac", "maids_room"],
        "title_en": "Spacious Full Floor in Jabriya",
        "title_ar": "دور كامل واسع في الجابرية",
        "desc_en": "Full floor with private entrance in a quiet Jabriya block: three bedrooms, "
        "a large hall, maid's room and central A/C. Close to schools and hospitals.",
        "desc_ar": "دور كامل بمدخل خاص في قطعة هادئة من الجابرية: ثلاث غرف نوم وصالة كبيرة "
        "وغرفة خادمة وتكييف مركزي. قريب من المدارس والمستشفيات.",
    },
    {
        "purpose": "rent",
        "type": "villa",
        "area": "mishref",
        "block": "4",
        "price": "1200.000",
        "rooms": 5,
        "bathrooms": 4,
        "floors": 2,
        "area_sqm": "400.00",
        "lat": "29.278300",
        "lng": "48.066900",
        "featured": True,
        "premium": True,
        "amenities": ["garden", "swimming_pool", "maids_room", "driver_room", "central_ac", "parking", "two_entrances"],
        "title_en": "Luxury 5BR Villa with Pool in Mishref",
        "title_ar": "فيلا فاخرة 5 غرف مع مسبح في مشرف",
        "desc_en": "Standalone two-storey villa in Mishref with a private garden and pool, "
        "five bedrooms, maid's and driver's rooms, and parking for three cars.",
        "desc_ar": "فيلا مستقلة من دورين في مشرف مع حديقة خاصة ومسبح وخمس غرف نوم "
        "وغرفتي خادمة وسائق ومواقف لثلاث سيارات.",
    },
    {
        "purpose": "rent",
        "type": "office",
        "area": "sharq",
        "block": "1",
        "price": "850.000",
        "rooms": None,
        "bathrooms": 1,
        "floors": None,
        "area_sqm": "150.00",
        "lat": "29.380500",
        "lng": "47.993200",
        "featured": False,
        "premium": False,
        "amenities": ["central_ac", "elevator", "parking", "new_finish"],
        "title_en": "Sea-View Office in Sharq",
        "title_ar": "مكتب بإطلالة بحرية في شرق",
        "desc_en": "150 sqm open-plan office on a high floor in a Sharq tower with sea view, "
        "new finish and basement parking. Suitable for a company headquarters.",
        "desc_ar": "مكتب مفتوح بمساحة 150 متر مربع في دور مرتفع في أحد أبراج شرق بإطلالة "
        "بحرية وتشطيب جديد ومواقف في السرداب. مناسب لمقر شركة.",
    },
    {
        "purpose": "rent",
        "type": "chalet",
        "area": "khaitan",
        "block": "3",
        "price": "500.000",
        "rooms": 2,
        "bathrooms": 2,
        "floors": 1,
        "area_sqm": "180.00",
        "lat": None,
        "lng": None,
        "featured": False,
        "premium": False,
        "amenities": ["swimming_pool", "garden", "furnished"],
        "title_en": "Weekend Chalet with Private Pool",
        "title_ar": "شاليه للعطلات مع مسبح خاص",
        "desc_en": "Furnished two-bedroom chalet with a private pool and garden seating area. "
        "Available for long-term monthly rent.",
        "desc_ar": "شاليه مفروش من غرفتين مع مسبح خاص وجلسة حديقة. متاح للإيجار الشهري "
        "طويل الأمد.",
    },
    {
        "purpose": "sale",
        "type": "apartment",
        "area": "sabah-al-salem",
        "block": "12",
        "price": "65000.000",
        "rooms": 3,
        "bathrooms": 2,
        "floors": None,
        "area_sqm": "130.00",
        "lat": "29.257000",
        "lng": "48.077800",
        "featured": False,
        "premium": False,
        "amenities": ["central_ac", "elevator", "balcony", "storage"],
        "title_en": "3BR Apartment for Sale in Sabah Al Salem",
        "title_ar": "شقة 3 غرف للبيع في صباح السالم",
        "desc_en": "Well-maintained three-bedroom apartment with a balcony and storage room "
        "in a family building in Sabah Al Salem. Clear title, ready to transfer.",
        "desc_ar": "شقة ثلاث غرف بحالة ممتازة مع بلكونة ومخزن في عمارة عائلية في صباح "
        "السالم. سند نظيف وجاهزة للنقل.",
    },
    {
        "purpose": "sale",
        "type": "villa",
        "area": "qortuba",
        "block": "2",
        "price": "450000.000",
        "rooms": 6,
        "bathrooms": 5,
        "floors": 3,
        "area_sqm": "500.00",
        "lat": "29.301500",
        "lng": "47.994800",
        "featured": True,
        "premium": True,
        "amenities": ["private_entrance", "two_entrances", "maids_room", "driver_room", "large_hall", "central_ac", "garden", "basement"],
        "title_en": "Prestigious 6BR Villa in Qortuba",
        "title_ar": "فيلا فخمة 6 غرف في قرطبة",
        "desc_en": "Three-storey family villa on a 500 sqm corner plot in Qortuba: six bedrooms, "
        "basement, garden and two separate entrances. A rare listing in this block.",
        "desc_ar": "فيلا عائلية من ثلاثة أدوار على قسيمة زاوية 500 متر مربع في قرطبة: ست غرف "
        "نوم وسرداب وحديقة ومدخلان منفصلان. عرض نادر في هذه القطعة.",
    },
    {
        "purpose": "sale",
        "type": "land",
        "area": "jahra",
        "block": "5",
        "price": "185000.000",
        "rooms": None,
        "bathrooms": None,
        "floors": None,
        "area_sqm": "600.00",
        "lat": "29.336900",
        "lng": "47.678100",
        "featured": False,
        "premium": False,
        "amenities": [],
        "title_en": "600 sqm Residential Plot in Jahra",
        "title_ar": "قسيمة سكنية 600 متر في الجهراء",
        "desc_en": "Flat residential plot of 600 sqm on an internal street in Jahra, "
        "close to services and ready for building permits.",
        "desc_ar": "قسيمة سكنية مستوية بمساحة 600 متر مربع على شارع داخلي في الجهراء، "
        "قريبة من الخدمات وجاهزة لاستخراج تراخيص البناء.",
    },
    {
        "purpose": "sale",
        "type": "floor",
        "area": "bayan",
        "block": "8",
        "price": "120000.000",
        "rooms": 4,
        "bathrooms": 3,
        "floors": 1,
        "area_sqm": "250.00",
        "lat": "29.303900",
        "lng": "48.048800",
        "featured": False,
        "premium": True,
        "amenities": ["private_entrance", "large_hall", "central_ac", "new_finish", "parking"],
        "title_en": "Deluxe Floor with Private Entrance in Bayan",
        "title_ar": "دور ديلوكس بمدخل خاص في بيان",
        "desc_en": "Newly finished 250 sqm floor with a private entrance in Bayan: "
        "four bedrooms, a large hall and dedicated parking.",
        "desc_ar": "دور بتشطيب جديد بمساحة 250 متر مربع بمدخل خاص في بيان: أربع غرف نوم "
        "وصالة كبيرة وموقف خاص.",
    },
    {
        "purpose": "sale",
        "type": "commercial",
        "area": "fahaheel",
        "block": "1",
        "price": "320000.000",
        "rooms": None,
        "bathrooms": 2,
        "floors": 2,
        "area_sqm": "300.00",
        "lat": "29.082500",
        "lng": "48.130300",
        "featured": False,
        "premium": False,
        "amenities": ["two_entrances", "storage", "central_ac"],
        "title_en": "Commercial Building near Fahaheel Souq",
        "title_ar": "مبنى تجاري قرب سوق الفحيحيل",
        "desc_en": "Two-storey commercial building with two street entrances a short walk "
        "from Fahaheel souq and the seafront. Currently split into four rented units.",
        "desc_ar": "مبنى تجاري من دورين بمدخلين على الشارع على بعد خطوات من سوق الفحيحيل "
        "والواجهة البحرية. مقسم حالياً إلى أربع وحدات مؤجرة.",
    },
    {
        "purpose": "rent",
        "type": "apartment",
        "area": "bneid-al-qar",
        "block": "1",
        "price": "550.000",
        "rooms": 2,
        "bathrooms": 2,
        "floors": None,
        "area_sqm": "95.00",
        "lat": "29.371700",
        "lng": "48.001400",
        "featured": True,
        "premium": False,
        "amenities": ["sea_view", "central_ac", "elevator", "parking", "balcony"],
        "title_en": "Sea-View 2BR in Bneid Al-Qar",
        "title_ar": "شقة غرفتين بإطلالة بحرية في بنيد القار",
        "desc_en": "Two-bedroom apartment with a direct sea view from the balcony, "
        "steps from the Gulf Road in Bneid Al-Qar. Building has gym and elevator.",
        "desc_ar": "شقة من غرفتين بإطلالة بحرية مباشرة من البلكونة، على بعد خطوات من شارع "
        "الخليج في بنيد القار. المبنى يضم صالة رياضية ومصعد.",
    },
]


def seed_properties(db, owner: User, areas: dict[str, Area], types: dict[str, PropertyType], amenities: dict[str, Amenity]) -> None:
    if db.execute(select(Property.id).limit(1)).scalar_one_or_none() is not None:
        return  # already seeded
    year = datetime.now(timezone.utc).year
    now = datetime.now(timezone.utc)
    for i, spec in enumerate(PROPERTIES, start=1):
        prop = Property(
            ref_no=f"KW-{year}-{i:04d}",
            purpose=spec["purpose"],
            status="available",
            property_type_id=types[spec["type"]].id,
            area_id=areas[spec["area"]].id,
            block=spec["block"],
            price=Decimal(spec["price"]),
            rooms=spec["rooms"],
            bathrooms=spec["bathrooms"],
            floors=spec["floors"],
            area_sqm=Decimal(spec["area_sqm"]) if spec["area_sqm"] else None,
            latitude=Decimal(spec["lat"]) if spec["lat"] else None,
            longitude=Decimal(spec["lng"]) if spec["lng"] else None,
            is_featured=spec["featured"],
            is_premium=spec["premium"],
            is_active=True,
            published_at=now,
            created_by=owner.id,
        )
        db.add(prop)
        db.flush()
        db.add(
            PropertyTranslation(
                property_id=prop.id,
                locale="en",
                title=spec["title_en"],
                slug=slugify(spec["title_en"]),
                description=spec["desc_en"],
            )
        )
        db.add(
            PropertyTranslation(
                property_id=prop.id,
                locale="ar",
                title=spec["title_ar"],
                slug=slugify(spec["title_ar"], locale="ar"),
                description=spec["desc_ar"],
            )
        )
        for key in spec["amenities"]:
            db.add(PropertyAmenity(property_id=prop.id, amenity_id=amenities[key].id))
    print(f"Seeded {len(PROPERTIES)} sample properties.")


def run() -> None:
    db = SessionLocal()
    try:
        permissions = seed_permissions(db)
        roles = seed_roles(db)
        seed_role_permissions(db, roles, permissions)
        owner = seed_owner_user(db, roles["owner"])
        areas = seed_areas(db)
        types = seed_property_types(db)
        amenities = seed_amenities(db)
        seed_settings(db)
        seed_banners(db, owner)
        seed_properties(db, owner, areas, types, amenities)
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
