"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Crown,
  MapPin,
  Maximize2,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { CompareToggle } from "@/components/property/compare-toggle";

/** Two to a view on a desktop, one once the pair would be too narrow to read. */
const WIDE = 2;
const NARROW_QUERY = "(max-width: 899px)";

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
 * owns the direction rather than us. The buttons and dots drive it with
 * `scrollIntoView` for the same reason; a hand-computed `translateX` would need
 * its sign flipped per direction and would still disagree with a swipe.
 *
 * Chevrons follow `LaunchHero`: left is previous, right is next, physical in
 * both directions. Deliberately not mirrored by the `ArrowLeft` rules in
 * globals.css — a slider control points at the edge it travels toward, and the
 * two sliders on this page should answer to the same gesture.
 */
export function VipCarousel({
  properties,
  locale,
}: {
  properties: PropertyListItem[];
  locale: Locale;
}) {
  const t = useTranslations();
  const trackRef = useRef<HTMLDivElement>(null);
  const [perView, setPerView] = useState(WIDE);
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(properties.length / perView));

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const apply = () => setPerView(mq.matches ? 1 : WIDE);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = Math.max(0, Math.min(pages - 1, target));
      const item = track.children[next * perView] as HTMLElement | undefined;
      // `block: "nearest"` so bringing a slide into view never scrolls the page.
      item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setPage(next);
    },
    [pages, perView],
  );

  // A swipe moves the track without going through goTo, so the dots read their
  // state back off the scroll position rather than assuming it.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = Array.from(track.children) as HTMLElement[];
        if (items.length === 0) return;
        const rtl = getComputedStyle(track).direction === "rtl";
        const box = track.getBoundingClientRect();
        let nearest = 0;
        let shortest = Infinity;
        items.forEach((item, index) => {
          const rect = item.getBoundingClientRect();
          const gap = Math.abs(rtl ? box.right - rect.right : rect.left - box.left);
          if (gap < shortest) {
            shortest = gap;
            nearest = index;
          }
        });
        setPage(Math.floor(nearest / perView));
      });
    };
    track.addEventListener("scroll", sync, { passive: true });
    return () => {
      track.removeEventListener("scroll", sync);
      cancelAnimationFrame(frame);
    };
  }, [perView]);

  if (properties.length === 0) return null;

  return (
    <div className="vip-carousel">
      <div className="vip-carousel-track" ref={trackRef}>
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
                      <Link className="vip-slide-cta" href={href}>
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
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {pages > 1 ? (
        <div className="carousel-controls">
          <button
            type="button"
            aria-label={t("hero.previous")}
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft size={17} />
          </button>

          <div className="carousel-dots">
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index === page ? "is-active" : undefined}
                aria-label={t("vip.goToPage", { page: index + 1 })}
                aria-current={index === page || undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label={t("hero.next")}
            onClick={() => goTo(page + 1)}
            disabled={page === pages - 1}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
