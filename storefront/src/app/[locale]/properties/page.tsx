import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { localeAlternates } from "@/i18n/routing";
import { Crown, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  getAreas,
  getBanners,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
  getSettings,
  getVipProperties,
  siteText,
} from "@/lib/api";
import { all, one, type SearchParams } from "@/lib/search-params";
import { LaunchHero } from "@/components/home/launch-hero";
import { QuickSearch } from "@/components/home/quick-search";
import { SectionHeading } from "@/components/home/sections";
import { VipCarousel } from "@/components/home/vip-carousel";
import { PropertyCarousel } from "@/components/properties/property-carousel";
import { ResultsGrid } from "@/components/properties/results-grid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/properties`, languages: localeAlternates("/properties") },
  };
}

type Search = SearchParams;

export default async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const query = await searchParams;
  const t = await getTranslations();

  const area = all(query.area);
  const type = one(query.type);
  const purpose = one(query.purpose);
  const rooms = one(query.rooms);
  const priceMin = one(query.price_min);
  const priceMax = one(query.price_max);
  const featuredOnly = one(query.featured) === "1";
  const vipOnly = one(query.vip) === "1";

  const filters: Record<string, string | string[]> = {};
  if (area.length > 0) filters.area = area;
  if (type) filters.type = type;
  if (purpose) filters.purpose = purpose;
  if (rooms) filters.rooms = rooms;
  if (priceMin) filters.price_min = priceMin;
  if (priceMax) filters.price_max = priceMax;
  // `featured=1` is the admin's own shortlist, which the API exposes as
  // `premium_only` rather than a boolean column on the list endpoint.
  if (featuredOnly) filters.premium_only = "true";
  if (vipOnly) filters.vip_only = "true";

  const [settings, banners, areas, types, results, featured, vip] = await Promise.all([
    getSettings(),
    getBanners(typedLocale),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    // 24, not 12: the grid pages eight at a time now, so one server round
    // trip hands the visitor three ready pages instead of one and a half.
    getProperties(typedLocale, { ...filters, limit: 24 }),
    getFeaturedProperties(typedLocale),
    getVipProperties(typedLocale),
  ]);

  return (
    <>
      <LaunchHero banners={banners} settings={settings} locale={typedLocale} />

      <QuickSearch
        areas={areas}
        types={types}
        locale={typedLocale}
        variant="properties"
        initial={{ area, type, purpose }}
      />

      {/* The VIP row rides above the results on every listing view -- for
          sale, for rent, featured, and the unfiltered list -- three to a
          view, on request. Skipped only on `?vip=1`, where the results
          below *are* the VIP list and the row would repeat them, the same
          way `FeaturedStrip` steps aside on `?featured=1`. */}
      {vipOnly || vip.length === 0 ? null : (
        <section className="section properties-section inner-vip-section" id="vip-properties">
          <div className="container">
            <SectionHeading
              title={siteText(settings, "vip_title", typedLocale) ?? t("home.vipTitle")}
              stackAction
              action={
                <Link className="button button-vip" href="/properties?vip=1">
                  <Crown size={15} />
                  {siteText(settings, "vip_cta", typedLocale) ?? t("home.vipCta")}
                </Link>
              }
            />
            <VipCarousel properties={vip} locale={typedLocale} columns={3} />
          </div>
        </section>
      )}

      {/* The office's picks, in the home page's own carousel rather than the
          gold rail that used to ride above the results -- on request, so the
          listing pages read as the home page does. Skipped on `?featured=1`,
          where the paginated grid below already is this list. */}
      {featuredOnly || featured.length === 0 ? null : (
        <section className="section properties-section inner-featured-section">
          <div className="container">
            <SectionHeading
              title={siteText(settings, "featured_title", typedLocale) ?? t("home.featuredTitle")}
              stackAction
              action={
                <Link className="button button-outline" href="/properties?featured=1">
                  <Star size={15} />
                  {siteText(settings, "featured_cta", typedLocale) ?? t("home.featuredCta")}
                </Link>
              }
            />
            <PropertyCarousel properties={featured} locale={typedLocale} />
          </div>
        </section>
      )}

      <section className="section properties-browser">
        <div className="container">
          <div className="property-explorer">
            <section className="explorer-results" id="results">
              <ResultsGrid initial={results} filters={filters} locale={typedLocale} />
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
