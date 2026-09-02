import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { localeAlternates } from "@/i18n/routing";
import {
  getAreas,
  getBanners,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
  getSettings,
} from "@/lib/api";
import { all, one, type SearchParams } from "@/lib/search-params";
import { LaunchHero } from "@/components/home/launch-hero";
import { QuickSearch } from "@/components/home/quick-search";
import { FeaturedStrip } from "@/components/properties/featured-strip";
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

  const [settings, banners, areas, types, results, featured] = await Promise.all([
    getSettings(),
    getBanners(typedLocale),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getProperties(typedLocale, { ...filters, limit: 12 }),
    getFeaturedProperties(typedLocale),
  ]);

  const count = results.items.length + (results.next_cursor ? 1 : 0);

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

      <section className="section properties-browser">
        <div className="container">
          <div className="property-explorer">
            <section className="explorer-results" id="results">
              <div className="results-top">
                <div>
                  <span>{t("listing.resultsLabel")}</span>
                  <strong>
                    {results.next_cursor
                      ? t("listing.countMore", { count: String(results.items.length) })
                      : t("listing.count", { count: String(count) })}
                  </strong>
                </div>
              </div>

              {featuredOnly ? null : (
                <FeaturedStrip properties={featured.slice(0, 6)} locale={typedLocale} />
              )}

              <ResultsGrid initial={results} filters={filters} locale={typedLocale} />
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
