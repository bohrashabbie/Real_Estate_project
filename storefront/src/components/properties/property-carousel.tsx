import type { Locale } from "@/i18n/routing";
import type { PropertyListItem } from "@/lib/api";
import { PropertyCard } from "@/components/property/property-card";

/**
 * A `PropertyCard` rail that pages sideways instead of growing new rows —
 * for a curated view (the home rows, the listing pages' Featured row, the
 * detail page's same-area row) where adding one more pick used to push
 * everything below it down a row instead of just becoming reachable.
 *
 * Moved by dragging, swiping, the keyboard, or the slim gold scrollbar under
 * it — the one the property-type row wore before it became a marquee — in
 * place of the chevron-and-dots control this used to carry. That control was
 * a page-count and a position readout as well as a way to move, all three
 * hand-maintained against a scroll container that already knew its own
 * position; the scrollbar is the browser's version of the same three things,
 * and it is correct under `dir="rtl"` for free.
 *
 * Losing it also lost the JS: no `perView` media queries, no page state, no
 * `scrollIntoView`, no scroll listener syncing dots back off the position.
 * This is a server component now, with nothing left to hydrate.
 */
export function PropertyCarousel({
  properties,
  locale,
}: {
  properties: PropertyListItem[];
  locale: Locale;
}) {
  if (properties.length === 0) return null;

  return (
    <div className="card-carousel">
      <div className="card-carousel-track">
        {properties.map((property) => (
          <div className="card-carousel-item" key={property.id}>
            <PropertyCard property={property} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
