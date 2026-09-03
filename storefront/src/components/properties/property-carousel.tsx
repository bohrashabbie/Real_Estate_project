import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import type { PropertyListItem } from "@/lib/api";
import { PropertyCard } from "@/components/property/property-card";
import { ScrollRail } from "@/components/ui/scroll-rail";

/**
 * A `PropertyCard` rail that pages sideways instead of growing new rows —
 * for a curated view (the home rows, the listing pages' Featured row, the
 * detail page's same-area row) where adding one more pick used to push
 * everything below it down a row instead of just becoming reachable.
 *
 * Moved by dragging, swiping, the keyboard, or the short bar centred beneath
 * it (`ScrollRail`), in place of the chevron-and-dots control this used to
 * carry. That control was a page count and a position readout as well as a
 * way to move, all three hand-maintained against a scroll container that
 * already knew its own position.
 *
 * Still a server component: `ScrollRail` is the only client part, and the
 * cards are handed to it as `children` already rendered.
 */
export async function PropertyCarousel({
  properties,
  locale,
}: {
  properties: PropertyListItem[];
  locale: Locale;
}) {
  const t = await getTranslations("carousel");
  if (properties.length === 0) return null;

  return (
    <ScrollRail
      className="card-carousel"
      trackClassName="card-carousel-track"
      ariaLabel={t("scrollAria")}
    >
      {properties.map((property) => (
        <div className="card-carousel-item" key={property.id}>
          <PropertyCard property={property} locale={locale} />
        </div>
      ))}
    </ScrollRail>
  );
}
