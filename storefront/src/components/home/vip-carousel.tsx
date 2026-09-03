"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Crown,
  MapPin,
  Maximize2,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { CompareToggle } from "@/components/property/compare-toggle";

/**
 * The VIP row: a slider of two large showcase slides rather than a rail of the
 * standard card.
 *
 * These are the listings the office is promoting hardest, so they get a
 * different object from everything else on the page — photograph-led, with the
 * copy sitting on the picture under a scrim instead of in a white panel beneath
 * it. That is why this is a separate component rather than a `variant` prop on
 * `PropertyCard`: the two share their data and nothing of their layout.
 *
 * The track is a real scroll container with snap points, not a transformed
 * strip. That buys touch swiping, keyboard scrolling and — the part that
 * matters most here — correct behaviour under `dir="rtl"`, because the browser
 * owns the direction rather than us.
 *
 * It is moved by the slim gold scrollbar beneath it — the one the property-
 * type row wore before it became a marquee — rather than by the chevrons and
 * dots this used to carry. The browser's own bar is a position readout and a
 * way to move in one, correct in both directions, and taking it left nothing
 * here to hydrate but the compare toggles.
 */
export function VipCarousel({
  properties,
  locale,
  columns = 2,
}: {
  properties: PropertyListItem[];
  locale: Locale;
  /** Slides to a view at full width: the home page keeps two, the listing
   *  pages ask for three. Purely a class now — `.vip-carousel.is-three` owns
   *  the widths and the tiers below them (two up to 1200px, one to 899). */
  columns?: 2 | 3;
}) {
  const t = useTranslations();
  if (properties.length === 0) return null;

  return (
    <div className={`vip-carousel${columns === 3 ? " is-three" : ""}`}>
      <div className="vip-carousel-track">
        {properties.map((property) => {
          const href = `/properties/${property.slug}`;
          const image = mediaUrl(property.main_image);
          const sqm = formatSqm(property.area_sqm);

          return (
            <article className="vip-carousel-item" key={property.id}>
              <div className="vip-slide">
                <Link
                  className="vip-slide-shot"
                  href={href}
                  aria-label={t("card.viewAria", { title: property.title })}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={t("card.imageAlt", { title: property.title })}
                      loading="lazy"
                    />
                  ) : null}
                </Link>

                <span className="vip-slide-crown">
                  <Crown size={13} />
                  {t("card.vip")}
                </span>
                <span className={`vip-slide-status state-${property.status}`}>
                  <i />
                  {t(`status.${property.status}`)}
                </span>

                <div className="vip-slide-body">
                  <span className="vip-slide-kicker">
                    {t(`purpose.${property.purpose}`)} • {property.type.name}
                  </span>

                  <h3>
                    <Link href={href}>{property.title}</Link>
                  </h3>

                  <p className="vip-slide-where">
                    <MapPin size={14} />
                    {property.area.name}
                  </p>

                  <div className="vip-slide-specs">
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

                  <div className="vip-slide-foot">
                    <strong className="vip-slide-price">
                      {formatPrice(property.price, property.purpose, locale)}
                    </strong>
                    <div className="vip-slide-actions">
                      {locale === "ar" ? (
                        // The office's own button artwork — Arabic only,
                        // since "عرض التفاصيل" is baked into the image; see
                        // header.tsx's identical split for the full reasoning.
                        <Link className="art-button vip-slide-cta" href={href} aria-label={t("card.viewDetails")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/brand/btn-view-details.webp" alt="" aria-hidden />
                        </Link>
                      ) : (
                        <Link className="metal-button vip-slide-cta" href={href}>
                          <ArrowLeft size={15} />
                          {t("card.viewDetails")}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="metal-button-icon" src="/brand/kwt25-towers.webp" alt="" aria-hidden />
                        </Link>
                      )}
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
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </div>
  );
}
