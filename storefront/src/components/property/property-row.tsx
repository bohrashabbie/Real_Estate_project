import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowIcon, BuildingIcon, StarIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/property/status-pill";

/**
 * A listing as a row in the office register.
 *
 * This is the site's default way of showing stock. A three-across grid of
 * cards gives every property the same footprint and forces the title, the area
 * and the price into a column barely wide enough for any of them; a row gives
 * the record a full line to be read on, which is how an office actually lists
 * property. The sequence number in the margin is the same annotation device as
 * the dimension lines and the section indices.
 *
 * The whole row is one link — there is no secondary "view details" affordance,
 * because a row that is entirely clickable does not need one.
 */
export function PropertyRow({
  property,
  locale,
  index,
}: {
  property: PropertyListItem;
  locale: Locale;
  /** 1-based position in the list; rendered as a three-digit margin note. */
  index?: number;
}) {
  const t = useTranslations();
  const image = mediaUrl(property.main_image);
  const sqm = formatSqm(property.area_sqm);

  const dims = [
    property.rooms !== null ? `${property.rooms} ${t("card.rooms")}` : null,
    property.bathrooms !== null ? `${property.bathrooms} ${t("card.bathrooms")}` : null,
    sqm ? `${sqm} ${t("card.sqm")}` : null,
  ].filter(Boolean);

  return (
    <article className="group relative border-t border-cream-200">
      <Link
        href={`/properties/${property.slug}`}
        className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-6"
      >
        {index !== undefined ? (
          <span
            aria-hidden
            className="hidden w-9 shrink-0 self-start pt-1 text-xs font-bold tabular-nums tracking-[0.14em] text-cream-300 transition-colors group-hover:text-gold sm:block"
          >
            {String(index).padStart(3, "0")}
          </span>
        ) : null}

        <span className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-cream-100 sm:aspect-[3/2] sm:w-48 lg:w-56">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={property.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-cream-300">
              <BuildingIcon width={40} height={40} strokeWidth={1.2} />
            </span>
          )}
          <span className="absolute start-2 top-2 bg-cream/85 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-navy backdrop-blur">
            {property.ref_no}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
            {property.type.name}
            <span className="h-2.5 w-px bg-cream-300" aria-hidden />
            <span className="text-muted">{property.area.name}</span>
            {property.block ? (
              <span className="text-muted">{t("card.block", { block: property.block })}</span>
            ) : null}
            {property.is_premium ? (
              <span className="inline-flex items-center gap-1 border border-dashed border-navy px-1.5 py-0.5 text-navy">
                <StarIcon width={10} height={10} fill="currentColor" />
                {t("card.distinct")}
              </span>
            ) : null}
          </span>

          <span className="mt-1.5 block font-display text-lg font-bold leading-snug text-navy transition-colors group-hover:text-gold sm:text-xl">
            {property.title}
          </span>

          {dims.length > 0 ? (
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-muted">
              {dims.map((dim, i) => (
                <span key={dim} className="flex items-center gap-3">
                  {i > 0 ? <span className="h-3 w-px bg-cream-300" aria-hidden /> : null}
                  {dim}
                </span>
              ))}
            </span>
          ) : null}
        </span>

        <span className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-3 sm:text-end">
          <StatusPill status={property.status} />
          <span className="flex items-center gap-3">
            <span className="font-display text-lg font-extrabold tabular-nums text-gold sm:text-xl">
              {formatPrice(property.price, property.purpose, locale)}
            </span>
            <ArrowIcon
              width={18}
              height={18}
              className={cn(
                "shrink-0 text-navy transition-transform",
                "group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1",
              )}
            />
          </span>
        </span>
      </Link>

      {/* The rule under the row draws in on hover — the list's only motion
          besides the thumbnail. */}
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-px block h-px w-0 bg-gold transition-[width] duration-500 ease-out group-hover:w-full"
      />
    </article>
  );
}
