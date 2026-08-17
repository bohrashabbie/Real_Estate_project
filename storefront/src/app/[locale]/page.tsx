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
import { QuickSearch } from "@/components/home/quick-search";
import { PropertyCard } from "@/components/property/property-card";
import {
  ArrowIcon,
  BuildingIcon,
  ClipboardIcon,
  PinIcon,
  StarIcon,
} from "@/components/ui/icons";

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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "home" });

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

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero — the banners the office uploaded in the admin panel. The       */}
      {/* headline is baked into the artwork, so the page's own h1 is kept for */}
      {/* screen readers and search engines only; a second visible headline    */}
      {/* would fight it. Sits outside the page container to span the viewport.*/}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h1 className="sr-only">{t("heroTitle")}</h1>
        <HeroBanner slides={slides} />
      </section>

      {/* Search panel: below the banner in normal flow, at the same width as
          every section under it, so the page reads as one column. It used to
          float over the banner's lower edge, which cost the banner its bottom
          third and forced the slider dots into an offset that had to be kept
          in sync by hand. */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-8 sm:px-6">
        <QuickSearch areas={areas} types={types} />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured properties                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-20 sm:px-6">
        <SectionHeader
          eyebrow={t("featuredEyebrow")}
          eyebrowIcon={<StarIcon width={15} height={15} />}
          title={t("featuredTitle")}
          subtitle={t("featuredSubtitle")}
          action={
            <Link
              href="/properties?featured=1"
              className="inline-flex items-center gap-2 rounded-2xl border border-cream-200 bg-white px-6 py-3 text-sm font-bold text-navy shadow-card transition-colors hover:border-gold/50 hover:bg-gold-100"
            >
              {t("viewAll")}
              <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
            </Link>
          }
        />

        {featured.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((property) => (
              <PropertyCard key={property.id} property={property} locale={typedLocale} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-3xl border border-dashed border-cream-300 bg-white/60 p-10 text-center text-muted">
            {t("featuredEmpty")}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Browse by property type                                              */}
      {/* ------------------------------------------------------------------ */}
      {types.length > 0 ? (
        <section className="mx-auto max-w-(--container-site) px-4 pt-20 sm:px-6">
          <SectionHeader
            eyebrow={t("browseEyebrow")}
            eyebrowIcon={<BuildingIcon width={15} height={15} />}
            title={t("browseByType")}
            subtitle={t("browseByTypeSub")}
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {types.slice(0, 6).map((type) => (
              <Link
                key={type.key}
                href={`/properties?type=${type.key}`}
                className="group flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-cream-200 transition-all hover:-translate-y-1 hover:shadow-float hover:ring-gold/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-gold transition-colors group-hover:bg-gold-100">
                  <BuildingIcon width={26} height={26} />
                </span>
                <span className="text-sm font-bold text-navy">{type.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Latest listings                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-20 sm:px-6">
        <SectionHeader
          eyebrow={t("latestEyebrow")}
          eyebrowIcon={<PinIcon width={15} height={15} />}
          title={t("latestTitle")}
          subtitle={t("latestSubtitle")}
          action={
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-2xl border border-cream-200 bg-white px-6 py-3 text-sm font-bold text-navy shadow-card transition-colors hover:border-gold/50 hover:bg-gold-100"
            >
              {t("viewAll")}
              <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
            </Link>
          }
        />

        {latest.items.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* 12 divides by both the 3- and 4-column breakpoints, so the last
                row is never ragged. */}
            {latest.items.slice(0, 12).map((property) => (
              <PropertyCard key={property.id} property={property} locale={typedLocale} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-3xl border border-dashed border-cream-300 bg-white/60 p-10 text-center text-muted">
            {t("latestEmpty")}
          </p>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-2xl bg-navy px-9 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700"
          >
            {t("browseAll")}
            <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Request-your-property CTA band                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-8 text-center text-white shadow-float sm:p-14">
          <div className="hero-grid absolute inset-0" aria-hidden />
          <div className="gold-glow absolute -start-24 -bottom-24 h-80 w-80" aria-hidden />
          <div className="relative flex flex-col items-center gap-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-gold-light ring-1 ring-white/15">
              <ClipboardIcon width={26} height={26} />
            </span>
            <div>
              <h2 className="font-display text-[26px] font-normal leading-[1.4] sm:text-[40px]">{t("requestTitle")}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/65">{t("requestSubtitle")}</p>
            </div>
            <Link
              href="/request"
              className="bg-gold inline-flex items-center gap-2 rounded-2xl px-9 py-4 text-base font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {t("requestCta")}
              <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Left-aligned section header with a small gold rule, optional end action. */
function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-gold-dark">
          <span className="h-px w-8 bg-gold" aria-hidden />
          {eyebrowIcon}
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-[30px] font-normal leading-[1.5] text-navy sm:text-[40px]">{title}</h2>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
