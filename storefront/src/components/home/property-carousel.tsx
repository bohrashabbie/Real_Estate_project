import type { Locale } from "@/i18n/routing";
import type { PropertyListItem } from "@/lib/api";
import { PropertyCard } from "@/components/property/property-card";

/**
 * A horizontal row of property cards that scrolls rather than wrapping.
 *
 * Used by the VIP row only. The office's picks stay a four-across grid — that
 * row is deliberately a fixed shortlist of four and reads as one block. VIP is
 * the open-ended one: however many the office promotes, all of them show, in
 * the order chosen, and the reader pushes along the track.
 *
 * Native overflow scrolling with `scroll-snap`, the same as the related-listings
 * strip on the detail page — no JS, no library, and it stays keyboard- and
 * touch-scrollable for free. RTL needs nothing special either: the flow
 * direction comes from `dir` on the document, so under `ar` the track starts
 * at the right on its own.
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
    <div className="property-carousel">
      {properties.map((property) => (
        <div key={property.id} className="property-carousel-item">
          <PropertyCard property={property} locale={locale} />
        </div>
      ))}
    </div>
  );
}
