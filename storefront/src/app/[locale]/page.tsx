import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import {
  getAreas,
  getBanners,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
  mediaUrl,
} from "@/lib/api";
import { HeroBanner, type HeroSlide } from "@/components/home/hero-banner";
import { HeroSplit } from "@/components/home/hero-split";
import { FeaturedMosaic } from "@/components/home/featured-mosaic";
import { PropertyRow } from "@/components/property/property-row";
import { IndexList } from "@/components/ui/index-list";
import { SectionHead, TextLink } from "@/components/ui/section-head";
import { ArrowIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("") },
  };
}

/**
 * Home.
 *
 * The page is a sequence of numbered bands rather than the portal stack it
 * used to be (banner slider → floating search card → 3-up featured grid → type
 * tiles → 3-up latest grid → CTA card). Each band is a different shape, in
 * descending order of commitment: one property, then a spread, then the
 * office's own campaign artwork, then the index, then the register, then the
 * way to ask for something that isn't listed.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "home" });
  const tMenu = await getTranslations({ locale, namespace: "menu" });

  // All reads degrade to empty lists when the API is down — the page still renders.
  const [featured, latest, areas, types, banners] = await Promise.all([
    getFeaturedProperties(typedLocale),
    getProperties(typedLocale, {}),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getBanners(typedLocale),
  ]);

  // Every value here comes from the admin panel — image, alt text and link
  // target alike. There is deliberately no bundled fallback artwork: a banner
  // baked into the build is one the office cannot change, which is the whole
  // problem this replaced. The launch banner is a seeded row (see
  // `Api/app/seed.py`), exactly like the seeded areas and property types.
  const slides: HeroSlide[] = banners.map((banner) => ({
    key: String(banner.id),
    src: mediaUrl(banner.image_url) ?? banner.image_url,
    alt: banner.alt,
    href: banner.href,
  }));

  // The hero shows one real property. Featured first, because that is the
  // office's own pick; otherwise the newest thing published. Whichever it is,
  // it is dropped from the band below so nothing appears twice on one screen.
  const lead = featured[0] ?? latest.items[0] ?? null;
  const mosaic = (featured[0] ? featured.slice(1) : featured).slice(0, 5);
  const rows = latest.items.filter((item) => item.id !== lead?.id).slice(0, 8);

  return (
    <div>
      <HeroSplit
        areas={areas}
        types={types}
        lead={lead}
        fallbackImage={slides[0]?.src ?? null}
        locale={typedLocale}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 01 — The office's own selection, as a spread                        */}
      {/* ------------------------------------------------------------------ */}
      {mosaic.length > 0 ? (
        <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6 sm:pt-20">
          <SectionHead
            index="01"
            eyebrow={t("featuredEyebrow")}
            title={t("featuredTitle")}
            subtitle={t("featuredSubtitle")}
            action={
              <Link href="/properties?featured=1">
                <TextLink>{t("viewAll")}</TextLink>
              </Link>
            }
          />
          <div className="mt-8">
            <FeaturedMosaic items={mosaic} locale={typedLocale} />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* The office's campaign artwork                                       */}
      {/* ------------------------------------------------------------------ */}
      {/* The banners the office uploads still get a full-bleed slot, but they
          no longer *are* the first screen. As a strip between two bands they
          work like a printed insert: seen, skippable, and changeable from the
          admin panel without touching the page's opening argument. */}
      {slides.length > 0 ? (
        <section className="pt-16 sm:pt-20">
          <p className="mx-auto flex max-w-(--container-site) items-center gap-3 px-4 pb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted sm:px-6">
            <span className="h-px w-7 bg-gold" aria-hidden />
            {t("bannerEyebrow")}
          </p>
          <HeroBanner slides={slides} />
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* 02 — The index: everywhere the office works, and in what            */}
      {/* ------------------------------------------------------------------ */}
      {areas.length > 0 || types.length > 0 ? (
        <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6 sm:pt-20">
          <SectionHead
            index="02"
            eyebrow={t("areasEyebrow")}
            title={t("areasTitle")}
            subtitle={t("areasSubtitle")}
          />
          <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {t("area")}
              </p>
              <IndexList
                entries={areas.map((area) => ({
                  href: `/properties?area=${area.slug}`,
                  label: area.name,
                }))}
                columns={2}
                emptyLabel={t("areasEmpty")}
              />
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {t("propertyType")}
              </p>
              <IndexList
                entries={types.map((type) => ({
                  href: `/properties?type=${type.key}`,
                  label: type.name,
                }))}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* 03 — The register                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6 sm:pt-20">
        <SectionHead
          index="03"
          eyebrow={t("latestEyebrow")}
          title={t("latestTitle")}
          subtitle={t("latestSubtitle")}
          action={
            <Link href="/properties">
              <TextLink>{t("viewAll")}</TextLink>
            </Link>
          }
        />

        {rows.length > 0 ? (
          <>
            <div className="mt-4">
              {rows.map((property, i) => (
                <PropertyRow
                  key={property.id}
                  property={property}
                  locale={typedLocale}
                  index={i + 1}
                />
              ))}
            </div>
            <div className="border-t border-cream-200 pt-8">
              <Link
                href="/properties"
                className="group/all inline-flex items-center gap-3 bg-navy px-8 py-4 text-sm font-bold text-cream transition-colors hover:bg-gold"
              >
                {t("browseAll")}
                <ArrowIcon
                  width={17}
                  height={17}
                  className="transition-transform group-hover/all:translate-x-1 rtl:rotate-180 rtl:group-hover/all:-translate-x-1"
                />
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-8 border-t border-cream-200 py-12 text-center text-muted">
            {t("latestEmpty")}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 04 — Ask for what isn't listed                                      */}
      {/* ------------------------------------------------------------------ */}
      {/* Full-bleed and split, rather than a dark rounded card floating in the
          middle of the page. The band is the page's one dark surface, so it
          ends the sequence instead of interrupting it. */}
      <section className="mt-16 border-t border-cream-200 bg-navy-950 text-cream sm:mt-20">
        <div className="mx-auto grid max-w-(--container-site) gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-light">
              <span className="h-px w-7 bg-gold-light" aria-hidden />
              {t("smartEyebrow")}
            </p>
            <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("requestTitle")}
            </h2>
            <p className="mt-4 max-w-lg text-cream/60">{t("requestSubtitle")}</p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              href="/request"
              className="group/req inline-flex items-center justify-between gap-6 border border-cream-50/25 px-7 py-5 text-base font-bold transition-colors hover:border-gold-light hover:text-gold-light lg:w-full"
            >
              {t("requestCta")}
              <ArrowIcon
                width={18}
                height={18}
                className="shrink-0 transition-transform group-hover/req:translate-x-1 rtl:rotate-180 rtl:group-hover/req:-translate-x-1"
              />
            </Link>
            <Link
              href="/smart-search"
              className="group/req inline-flex items-center justify-between gap-6 border border-cream-50/25 px-7 py-5 text-base font-bold transition-colors hover:border-gold-light hover:text-gold-light lg:w-full"
            >
              {tMenu("smartSearch")}
              <ArrowIcon
                width={18}
                height={18}
                className="shrink-0 transition-transform group-hover/req:translate-x-1 rtl:rotate-180 rtl:group-hover/req:-translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
