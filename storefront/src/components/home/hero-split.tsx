import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { mediaUrl, type Area, type PropertyListItem, type PropertyType } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowIcon, BuildingIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/property/status-pill";
import { SearchLine } from "@/components/home/search-line";

/**
 * The first screen: a statement and a search on one side, one real property on
 * the other.
 *
 * What this replaces is the reason the site read as a template — a full-bleed
 * auto-playing banner with a search card floating over its lower edge. That
 * arrangement spends the entire first screen on artwork and shows nothing the
 * office actually has for sale. Here the visitor meets a single listing
 * immediately, and the office's uploaded banners move further down the page
 * where they work as a campaign strip instead of as the whole introduction.
 *
 * With no property published, the plate falls back to the office's first
 * banner; with neither, the left column simply takes the full width rather
 * than leaving a hole where the plate should be.
 */
export async function HeroSplit({
  areas,
  types,
  lead,
  fallbackImage,
  locale,
}: {
  areas: Area[];
  types: PropertyType[];
  lead: PropertyListItem | null;
  fallbackImage: string | null;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "home" });
  const leadImage = lead ? mediaUrl(lead.main_image) : null;
  // The banner stands in only when there is no property to show at all. A
  // banner *behind* a real listing's record was actively wrong: the artwork
  // carries its own baked-in headline and gold frame, so a photo-less listing
  // ended up captioned onto an advert for something else. Without a photo the
  // plate shows the placeholder, which reads honestly as "no photo yet".
  const plateImage = lead ? leadImage : fallbackImage;
  const hasPlate = Boolean(lead || fallbackImage);
  const sqm = lead ? formatSqm(lead.area_sqm) : null;

  return (
    <section className="border-b border-cream-200">
      <div
        className={cn(
          "mx-auto grid max-w-(--container-site) items-stretch",
          hasPlate && "lg:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Statement + search                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:py-20 lg:pe-14">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            <span className="h-px w-7 bg-gold" aria-hidden />
            {t("heroEyebrow")}
          </p>

          {/* The page's real h1. The old build hid it in `sr-only` because the
              headline was baked into the banner artwork — which meant the
              largest words on screen were an image the office had to re-export
              to change, and translated to nothing in Arabic. */}
          {/* Arabic and Latin are set at different leadings on purpose. Cairo's
              Arabic has tall ascenders and deep descenders, so the 1.05 that
              makes the English headline read as a stacked block collides the
              Arabic lines into each other. One number cannot serve both. */}
          <h1
            className={cn(
              "mt-6 font-display text-[2.6rem] font-extrabold tracking-tight text-navy sm:text-6xl lg:text-[4.25rem]",
              locale === "ar" ? "leading-[1.3]" : "leading-[1.05]",
            )}
          >
            <span className="block">{t("heroLine1")}</span>
            <span className="block">{t("heroLine2")}</span>
            {/* The third line drops to sand — the sentence resolves quietly
                rather than shouting all three lines at the same weight. */}
            <span className="block text-muted">{t("heroLine3")}</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{t("heroLead")}</p>

          <div className="mt-10">
            <SearchLine areas={areas} types={types} />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* The plate — one property, at full height                          */}
        {/* ---------------------------------------------------------------- */}
        {hasPlate ? (
          <div className="relative min-h-[24rem] border-t border-cream-200 bg-cream-100 lg:min-h-[42rem] lg:border-s lg:border-t-0">
            {plateImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plateImage}
                alt={lead?.title ?? ""}
                // Largest image above the fold — it must not be lazy.
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-cream-300">
                <BuildingIcon width={72} height={72} strokeWidth={1} />
              </span>
            )}

            {lead ? (
              <>
                <span className="absolute start-5 top-5 flex items-center gap-2">
                  <span className="bg-cream/85 px-2.5 py-1 text-[11px] font-bold tracking-wider text-navy backdrop-blur">
                    {lead.ref_no}
                  </span>
                  <StatusPill status={lead.status} />
                </span>

                {/* The record, set on a plaster strip across the foot of the
                    plate — an annotation on a drawing, not a floating card. */}
                <Link
                  href={`/properties/${lead.slug}`}
                  className="group absolute inset-x-0 bottom-0 block border-t border-cream-200 bg-cream/92 p-5 backdrop-blur transition-colors hover:bg-cream sm:p-6"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                    {t("plateEyebrow")}
                  </p>
                  <h2 className="mt-1.5 font-display text-xl font-extrabold leading-snug text-navy transition-colors group-hover:text-gold sm:text-2xl">
                    {lead.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {lead.area.name} · {lead.type.name}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <p className="font-display text-lg font-extrabold tabular-nums text-gold sm:text-xl">
                      {formatPrice(lead.price, lead.purpose, locale)}
                    </p>
                    <p className="flex items-center gap-4 text-xs font-semibold tabular-nums text-muted">
                      {lead.rooms !== null ? <span>{lead.rooms} {t("rooms")}</span> : null}
                      {sqm ? <span>{sqm} m²</span> : null}
                      <ArrowIcon
                        width={17}
                        height={17}
                        className="text-navy transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                      />
                    </p>
                  </div>
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
