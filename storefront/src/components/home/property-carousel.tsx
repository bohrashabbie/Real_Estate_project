import type { Locale } from "@/i18n/routing";
import type { PropertyListItem } from "@/lib/api";
import { PropertyCard } from "@/components/property/property-card";

/**
 * A horizontal row of property cards that scrolls rather than wrapping.
 *
 * The home page's promoted rows — VIP and the office's picks — are a ranked
 * shortlist, not a catalogue: a four-across grid silently truncates them at
 * whatever fits, and the office's fifth pick may as well not exist. A track
 * shows the whole list in the order the office chose and lets the reader push
 * along it.
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
