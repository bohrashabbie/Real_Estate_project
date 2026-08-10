import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowIcon, BuildingIcon, PinIcon, StarIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/property/status-pill";

/**
 * Listing card — a photographic plate with the record set beneath it.
 *
 * There is no box: no rounded container, no shadow, no lift on hover. A card
 * that looks like a card is what makes a property site look like a classifieds
 * portal, so the only things that move here are the plate easing in and a rule
 * drawing across under it. The reference number sits on the plate as a drawing
 * annotation, and rooms / baths / m² are a dimension row rather than icon chips.
 */
export function PropertyCard({
  property,
  locale,
}: {
  property: PropertyListItem;
  locale: Locale;
}) {
  const t = useTranslations();
  const image = mediaUrl(property.main_image);
  const sqm = formatSqm(property.area_sqm);

  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/properties/${property.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-cream-100"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-cream-100 text-cream-300">
            <BuildingIcon width={56} height={56} strokeWidth={1.2} />
          </span>
        )}

        {/* The reference number reads as a drawing-sheet annotation — it is
            the one number that identifies the property to the office, so it
            belongs on the plate rather than buried in the metadata line. */}
        {property.ref_no ? (
          <span className="absolute start-3 top-3 bg-cream/80 px-2 py-0.5 text-[11px] font-bold tracking-wider text-navy backdrop-blur">
            {property.ref_no}
          </span>
        ) : null}

        <span className="absolute bottom-3 end-3 flex flex-wrap items-center gap-2">
          {property.is_premium ? (
            <span className="inline-flex items-center gap-1.5 border border-dashed border-navy bg-cream/85 px-2 py-0.5 text-[11px] font-bold tracking-wide text-navy backdrop-blur">
              <StarIcon width={11} height={11} fill="currentColor" />
              {t("card.distinct")}
            </span>
          ) : null}
          <StatusPill status={property.status} />
        </span>
      </Link>

      {/* The rule that draws on hover. Sits between plate and text as the
          card's only moving part besides the image itself. */}
      <span
        aria-hidden
        className="relative mt-4 block h-px w-full bg-cream-200 after:absolute after:inset-y-0 after:start-0 after:w-0 after:bg-gold after:transition-[width] after:duration-500 after:ease-out group-hover:after:w-full"
      />

      <div className="flex flex-1 flex-col gap-1 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gold">
          {property.type.name}
        </p>

        <h3 className="font-display text-lg font-bold leading-snug text-navy">
          <Link href={`/properties/${property.slug}`} className="transition-colors hover:text-gold">
            {property.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-muted">
          <PinIcon width={15} height={15} className="shrink-0 text-gold" />
          {property.area.name}
          {property.block ? ` — ${t("card.block", { block: property.block })}` : null}
        </p>

        {/* The dimension row — an architect's annotation rather than a strip of
            icon chips. Each cell takes an equal share of the width, which is
            also what stopped "bathrooms" truncating to "2 bath…" on a narrow
            card: the labels no longer compete for one line. */}
        <div className="dims mt-4">
          <CardStat label={t("card.rooms")} value={property.rooms} />
          <CardStat label={t("card.bathrooms")} value={property.bathrooms} />
          <CardStat label={t("card.sqm")} value={sqm} />
        </div>

        <div className="mt-auto flex items-baseline justify-between gap-3 pt-4">
          <p className="font-display text-lg font-extrabold tabular-nums text-gold">
            {formatPrice(property.price, property.purpose, locale)}
          </p>
          <Link
            href={`/properties/${property.slug}`}
            aria-label={t("card.viewDetails")}
            className="shrink-0 text-navy transition-colors hover:text-gold"
          >
            <ArrowIcon width={17} height={17} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** One cell of the dimension row. The `.dim` classes live in globals.css
 *  because the tick rule needs a pseudo-element and the whole device is shared
 *  with the property detail page. */
function CardStat({ label, value }: { label: string; value: string | number | null }) {
  const missing = value === null || value === undefined;
  return (
    <span className={cn("dim", missing && "opacity-40")}>
      <span className="dim-v">{value ?? "—"}</span>
      <span className="dim-k">{label}</span>
    </span>
  );
}
