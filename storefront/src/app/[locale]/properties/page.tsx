import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { localeAlternates } from "@/i18n/routing";
import { Crown, KeyRound, Star, Tag } from "lucide-react";

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
  const type = all(query.type);
  const purpose = one(query.purpose);
  const rooms = one(query.rooms);
  const priceMin = one(query.price_min);
  const priceMax = one(query.price_max);
  const featuredOnly = one(query.featured) === "1";
  const vipOnly = one(query.vip) === "1";

  const filters: Record<string, string | string[]> = {};
  if (area.length > 0) filters.area = area;
  if (type.length > 0) filters.type = type;
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

  // Named views only — see the badge's own comment below.
  const viewBadge =
    vipOnly
      ? { Icon: Crown, label: siteText(settings, "vip_title", typedLocale) ?? t("home.vipTitle") }
      : featuredOnly
        ? {
            Icon: Star,
            label: siteText(settings, "featured_title", typedLocale) ?? t("home.featuredTitle"),
          }
        : purpose === "sale"
          ? { Icon: Tag, label: t("purpose.sale") }
          : purpose === "rent"
            ? { Icon: KeyRound, label: t("purpose.rent") }
            : null;

  return (
    <>
      <LaunchHero banners={banners} settings={settings} locale={typedLocale} />

      <QuickSearch
        areas={areas}
        types={types}
        locale={typedLocale}
        variant="properties"
        initial={{ area, type, purpose, priceMin, priceMax }}
      />

      {/* Which view you are on, said plainly: "For sale" / "For rent" in a
          gold badge under the search bar, on request. Only for the views
          that are a named place in the nav -- a page filtered to three
          areas and a price range has no one word for what it is, and a
          badge reading "For sale" there would be describing a third of the
          filter and hiding the rest. */}
      {viewBadge ? (
        <div className="container listing-view-badge-row">
          <span className="listing-view-badge">
            <viewBadge.Icon size={16} />
            {viewBadge.label}
          </span>
        </div>
      ) : null}

      {/* The VIP row rides above the results on every listing view -- for
          sale, for rent, featured, and the unfiltered list -- three to a
          view, on request. Skipped only on `?vip=1`, where the results
          below *are* the VIP list and the row would repeat them, the same
          way `FeaturedStrip` steps aside on `?featured=1`. */}
      {vipOnly || vip.length === 0 ? null : (
        <section className="section properties-section inner-vip-section" id="vip-properties">
          <div className="container">
            {/* "VIP" in Latin before the crown, on request, with the button
                that opens the full list back beside it. The badge names the
                section; the button is what you press. */}
            <SectionHeading
              stackAction
              badge={
                <span className="section-badge">
                  <b>{t("card.vip")}</b>
                  <i>
                    <Crown size={19} />
                  </i>
                </span>
              }
              action={
                <Link className="button button-showcase" href="/properties?vip=1">
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
            {/* Same shape as VIP above: the word, the mark, then the door. */}
            <SectionHeading
              stackAction
              badge={
                /* The star alone -- the word is gone from both locales on
                   request. VIP keeps its "VIP" because the acronym is the
                   name of the tier; "Featured" was only labelling its own
                   icon. The section's wording lives on in the button below. */
                <span className="section-badge">
                  <i>
                    <Star size={19} />
                  </i>
                </span>
              }
              action={
                <Link className="button button-showcase" href="/properties?featured=1">
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
