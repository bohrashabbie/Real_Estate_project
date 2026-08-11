import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowIcon, BuildingIcon, StarIcon } from "@/components/ui/icons";

/**
 * Featured properties as an asymmetric mosaic of photographic tiles.
 *
 * The three-across grid of equal cards is what makes every listings site look
 * like every other listings site: no property is more important than any other,
 * so nothing is worth looking at first. Here the office's lead selection takes
 * a quarter of the band and the rest fall in around it, and the record is set
 * *on* the photograph rather than in a box underneath it — so the band reads as
 * a spread, not as inventory.
 *
 * Tiles are separated by the page ground showing through a 1px grid gap, which
 * is the same hairline that rules the rest of the system.
 */
export async function FeaturedMosaic({
  items,
  locale,
}: {
  items: PropertyListItem[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "card" });
  if (items.length === 0) return null;

  const [lead, ...rest] = items.slice(0, 5);

  return (
    <div className="grid gap-px bg-cream-200 md:grid-cols-4 md:grid-rows-2">
      <Tile
        property={lead}
        locale={locale}
        distinctLabel={t("distinct")}
        size="lead"
        className="md:col-span-2 md:row-span-2"
      />
      {rest.map((property) => (
        <Tile
          key={property.id}
          property={property}
          locale={locale}
          distinctLabel={t("distinct")}
          size="small"
        />
      ))}
    </div>
  );
}

function Tile({
  property,
  locale,
  distinctLabel,
  size,
  className,
}: {
  property: PropertyListItem;
  locale: Locale;
  distinctLabel: string;
  size: "lead" | "small";
  className?: string;
}) {
  const image = mediaUrl(property.main_image);
  const lead = size === "lead";

  return (
    <Link
      href={`/properties/${property.slug}`}
      className={cn(
        "group relative block overflow-hidden bg-cream-100",
        lead ? "aspect-[4/3] md:aspect-auto" : "aspect-[4/3]",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={property.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-cream-300">
          <BuildingIcon width={lead ? 64 : 44} height={lead ? 64 : 44} strokeWidth={1.1} />
        </span>
      )}

      {/* The scrim carries the type only far enough up the tile to seat the
          text — a full-height wash would flatten the photograph. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy-950/90 via-navy-950/45 to-transparent"
      />

      <span className="absolute start-4 top-4 flex flex-wrap items-center gap-2">
        <span className="bg-cream/85 px-2 py-0.5 text-[11px] font-bold tracking-wider text-navy backdrop-blur">
          {property.ref_no}
        </span>
        {property.is_premium ? (
          <span className="inline-flex items-center gap-1.5 border border-cream-50/40 px-2 py-0.5 text-[11px] font-bold tracking-wide text-cream-50 backdrop-blur">
            <StarIcon width={11} height={11} fill="currentColor" />
            {distinctLabel}
          </span>
        ) : null}
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-4 sm:p-5">
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gold-light">
          {property.type.name} · {property.area.name}
        </span>
        <span
          className={cn(
            "mt-1.5 block font-display font-extrabold leading-snug text-cream-50",
            lead ? "text-xl sm:text-3xl" : "text-base",
          )}
        >
          {property.title}
        </span>
        <span className="mt-2.5 flex items-center justify-between gap-3">
          <span
            className={cn(
              "font-display font-extrabold tabular-nums text-cream-50",
              lead ? "text-lg sm:text-xl" : "text-sm",
            )}
          >
            {formatPrice(property.price, property.purpose, locale)}
          </span>
          <ArrowIcon
            width={lead ? 20 : 16}
            height={lead ? 20 : 16}
            className="shrink-0 text-cream-50 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          />
        </span>
      </span>
    </Link>
  );
}
