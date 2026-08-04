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
import { ArrowIcon, ClipboardIcon, SparkleIcon, StarIcon } from "@/components/ui/icons";

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

  return (
    <div>
      {/* Hero — navy band, headline from the old logo lockup. */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-(--container-site) px-4 pb-28 pt-14 text-center sm:px-6 sm:pt-20">
          <p className="text-sm font-bold tracking-wide text-gold">{t("heroEyebrow")}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Quick search card overlapping the hero. */}
      <section className="mx-auto -mt-20 max-w-2xl px-4 sm:px-6">
        <QuickSearch areas={areas} types={types} />
      </section>

      {/* Our distinctive properties. */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-gold">
            <StarIcon width={16} height={16} />
            {t("featuredEyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{t("featuredTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted">{t("featuredSubtitle")}</p>
          <Link
            href="/properties?featured=1"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-bold text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
          >
            <ArrowIcon width={18} height={18} className="rotate-180 rtl:rotate-0" />
            {t("featuredCta")}
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property) => (
              <PropertyCard key={property.id} property={property} locale={typedLocale} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-cream-300 bg-white/60 p-10 text-center text-muted">
            {t("featuredEmpty")}
          </p>
        )}
      </section>

      {/* Smart search promo. */}
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-b from-white to-cream-100 p-7 shadow-card ring-1 ring-cream-200 sm:p-9">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold">
            <SparkleIcon width={26} height={26} />
          </span>
          <p className="mt-5 text-sm font-bold text-gold-dark">{t("smartEyebrow")}</p>
          <h2 className="mt-1 text-2xl font-bold text-navy sm:text-3xl">{t("smartTitle")}</h2>
          <p className="mt-2 text-muted">{t("smartSubtitle")}</p>
          <Link
            href="/smart-search"
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-navy hover:text-white"
          >
            <ArrowIcon width={18} height={18} className="rotate-180 rtl:rotate-0" />
            {tCommon("menu.smartSearch")}
          </Link>
        </div>
      </section>

      {/* All ads — latest grid. */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-gold">{t("latestEyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{t("latestTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted">{t("latestSubtitle")}</p>
        </div>

        {latest.items.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.items.slice(0, 9).map((property) => (
              <PropertyCard key={property.id} property={property} locale={typedLocale} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-cream-300 bg-white/60 p-10 text-center text-muted">
            {t("latestEmpty")}
          </p>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3.5 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700"
          >
            {t("browseAll")}
            <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>

      {/* Request-your-property CTA band. */}
      <section className="mx-auto max-w-(--container-site) px-4 pt-16 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-navy p-8 text-center text-white sm:p-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-700 text-gold">
            <ClipboardIcon width={26} height={26} />
          </span>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t("requestTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-white/70">{t("requestSubtitle")}</p>
          </div>
          <Link
            href="/request"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-base font-bold text-navy shadow-float transition-colors hover:bg-gold-dark hover:text-white"
          >
            {t("requestCta")}
            <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
