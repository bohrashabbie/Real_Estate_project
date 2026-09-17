import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { all, one, type SearchParams } from "@/lib/search-params";
import { QuickSearch } from "@/components/home/quick-search";
import { MapExplorer } from "@/components/map/map-explorer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mapPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/map`, languages: localeAlternates("/map") },
  };
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const query = await searchParams;
  const t = await getTranslations("mapPage");

  // The same filters the listing page reads, from the same query string, so
  // a search built on one page means the same thing on the other.
  const area = all(query.area);
  const type = all(query.type);
  const purpose = one(query.purpose);
  const priceMin = one(query.price_min);
  const priceMax = one(query.price_max);

  const filters: Record<string, string | string[]> = {};
  if (area.length > 0) filters.area = area;
  if (type.length > 0) filters.type = type;
  if (purpose) filters.purpose = purpose;
  if (priceMin) filters.price_min = priceMin;
  if (priceMax) filters.price_max = priceMax;

  const [areas, types] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
  ]);

  return (
    <>
      <section className="page-hero map-page-hero">
        <div className="container">
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </section>

      {/* The listing pages' search bar, on request, pointed back at this
          page: searching here narrows the pins rather than leaving the map. */}
      <QuickSearch
        areas={areas}
        types={types}
        locale={typedLocale}
        variant="properties"
        action="/map"
        initial={{ area, type, purpose, priceMin, priceMax }}
      />

      <section className="section map-browser">
        <div className="container">
          <MapExplorer locale={typedLocale} filters={filters} />
        </div>
      </section>
    </>
  );
}
