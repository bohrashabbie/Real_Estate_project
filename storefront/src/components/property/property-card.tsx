"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Bath, BedDouble, MapPin, Maximize2, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { CompareToggle } from "@/components/property/compare-toggle";

/**
 * The card the whole site is built out of: both home grids, the listing grid,
 * the related rail and the smart-search results all render this one component,
 * so a change to a card is a change everywhere by construction.
 *
 * It is a client component because its compare toggle has to be — and because
 * the listing's "show more" appends cards on the client, which cannot call an
 * async server component. Rendering it from a server page still costs nothing
 * at first paint: Next streams the markup and hydration only attaches the
 * toggle.
 *
 * `matchScore` is the single variation: smart-search pins a gold percentage
 * over the photo in place of the featured star.
 */
export function PropertyCard({
  property,
  locale,
  matchScore,
}: {
  property: PropertyListItem;
  locale: Locale;
  matchScore?: number;
}) {
  const t = useTranslations();
  const href = `/properties/${property.slug}`;
  const image = mediaUrl(property.main_image);
  const sqm = formatSqm(property.area_sqm);

  return (
    <article className="property-card">
      <Link
        className="property-image"
        href={href}
        aria-label={t("card.viewAria", { title: property.title })}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={t("card.imageAlt", { title: property.title })} loading="lazy" />
        ) : null}

        {matchScore !== undefined ? (
          <span className="match-badge">
            <Star size={13} />
            {t("smart.matchPercent", { percent: matchScore })}
          </span>
        ) : property.is_featured ? (
          <span className="featured-label">
            <Star size={12} />
            {t("card.featured")}
          </span>
        ) : null}

        <span className={`property-status state-${property.status}`}>
          <i />
          {t(`status.${property.status}`)}
        </span>
      </Link>

      <div className="property-body">
        <div className="property-price-row">
          <span>
            {t(`purpose.${property.purpose}`)} • {property.type.name}
          </span>
          <strong>{formatPrice(property.price, property.purpose, locale)}</strong>
        </div>

        <h3>
          <Link href={href}>{property.title}</Link>
        </h3>

        <p className="property-location">
          <MapPin size={15} />
          {property.area.name}
        </p>

        <div className="property-specs">
          {property.rooms ? (
            <span>
              <BedDouble size={15} />
              {t("card.rooms", { count: property.rooms })}
            </span>
          ) : null}
          {property.bathrooms ? (
            <span>
              <Bath size={15} />
              {t("card.bathrooms", { count: property.bathrooms })}
            </span>
          ) : null}
          {sqm ? (
            <span>
              <Maximize2 size={15} />
              {sqm} {t("card.sqm")}
            </span>
          ) : null}
        </div>

        <div className="property-footer">
          <Link className="property-link" href={href}>
            <ArrowLeft size={15} />
            {t("card.viewDetails")}
          </Link>
          <CompareToggle
            property={{
              id: property.id,
              slug: property.slug,
              title: property.title,
              image,
            }}
          />
        </div>
      </div>
    </article>
  );
}
