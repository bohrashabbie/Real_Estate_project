"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Locale } from "@/i18n/routing";
import type { PropertyListItem } from "@/lib/api";
import { PropertyCard } from "@/components/property/property-card";

const WIDE = 4;
const MID = 2;
const MID_QUERY = "(max-width: 1100px)";
const NARROW_QUERY = "(max-width: 430px)";

/**
 * A `PropertyCard` rail that pages sideways instead of growing new rows —
 * for a curated view (the "Featured" listing page today) where adding one
 * more pick used to push everything below it down a row instead of just
 * becoming reachable by a click.
 *
 * Mirrors `VipCarousel`'s scroll-snap-and-`scrollIntoView` mechanics — a real
 * scroll container behaves correctly under `dir="rtl"` and touch swipe for
 * free, where a transformed strip would not — but adds `onNeedMore`: the
 * results here are cursor-paginated from the server, so paging past the last
 * loaded card has to fetch before it can scroll rather than just clamping.
 */
export function PropertyCarousel({
  properties,
  locale,
  hasMore,
  loading,
  onNeedMore,
}: {
  properties: PropertyListItem[];
  locale: Locale;
  hasMore: boolean;
  loading: boolean;
  onNeedMore: () => void;
}) {
  const t = useTranslations();
  const trackRef = useRef<HTMLDivElement>(null);
  const pendingTarget = useRef<number | null>(null);
  const [perView, setPerView] = useState(WIDE);
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(properties.length / perView));

  useEffect(() => {
    const mid = window.matchMedia(MID_QUERY);
    const narrow = window.matchMedia(NARROW_QUERY);
    const apply = () => setPerView(narrow.matches ? 1 : mid.matches ? MID : WIDE);
    apply();
    mid.addEventListener("change", apply);
    narrow.addEventListener("change", apply);
    return () => {
      mid.removeEventListener("change", apply);
      narrow.removeEventListener("change", apply);
    };
  }, []);

  const scrollTo = useCallback(
    (target: number) => {
      const track = trackRef.current;
      const item = track?.children[target * perView] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setPage(target);
    },
    [perView],
  );

  const goTo = useCallback(
    (target: number) => {
      if (target < 0) return;
      if (target >= pages) {
        // Nothing loaded to show yet — ask for the next batch and scroll once
        // it lands (see the effect below), rather than clamping to the page
        // that already exists.
        if (hasMore && !loading) {
          pendingTarget.current = target;
          onNeedMore();
        }
        return;
      }
      scrollTo(target);
    },
    [pages, hasMore, loading, onNeedMore, scrollTo],
  );

  // Fires once a fetch triggered by `goTo` has appended enough cards for the
  // page it was waiting on to actually exist.
  useEffect(() => {
    if (pendingTarget.current === null || pendingTarget.current >= pages) return;
    const target = pendingTarget.current;
    pendingTarget.current = null;
    scrollTo(target);
  }, [pages, scrollTo]);

  // A swipe moves the track without going through goTo, so the dots read
  // their state back off the scroll position rather than assuming it.
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
    <div className="card-carousel">
      <div className="card-carousel-track" ref={trackRef}>
        {properties.map((property) => (
          <div className="card-carousel-item" key={property.id}>
            <PropertyCard property={property} locale={locale} />
          </div>
        ))}
      </div>

      {pages > 1 || hasMore ? (
        <div className="carousel-controls">
          <button
            type="button"
            aria-label={t("carousel.previous")}
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
                aria-label={t("carousel.goToPage", { page: index + 1 })}
                aria-current={index === page || undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label={t("carousel.next")}
            onClick={() => goTo(page + 1)}
            disabled={loading || (page === pages - 1 && !hasMore)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
