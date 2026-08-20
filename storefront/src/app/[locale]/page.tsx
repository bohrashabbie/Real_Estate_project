import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAreas,
  getBanners,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
  getSettings,
} from "@/lib/api";
import { LaunchHero } from "@/components/home/launch-hero";
import { QuickSearch } from "@/components/home/quick-search";
import {
  ContactBand,
  PropertyTypeGrid,
  RequestTeaser,
  SectionHeading,
  SmartOptionCard,
} from "@/components/home/sections";
import { PropertyCard } from "@/components/property/property-card";

/**
 * The front page, in the reference's order: campaign hero, quick search,
 * the office's picks, the property types, everything else, the request nudge,
 * the WhatsApp band.
 *
 * Every read is a `safeGet`, so an API that is down or a `next build` running
 * without one still produces a page — the grids simply come back empty and
 * their sections drop out rather than the route throwing.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations();

  const [settings, banners, areas, types, featured, all] = await Promise.all([
    getSettings(),
    getBanners(typedLocale),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getFeaturedProperties(typedLocale),
    getProperties(typedLocale, { limit: 8 }),
  ]);

  // The reference's two grids are four cards each, and the second must not
  // repeat the first — "all listings" means the newest of what is left.
  const featuredFour = featured.slice(0, 4);
  const featuredIds = new Set(featuredFour.map((property) => property.id));
  const latest = all.items.filter((property) => !featuredIds.has(property.id)).slice(0, 4);

  return (
    <>
      <LaunchHero banners={banners} />

      <QuickSearch areas={areas} types={types} locale={typedLocale} />

      {featuredFour.length > 0 ? (
        <section className="section properties-section" id="featured-properties">
          <div className="container">
            <SectionHeading
              kicker={t("home.featuredKicker")}
              title={t("home.featuredTitle")}
              body={t("home.featuredBody")}
              action={
                <Link className="button button-outline" href="/properties?featured=1">
                  <Star size={15} />
                  {t("home.featuredCta")}
                </Link>
              }
            />
            <div className="property-grid featured-four">
              {featuredFour.map((property) => (
                <PropertyCard key={property.id} property={property} locale={typedLocale} />
              ))}
            </div>
            <SmartOptionCard />
          </div>
        </section>
      ) : null}

      <PropertyTypeGrid types={types} />

      {latest.length > 0 ? (
        <section className="section properties-section home-all-properties" id="all-properties">
          <div className="container">
            <SectionHeading
              kicker={t("home.allKicker")}
              title={t("home.allTitle")}
              body={t("home.allBody")}
              action={
                <Link className="button button-outline home-all-properties-link" href="/properties">
                  <ArrowLeft size={15} />
                  {t("home.allCta")}
                </Link>
              }
            />
            <div className="property-grid featured-four">
              {latest.map((property) => (
                <PropertyCard key={property.id} property={property} locale={typedLocale} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <RequestTeaser />
      <ContactBand settings={settings} />
    </>
  );
}
