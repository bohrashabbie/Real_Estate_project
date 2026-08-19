import { getTranslations } from "next-intl/server";
import { MapPin, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

/**
 * The sticky gold rail of the office's picks that rides above the results.
 *
 * It stays pinned while the grid scrolls, which is the point: the featured
 * listings are what the office is paid to surface, and they should not scroll
 * away after the first four results.
 */
export async function FeaturedStrip({
  properties,
  locale,
}: {
  properties: PropertyListItem[];
  locale: Locale;
}) {
  const t = await getTranslations();
  if (properties.length === 0) return null;

  return (
    <section className="featured-results-strip" aria-label={t("listing.featuredAria")}>
      <header>
        <div>
          <Star size={18} />
          <span>
            <strong>{t("listing.featuredTitle")}</strong>
            <small>{t("listing.featuredSubtitle")}</small>
          </span>
        </div>
        <Link className="featured-results-link" href="/properties?featured=1">
          {t("listing.featuredLink")}
        </Link>
      </header>

      <div className="featured-results-track">
        {properties.map((property) => {
          const image = mediaUrl(property.main_image);
          return (
            <Link
              key={property.id}
              className="featured-strip-card"
              href={`/properties/${property.slug}`}
              aria-label={t("card.viewAria", { title: property.title })}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" loading="lazy" />
              ) : (
                <span aria-hidden />
              )}
              <span className="featured-label">
                <Star size={12} />
                {t("card.featured")}
              </span>
              <span>
                <small>
                  <MapPin size={13} />
                  {property.area.name}
                </small>
                <strong>{property.title}</strong>
                <b>{formatPrice(property.price, property.purpose, locale)}</b>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
