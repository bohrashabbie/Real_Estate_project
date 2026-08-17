import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import {
  ArrowIcon,
  BathIcon,
  BedIcon,
  BuildingIcon,
  ExpandIcon,
  PinIcon,
  StarIcon,
} from "@/components/ui/icons";
import { CompareButton } from "@/components/property/compare-button";
import { StatusPill } from "@/components/property/status-pill";

/**
 * The listing card, laid out exactly as the reference design in `mimic/`:
 *
 *   photo — navy "distinct" badge and the status, both on the inline-start side
 *   ─────
 *   gold "purpose • type" eyebrow          navy price
 *   the title, large and heavy
 *   pin + area
 *   ── rule ──
 *   bed 3 rooms      bath 2 baths      expand 145 m²
 *   ── rule ──
 *   view details →                       + compare
 *
 * The stats read as one phrase per column ("3 rooms"), not a value stacked over
 * a label — with four cards to a row there is no width for a two-line stat, and
 * the bare noun is how the reference prints it.
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
  const href = `/properties/${property.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-cream-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream-100 to-cream-200 text-cream-300">
            <BuildingIcon width={56} height={56} strokeWidth={1.2} />
          </span>
        )}

        {/* Legibility gradient for the status line sitting on the photo. */}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950/70 to-transparent"
          aria-hidden
        />

        {property.is_premium ? (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1.5 text-xs font-bold text-white shadow-card">
            {t("card.distinct")}
            <StarIcon width={13} height={13} fill="currentColor" className="text-gold" />
          </span>
        ) : null}

        <span className="absolute bottom-3 start-3">
          <StatusPill status={property.status} tone="onPhoto" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        {/* Purpose/type and price share a line in the reference, where the card
            is full-bleed on a phone. Four to a row on a desktop they collide,
            so the price drops to its own line below `2xl` and only sits beside
            the eyebrow once the column is wide enough to hold both. */}
        <div className="flex flex-col gap-1 2xl:flex-row 2xl:items-baseline 2xl:justify-between 2xl:gap-4">
          <p className="min-w-0 truncate text-sm font-bold text-gold-dark">
            {t(`purpose.${property.purpose}`)} • {property.type.name}
          </p>
          <p className="shrink-0 font-display text-lg font-extrabold text-navy 2xl:text-base">
            {formatPrice(property.price, property.purpose, locale)}
          </p>
        </div>

        <h3 className="mt-3.5 font-display text-xl font-extrabold leading-snug text-navy">
          <Link href={href} className="transition-colors hover:text-gold-dark">
            {property.title}
          </Link>
        </h3>

        <p className="mt-2.5 flex items-center gap-2 text-sm text-muted">
          <PinIcon width={15} height={15} className="shrink-0" />
          {property.area.name}
          {property.block ? ` — ${t("card.block", { block: property.block })}` : null}
        </p>

        {/* A listing with none of the three (bare land, typically) would
            otherwise get an empty band bracketed by two rules.

            Two aligned columns rather than a spread row: three stats never fit
            on one line in a four-across card ("2 bathrooms" alone is ~85px
            against a 234px content width), and a wrapping `justify-between`
            row put the second item at a different x in every card, which is
            hard to scan down a grid. */}
        {property.rooms !== null || property.bathrooms !== null || sqm !== null ? (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-cream-200 py-4">
            <CardStat
              icon={<BedIcon width={17} height={17} />}
              value={property.rooms}
              noun={t("card.rooms")}
            />
            <CardStat
              icon={<BathIcon width={17} height={17} />}
              value={property.bathrooms}
              noun={t("card.bathrooms")}
            />
            <CardStat
              icon={<ExpandIcon width={17} height={17} />}
              value={sqm}
              noun={t("card.sqm")}
            />
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-gold-dark"
          >
            {t("card.viewDetails")}
            <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
          </Link>
          <CompareButton />
        </div>
      </div>
    </article>
  );
}

/** One stat: gold icon, then "<value> <noun>" as a single line. */
function CardStat({
  icon,
  value,
  noun,
}: {
  icon: React.ReactNode;
  value: string | number | null;
  noun: string;
}) {
  if (value === null || value === undefined) return null;
  return (
    // Never truncated: "3 bathrooms" clipped to "3 bathro…" in a four-column
    // row, which is worse than the strip taking a second line. The parent
    // wraps, and `gap-y` keeps the two lines apart when it does.
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className="shrink-0 text-gold">{icon}</span>
      <span className="font-bold text-navy">
        {value} {noun}
      </span>
    </span>
  );
}
