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
import { VipCarousel } from "@/components/home/vip-carousel";
import { QuickSearch } from "@/components/home/quick-search";
import {
  ContactBand,
  PropertyTypeGrid,
  RequestTeaser,
  SectionHeading,
} from "@/components/home/sections";
import { PropertyCarousel } from "@/components/properties/property-carousel";

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
    // Wide enough that excluding every VIP/Featured pick still leaves the
    // rest of the catalogue behind it — at 8, a handful of promoted ids
    // inside that window was enough to starve this row down to almost
    // nothing, which is exactly backwards for the one row meant to catch
    // everything the two curated rows above it didn't.
    getProperties(typedLocale, { limit: 24 }),
  ]);

  // "All listings" means the newest of what is left — it has to clear
  // everything already promoted above it (VIP and every Featured pick, not
  // just the first page of the Featured carousel), or the same card can
  // appear twice on the front page.
  const promotedIds = new Set([...vip, ...featured].map((property) => property.id));
  const latest = all.items.filter((property) => !promotedIds.has(property.id));

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
            <VipCarousel properties={vip} locale={typedLocale} />
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
            <PropertyCarousel properties={latest} locale={typedLocale} />
          </div>
        </section>
      ) : null}

      <RequestTeaser />
      <ContactBand settings={settings} />
    </>
  );
}
