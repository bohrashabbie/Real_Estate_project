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
  CompareIcon,
  ExpandIcon,
  PinIcon,
  StarIcon,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/property/status-pill";

/** The premium listing card from the old site: image with distinct★ badge and
 *  availability pill, gold price + purpose/type eyebrow, navy title, area,
 *  stats row, then compare (placeholder) / view-details footer. */
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-cream-200">
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
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-cream-300">
            <BuildingIcon width={56} height={56} strokeWidth={1.2} />
          </span>
        )}
        {property.is_premium ? (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1.5 text-xs font-semibold text-white shadow-float">
            {t("card.distinct")}
            <StarIcon width={14} height={14} className="text-gold" fill="currentColor" />
          </span>
        ) : null}
        <span className="absolute bottom-3 start-3">
          <StatusPill status={property.status} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-lg font-bold text-gold">
            {formatPrice(property.price, property.purpose, locale)}
          </p>
          <p className="text-sm font-semibold text-gold-dark">
            {t(`purpose.${property.purpose}`)} · {property.type.name}
          </p>
        </div>

        <h3 className="text-lg font-bold leading-snug text-navy">
          <Link href={`/properties/${property.slug}`} className="hover:text-gold-dark">
            {property.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-muted">
          <PinIcon width={16} height={16} className="shrink-0 text-gold" />
          {property.area.name}
          {property.block ? ` — ${t("card.block", { block: property.block })}` : null}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-cream-200 pt-3 text-sm text-navy">
          <CardStat
            icon={<ExpandIcon width={17} height={17} className="text-gold" />}
            label={t("card.sqm")}
            value={sqm}
          />
          <CardStat
            icon={<BathIcon width={17} height={17} className="text-gold" />}
            label={t("card.bathrooms")}
            value={property.bathrooms}
          />
          <CardStat
            icon={<BedIcon width={17} height={17} className="text-gold" />}
            label={t("card.rooms")}
            value={property.rooms}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-cream-200 pt-3">
          {/* Comparison shipped later — the old site showed the affordance. */}
          <span
            className="inline-flex cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-muted/70"
            title={t("card.compareSoon")}
          >
            {t("card.compare")}
            <CompareIcon width={16} height={16} />
          </span>
          <Link
            href={`/properties/${property.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-navy transition-colors hover:text-gold-dark"
          >
            {t("card.viewDetails")}
            <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
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
        "inline-flex items-center gap-1.5",
        value === null || value === undefined ? "opacity-40" : undefined,
      )}
    >
      {icon}
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value ?? "—"}</span>
    </span>
  );
}
