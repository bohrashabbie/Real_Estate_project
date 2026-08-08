from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    TIMESTAMP,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, TimestampMixin

# Postgres ENUM types, shared between columns where the value set is the same.
PropertyPurpose = Enum("rent", "sale", name="property_purpose")
PropertyStatus = Enum("available", "rented", "sold", "reserved", name="property_status")
InquirySource = Enum("property", "contact", "home", name="inquiry_source")
InquiryStatus = Enum("new", "contacted", "closed", name="inquiry_status")
RequestStatus = Enum("new", "in_progress", "matched", "closed", name="request_status")


class Area(Base, TimestampMixin):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    slug: Mapped[str] = mapped_column(nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    translations: Mapped[list["AreaTranslation"]] = relationship(
        back_populates="area", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_areas_is_active", "is_active"),)


class AreaTranslation(Base, TimestampMixin):
    __tablename__ = "area_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id", ondelete="CASCADE"), nullable=False)
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)

    area: Mapped["Area"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("area_id", "locale", name="uq_area_translations_area_locale"),
    )


class PropertyType(Base, TimestampMixin):
    __tablename__ = "property_types"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    key: Mapped[str] = mapped_column(nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    translations: Mapped[list["PropertyTypeTranslation"]] = relationship(
        back_populates="property_type", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_property_types_is_active", "is_active"),)


class PropertyTypeTranslation(Base, TimestampMixin):
    __tablename__ = "property_type_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    property_type_id: Mapped[int] = mapped_column(
        ForeignKey("property_types.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)

    property_type: Mapped["PropertyType"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("property_type_id", "locale", name="uq_property_type_translations_type_locale"),
    )


class Amenity(Base, TimestampMixin):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    key: Mapped[str] = mapped_column(nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    translations: Mapped[list["AmenityTranslation"]] = relationship(
        back_populates="amenity", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_amenities_is_active", "is_active"),)


class AmenityTranslation(Base, TimestampMixin):
    __tablename__ = "amenity_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    amenity_id: Mapped[int] = mapped_column(ForeignKey("amenities.id", ondelete="CASCADE"), nullable=False)
    locale: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)

    amenity: Mapped["Amenity"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("amenity_id", "locale", name="uq_amenity_translations_amenity_locale"),
    )


class Property(Base, TimestampMixin):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ref_no: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    purpose: Mapped[str] = mapped_column(PropertyPurpose, nullable=False)
    status: Mapped[str] = mapped_column(PropertyStatus, nullable=False, default="available")
    property_type_id: Mapped[int] = mapped_column(ForeignKey("property_types.id"), nullable=False)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), nullable=False)
    block: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_note: Mapped[str | None] = mapped_column(nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    rooms: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    floors: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    published_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    translations: Mapped[list["PropertyTranslation"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    media_links: Mapped[list["PropertyMedia"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    amenity_links: Mapped[list["PropertyAmenity"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_properties_purpose", "purpose"),
        Index("ix_properties_status", "status"),
        Index("ix_properties_property_type_id", "property_type_id"),
        Index("ix_properties_area_id", "area_id"),
        Index("ix_properties_is_active", "is_active"),
        Index("ix_properties_published_at", "published_at"),
        Index("ix_properties_created_at", "created_at"),
    )


class PropertyTranslation(Base, TimestampMixin):
    __tablename__ = "property_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    locale: Mapped[str] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    property: Mapped["Property"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("property_id", "locale", name="uq_property_translations_property_locale"),
        UniqueConstraint("locale", "slug", name="uq_property_translations_locale_slug"),
    )


class PropertyMedia(Base):
    __tablename__ = "property_media"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_main: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    property: Mapped["Property"] = relationship(back_populates="media_links")

    __table_args__ = (Index("ix_property_media_property_id", "property_id"),)


class PropertyAmenity(Base):
    __tablename__ = "property_amenities"

    property_id: Mapped[int] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    amenity_id: Mapped[int] = mapped_column(
        ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True
    )

    property: Mapped["Property"] = relationship(back_populates="amenity_links")


class Banner(Base, TimestampMixin):
    """A home-page hero slide, managed from the admin panel.

    The artwork carries its own baked-in headline, which is why the image
    itself is translatable: `media_id` here is the fallback used for every
    locale, and a translation row may override it with locale-specific
    artwork. Alt text is always per-locale — these are content images.
    """

    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id"), nullable=False)
    # Internal path such as "/smart-search" or an absolute URL. NULL = the
    # slide is not clickable.
    href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Optional scheduling window; NULL on either side means "no bound".
    starts_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    translations: Mapped[list["BannerTranslation"]] = relationship(
        back_populates="banner", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_banners_is_active", "is_active"),
        Index("ix_banners_sort_order", "sort_order"),
    )


class BannerTranslation(Base, TimestampMixin):
    __tablename__ = "banner_translations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    banner_id: Mapped[int] = mapped_column(
        ForeignKey("banners.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(nullable=False)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    # Locale-specific artwork. NULL falls back to Banner.media_id, so a site
    # with one bilingual image never has to upload it twice.
    media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)

    banner: Mapped["Banner"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("banner_id", "locale", name="uq_banner_translations_banner_locale"),
    )


class Inquiry(Base, CreatedAtMixin):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id"), nullable=True)
    name: Mapped[str] = mapped_column(nullable=False)
    phone: Mapped[str] = mapped_column(nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(InquirySource, nullable=False)
    status: Mapped[str] = mapped_column(InquiryStatus, nullable=False, default="new")

    __table_args__ = (
        Index("ix_inquiries_property_id", "property_id"),
        Index("ix_inquiries_status", "status"),
        Index("ix_inquiries_created_at", "created_at"),
    )


class PropertyRequest(Base, CreatedAtMixin):
    """The public "Request your property" form."""

    __tablename__ = "property_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    phone: Mapped[str] = mapped_column(nullable=False)
    purpose: Mapped[str | None] = mapped_column(PropertyPurpose, nullable=True)
    property_type_id: Mapped[int | None] = mapped_column(ForeignKey("property_types.id"), nullable=True)
    area_id: Mapped[int | None] = mapped_column(ForeignKey("areas.id"), nullable=True)
    budget_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    rooms: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(RequestStatus, nullable=False, default="new")

    __table_args__ = (
        Index("ix_property_requests_status", "status"),
        Index("ix_property_requests_created_at", "created_at"),
    )
