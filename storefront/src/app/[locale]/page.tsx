import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Crown, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAreas,
  getBanners,
  getFeaturedProperties,
  getProperties,
  getPropertyTypes,
  getSettings,
  getVipProperties,
} from "@/lib/api";
import { LaunchHero } from "@/components/home/launch-hero";
import { PropertyCarousel } from "@/components/home/property-carousel";
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

  const [settings, banners, areas, types, vip, featured, all] = await Promise.all([
    getSettings(),
    getBanners(typedLocale),
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getVipProperties(typedLocale),
    getFeaturedProperties(typedLocale),
    getProperties(typedLocale, { limit: 8 }),
  ]);

  // The picks scroll rather than wrap, so the row is no longer cut to the four
  // that fit across — but "all listings" still must not repeat them, and it now
  // has to clear the VIP row as well, or the same card appears three times.
  const promotedIds = new Set([...vip, ...featured].map((property) => property.id));
  const latest = all.items.filter((property) => !promotedIds.has(property.id)).slice(0, 4);

  return (
    <>
      <LaunchHero banners={banners} />

      <QuickSearch areas={areas} types={types} locale={typedLocale} />

      {vip.length > 0 ? (
        <section className="section properties-section home-vip-section" id="vip-properties">
          <div className="container">
            <SectionHeading
              kicker={t("home.vipKicker")}
              title={t("home.vipTitle")}
              stackAction
              action={
                <Link className="button button-outline" href="/properties?vip=1">
                  <Crown size={15} />
                  {t("home.vipCta")}
                </Link>
              }
            />
            <PropertyCarousel properties={vip} locale={typedLocale} />
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="section properties-section home-featured-section" id="featured-properties">
          <div className="container">
            <SectionHeading
              kicker={t("home.featuredKicker")}
              title={t("home.featuredTitle")}
              stackAction
              action={
                <Link className="button button-outline" href="/properties?featured=1">
                  <Star size={15} />
                  {t("home.featuredCta")}
                </Link>
              }
            />
            <PropertyCarousel properties={featured} locale={typedLocale} />
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
