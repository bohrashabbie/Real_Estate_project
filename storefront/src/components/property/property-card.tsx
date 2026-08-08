import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type PropertyListItem } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowIcon,
  BathIcon,
  BedIcon,
  BuildingIcon,
  ExpandIcon,
  PinIcon,
  StarIcon,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/property/status-pill";

/** Premium listing card: photo with soft gradient, gold-gradient distinct★
 *  badge and availability pill, purpose/type eyebrow, display-font title,
 *  area, spec strip, then price + arrow footer. The whole card lifts on hover. */
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
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-cream-200 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float hover:ring-gold/40">
      <Link
        href={`/properties/${property.slug}`}
        className="relative block aspect-[16/10] overflow-hidden bg-cream-100"
      >
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
        {/* Soft legibility gradient over the photo bottom. */}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950/70 to-transparent"
          aria-hidden
        />
        {property.is_premium ? (
          <span className="bg-gold-gradient absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-gold">
            {t("card.distinct")}
            <StarIcon width={13} height={13} fill="currentColor" />
          </span>
        ) : null}
        <span className="absolute bottom-3 start-3">
          <StatusPill status={property.status} />
        </span>
        <span className="absolute bottom-3 end-3 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {t(`purpose.${property.purpose}`)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-dark">
          {property.type.name}
          {property.ref_no ? <span className="text-muted/70"> · {property.ref_no}</span> : null}
        </p>

        <h3 className="font-display text-lg font-bold leading-snug text-navy">
          <Link href={`/properties/${property.slug}`} className="transition-colors hover:text-gold-dark">
            {property.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-muted">
          <PinIcon width={15} height={15} className="shrink-0 text-gold" />
          {property.area.name}
          {property.block ? ` — ${t("card.block", { block: property.block })}` : null}
        </p>

        {/* Three equal columns rather than one inline row: "bathrooms" is long
            enough that a single line ran out of card and truncated every label
            to "2 bath…". Stacking the label under the value gives each stat the
            full third of the strip, and the separators are flow elements rather
            than `divide-x` so they stay between the cells under RTL. */}
        <div className="mt-2 flex items-stretch rounded-2xl bg-cream-50 px-2 py-2.5 text-sm ring-1 ring-cream-100">
          <CardStat
            icon={<BedIcon width={16} height={16} className="text-gold" />}
            label={t("card.rooms")}
            value={property.rooms}
          />
          <span className="w-px self-stretch bg-cream-200" aria-hidden />
          <CardStat
            icon={<BathIcon width={16} height={16} className="text-gold" />}
            label={t("card.bathrooms")}
            value={property.bathrooms}
          />
          <span className="w-px self-stretch bg-cream-200" aria-hidden />
          <CardStat
            icon={<ExpandIcon width={16} height={16} className="text-gold" />}
            label={t("card.sqm")}
            value={sqm}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="font-display text-lg font-extrabold text-navy">
            {formatPrice(property.price, property.purpose, locale)}
          </p>
          <Link
            href={`/properties/${property.slug}`}
            aria-label={t("card.viewDetails")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-navy ring-1 ring-cream-200 transition-all group-hover:bg-gold-gradient group-hover:text-white group-hover:ring-transparent group-hover:shadow-gold"
          >
            <ArrowIcon width={17} height={17} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CardStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1.5 text-center",
        value === null || value === undefined ? "opacity-40" : undefined,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        <span className="font-bold text-navy">{value ?? "—"}</span>
      </span>
      <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
    </span>
  );
}
