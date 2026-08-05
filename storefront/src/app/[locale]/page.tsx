import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import {
  getAreas,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
} from "@/lib/api";
import { QuickSearch } from "@/components/home/quick-search";
import { PropertyCard } from "@/components/property/property-card";
import {
  ArrowIcon,
  BuildingIcon,
  ClipboardIcon,
  PinIcon,
  SparkleIcon,
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
  const tCommon = await getTranslations({ locale });

  // All reads degrade to empty lists when the API is down — the page still renders.
  const [featured, latest, areas, types] = await Promise.all([
    getFeaturedProperties(typedLocale),
    getProperties(typedLocale, {}),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
  ]);

  const stats = [
    { value: `${latest.items.length}${latest.next_cursor ? "+" : ""}`, label: t("stats.listings") },
    { value: `${areas.length}+`, label: t("stats.areas") },
    { value: "24/7", label: t("stats.support") },
  ];

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero banner — deep navy, blueprint grid, gold glow, skyline.        */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="gold-glow absolute -top-40 start-1/2 h-[34rem] w-[44rem] -translate-x-1/2 rtl:translate-x-1/2" aria-hidden />
        <div className="gold-glow animate-float-slow absolute -bottom-24 -end-32 h-96 w-96 opacity-60" aria-hidden />
        <HeroSkyline className="absolute inset-x-0 bottom-0 h-28 w-full text-navy-900 sm:h-40" />

        <div className="relative mx-auto max-w-(--container-site) px-4 pb-44 pt-16 text-center sm:px-6 sm:pb-52 sm:pt-24">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-5 py-2 text-sm font-bold text-gold-light backdrop-blur">
            <SparkleIcon width={16} height={16} />
            {t("heroEyebrow")}
          </p>
          <h1
            className="animate-fade-up mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.15] sm:text-6xl"
            style={{ animationDelay: "0.1s" }}
          >
            {t("heroTitleLead")}{" "}
            <span className="text-gold-gradient">{t("heroTitleAccent")}</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-white/65 sm:text-lg"
            style={{ animationDelay: "0.2s" }}
          >
            {t("heroSubtitle")}
          </p>

          {/* Stats band */}
          <div
            className="animate-fade-up mx-auto mt-9 flex max-w-lg items-stretch justify-center divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur rtl:divide-x-reverse"
            style={{ animationDelay: "0.3s" }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex-1 px-4 py-4 sm:px-6">
                <p className="font-display text-2xl font-extrabold text-gold-light sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/60 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search panel overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-28 max-w-4xl px-4 sm:-mt-32 sm:px-6">
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
              className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-white px-6 py-3 text-sm font-bold text-navy shadow-card transition-colors hover:border-gold/50 hover:bg-gold-100"
            >
              {t("viewAll")}
              <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
            </Link>
          }
        />

        {featured.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      {/* Smart search promo                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-8 text-white shadow-float sm:p-12">
          <div className="hero-grid absolute inset-0" aria-hidden />
          <div className="gold-glow absolute -end-24 -top-24 h-80 w-80" aria-hidden />
          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-gradient text-white shadow-gold">
                <SparkleIcon width={26} height={26} />
              </span>
              <p className="mt-5 text-sm font-bold text-gold-light">{t("smartEyebrow")}</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
                {t("smartTitle")}
              </h2>
              <p className="mt-2 text-white/65">{t("smartSubtitle")}</p>
            </div>
            <Link
              href="/smart-search"
              className="bg-gold-gradient inline-flex shrink-0 items-center gap-2.5 rounded-full px-8 py-4 text-base font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {tCommon("menu.smartSearch")}
              <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

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
              className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-white px-6 py-3 text-sm font-bold text-navy shadow-card transition-colors hover:border-gold/50 hover:bg-gold-100"
            >
              {t("viewAll")}
              <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
            </Link>
          }
        />

        {latest.items.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.items.slice(0, 9).map((property) => (
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
            className="inline-flex items-center gap-2 rounded-full bg-navy px-9 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700"
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
              <h2 className="font-display text-2xl font-extrabold sm:text-4xl">{t("requestTitle")}</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/65">{t("requestSubtitle")}</p>
            </div>
            <Link
              href="/request"
              className="bg-gold-gradient inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
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
        <h2 className="mt-2.5 font-display text-3xl font-extrabold text-navy sm:text-4xl">{title}</h2>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** Flat city-skyline silhouette anchoring the hero to real estate. */
function HeroSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M0 160V120h40V80h24v40h30V60h14V40h14v20h14v60h36V90h44v30h20V50h16V30h16v20h16v70h30V85h40v35h28V70h12V50h12v20h12v50h42V95h38v25h26V55h14V25h6V10h6v15h6v30h14v65h36V90h40v30h24V45h16V20h16v25h16v75h32V85h36v35h26V65h12V45h12v20h12v55h40V95h36v25h30V60h14V38h14v22h14v60h34V90h42v30h24V55h16V35h16v20h16v50h30V85h38v75H0Z" />
    </svg>
  );
}
