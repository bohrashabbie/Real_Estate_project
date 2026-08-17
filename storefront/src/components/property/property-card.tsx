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

      {/* Padding is the reference's own 20px / 20px / 17px. */}
      <div className="flex flex-1 flex-col px-5 pb-[17px] pt-5">
        {/* Eyebrow and price share one line, both at 14px, exactly as the
            reference sets them. They fit at four-across in Arabic; `flex-wrap`
            is the release valve for English, whose labels are longer. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-extrabold text-gold-dark">
            {t(`purpose.${property.purpose}`)} • {property.type.name}
          </p>
          <p className="font-display text-sm font-bold text-navy">
            {formatPrice(property.price, property.purpose, locale)}
          </p>
        </div>

        {/* 19px/700 with the reference's 1.585 line-height. */}
        <h3 className="mt-3 font-display text-[19px] font-bold leading-[1.585] text-navy">
          <Link href={href} className="transition-colors hover:text-gold-dark">
            {property.title}
          </Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
          <PinIcon width={15} height={15} className="shrink-0" />
          {property.area.name}
          {property.block ? ` — ${t("card.block", { block: property.block })}` : null}
        </p>

        {/* A listing with none of the three (bare land, typically) would
            otherwise get an empty band bracketed by two rules.

            One spread line, as the reference has it. Arabic fits — its nouns
            are short ("2 حمام") — and English wraps rather than truncating,
            since "3 bathro…" is worse than a second line. */}
        {property.rooms !== null || property.bathrooms !== null || sqm !== null ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-cream-200 py-3.5">
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

        <div className="mt-auto flex items-center justify-between gap-4 pt-3.5">
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
