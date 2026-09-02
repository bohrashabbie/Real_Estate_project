import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CircleCheck,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import {
  decodeSlugParam,
  getProperties,
  getProperty,
  getSettings,
  mediaUrl,
  type PropertyDetail,
} from "@/lib/api";
import { formatPrice, formatSqm, telLink, waLink } from "@/lib/format";
import { kuwaitFinderUrl } from "@/lib/kuwait-finder";
import { InquiryForm } from "@/components/property/inquiry-form";
import { PropertyMap } from "@/components/property/property-map";
import { PropertyCarousel } from "@/components/properties/property-carousel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const property = await getProperty(locale as Locale, slug);
  if (!property) return {};

  const path = `/properties/${decodeSlugParam(slug)}`;
  const image = mediaUrl(property.main_image);

  return {
    title: property.title,
    description: property.description?.slice(0, 180) ?? property.title,
    alternates: { canonical: `/${locale}${path}`, languages: localeAlternates(path) },
    openGraph: {
      title: property.title,
      description: property.description?.slice(0, 180) ?? property.title,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

function coordinate(value: string | number | null): number | null {
  if (value === null) return null;
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations();

  const property: PropertyDetail | null = await getProperty(typedLocale, slug);
  if (!property) notFound();

  const [settings, related, everythingElse] = await Promise.all([
    getSettings(),
    // Nearby means the same area, and *only* the same area: deliberately not
    // narrowed by `purpose`, so a page reached from "For sale" still shows
    // what else the office has in that area to rent, and the other way
    // round. The area is the single strongest signal a Kuwaiti buyer
    // filters on; whether the neighbour happens to be a sale or a let is
    // not what makes it relevant. 16, not 8, so the carousel below has
    // more than one page to move through.
    getProperties(typedLocale, { area: property.area.slug, limit: 16 }),
    // The fallback, so this row is never empty: an area with only one
    // listing in it (which, with the catalogue as it stands, is most of
    // them) would otherwise end the page on a link out instead of on
    // something to look at.
    getProperties(typedLocale, { limit: 16 }),
  ]);

  const images = property.images.length > 0 ? property.images : [];
  const primary = mediaUrl(images.find((image) => image.is_main)?.url ?? property.main_image);
  const side = images
    .filter((image) => !image.is_main)
    .slice(0, 2)
    .map((image) => ({ url: mediaUrl(image.url), alt: image.alt }));

  const sqm = formatSqm(property.area_sqm);
  const latitude = coordinate(property.latitude);
  const longitude = coordinate(property.longitude);
  const price = formatPrice(property.price, property.purpose, typedLocale);
  const location = property.block
    ? `${property.area.name}، ${t("card.block", { block: property.block })}`
    : property.area.name;

  const phone = settings.phone?.trim();
  const whatsapp = settings.whatsapp?.trim();
  // Not sliced to 4 any more: the row is a carousel now, so everything the
  // area has to offer is reachable rather than only its first four.
  const sameArea = related.items.filter((item) => item.id !== property.id);
  // Whatever the area has comes first; the rest of the catalogue follows
  // behind it in the same carousel, so the visitor always has somewhere to
  // go from here without leaving the page.
  const seen = new Set([property.id, ...sameArea.map((item) => item.id)]);
  const others = [
    ...sameArea,
    ...everythingElse.items.filter((item) => !seen.has(item.id)),
  ];

  return (
    <>
      <div className="container detail-breadcrumb">
        <Link href="/">{t("nav.home")}</Link>
        <span>/</span>
        <Link href="/properties">{t("footer.allProperties")}</Link>
        <span>/</span>
        <b>{property.title}</b>
      </div>

      {primary ? (
        <section className="container property-gallery">
          <div className="gallery-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primary} alt={t("card.imageAlt", { title: property.title })} />
          </div>
          {side.length > 0 ? (
            <div className="gallery-side">
              {side.map((image, index) =>
                image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={image.url} src={image.url} alt={image.alt ?? `${property.title} ${index + 2}`} />
                ) : null,
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="container property-main-grid">
        <div>
          <div className="property-title-block">
            <div>
              <span className="section-kicker">
                {t(`purpose.${property.purpose}`)} • {property.type.name}
              </span>
              <h1>{property.title}</h1>
              <p>
                <MapPin size={15} />
                {location}
              </p>
            </div>
            <div>
              <span className="availability-pill">
                <i />
                {t(`status.${property.status}`)}
              </span>
              <strong>{price}</strong>
            </div>
          </div>

          <div className="detail-specs wide-specs">
            {sqm ? (
              <div>
                <Maximize2 size={18} />
                <span>
                  <b>{sqm}</b>
                  {t("detail.sqmLabel")}
                </span>
              </div>
            ) : null}
            {property.rooms ? (
              <div>
                <BedDouble size={18} />
                <span>
                  <b>{property.rooms}</b>
                  {t("detail.roomsLabel")}
                </span>
              </div>
            ) : null}
            {property.bathrooms ? (
              <div>
                <Bath size={18} />
                <span>
                  <b>{property.bathrooms}</b>
                  {t("detail.bathroomsLabel")}
                </span>
              </div>
            ) : null}
            {property.floors ? (
              <div>
                <Layers size={18} />
                <span>
                  <b>{property.floors}</b>
                  {t("detail.floorsLabel")}
                </span>
              </div>
            ) : null}
            <div>
              <Building2 size={18} />
              <span>
                <b>{property.type.name}</b>
                {t("detail.typeLabel")}
              </span>
            </div>
          </div>

          <article className="property-description">
            <span className="section-kicker">{t("detail.descriptionKicker")}</span>
            {property.description ? <p>{property.description}</p> : null}

            {property.amenities.length > 0 ? (
              <>
                <h3>{t("detail.amenitiesTitle")}</h3>
                <div className="feature-list">
                  {property.amenities.map((amenity) => (
                    <span key={amenity.key}>
                      <CircleCheck size={16} />
                      {amenity.name}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        </div>

        <aside className="property-contact-card">
          <span>{t("detail.contactKicker")}</span>
          <h3>{property.title}</h3>

          {phone ? (
            <a className="button button-dark full-button" href={telLink(phone)}>
              <Phone size={15} />
              {t("detail.callDirect")}
            </a>
          ) : null}

          {whatsapp ? (
            <a
              className="button whatsapp-button full-button"
              href={waLink(
                whatsapp,
                t("detail.whatsappMessage", {
                  title: property.title,
                  area: property.area.name,
                  price,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} />
              {t("detail.whatsapp")}
            </a>
          ) : null}

          <a
            className="button kuwait-finder-button full-button"
            href={kuwaitFinderUrl(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={15} />
            <ExternalLink size={13} />
            {t("detail.kuwaitFinder")}
          </a>

          <div className="separator">
            <span>{t("detail.orSendInquiry")}</span>
          </div>

          <InquiryForm propertyId={property.id} propertyTitle={property.title} />
        </aside>
      </section>

      {latitude !== null && longitude !== null ? (
        <section className="container property-location-section">
          <header>
            <div>
              <span className="section-kicker">{t("detail.locationKicker")}</span>
              <h2>{t("detail.locationTitle")}</h2>
              <p>
                <MapPin size={15} />
                {location}
              </p>
            </div>
            <div className="location-actions">
              <a
                className="button button-gold"
                href={kuwaitFinderUrl(latitude, longitude)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                {t("detail.openKuwaitFinder")}
              </a>
              <a
                className="button button-outline"
                href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                {t("detail.openMaps")}
              </a>
            </div>
          </header>

          <PropertyMap latitude={latitude} longitude={longitude} label={property.title} />
        </section>
      ) : null}

      {/* Named for the area rather than called "similar": these are the
          office's other listings in the same area, for sale and to rent
          alike, and the heading should say which area that is. */}
      {others.length > 0 ? (
        <section className="container related-properties">
          {/* Titled for whatever leads the row: the area when the office has
              other listings in it, the catalogue at large when it does not.
              Claiming "More in Bayan" over a row that is really the rest of
              Kuwait would be the heading lying about its own contents. */}
          <header className="related-properties-header">
            <div>
              <span className="section-kicker">
                {sameArea.length > 0 ? t("detail.nearbyKicker") : t("detail.moreKicker")}
              </span>
              <h2>
                {sameArea.length > 0
                  ? t("detail.nearbyTitle", { area: property.area.name })
                  : t("detail.moreTitle")}
              </h2>
            </div>
            <Link
              className="button button-outline"
              href={
                sameArea.length > 0 ? `/properties?area=${property.area.slug}` : "/properties"
              }
            >
              <MapPin size={15} />
              {sameArea.length > 0
                ? t("detail.nearbyCta", { area: property.area.name })
                : t("detail.moreCta")}
            </Link>
          </header>

          <PropertyCarousel properties={others} locale={typedLocale} />
        </section>
      ) : null}

      {/* Back to the area, not back to "For sale": the visitor's next move
          from here is the neighbourhood they were just looking at, and the
          purpose they happened to arrive through is the narrower answer. */}
      <div className="container back-row">
        <Link href={`/properties?area=${property.area.slug}`}>
          <ArrowLeft size={15} />
          {t("detail.backToArea", { area: property.area.name })}
        </Link>
      </div>
    </>
  );
}
