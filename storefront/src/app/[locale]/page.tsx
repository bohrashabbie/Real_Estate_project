import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crown, KeyRound, Star, Tag } from "lucide-react";

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
  mediaUrl,
  siteText,
} from "@/lib/api";
import { LaunchHero } from "@/components/home/launch-hero";
import { QuickSearch } from "@/components/home/quick-search";
import {
  ContactBand,
  PropertyTypeGrid,
  SectionHeading,
} from "@/components/home/sections";
import { FooterSearch } from "@/components/home/footer-search";
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

  // The pair of photographs standing over the type row: a villa and
  // something tall. Taken from the catalogue rather than shipped as
  // artwork, so the office never advertises a building it doesn't have.
  // Searched across everything fetched, not just `latest` -- a villa that
  // happens to be this week's VIP pick is still the best villa to show.
  const shotFor = (keys: string[]) => {
    for (const key of keys) {
      const match = all.items.find(
        (property) => property.type.key === key && property.main_image,
      );
      if (match) {
        return {
          href: `/properties?type=${match.type.key}`,
          image: mediaUrl(match.main_image)!,
          label: match.type.name,
        };
      }
    }
    return null;
  };
  const typeShots = [
    shotFor(["villa", "chalet"]),
    shotFor(["apartment", "building", "floor", "office"]),
  ].filter((shot): shot is NonNullable<typeof shot> => shot !== null);

  return (
    <>
      <LaunchHero banners={banners} settings={settings} locale={typedLocale} />

      <QuickSearch areas={areas} types={types} locale={typedLocale} />

      {vip.length > 0 ? (
        <section className="section properties-section home-vip-section" id="vip-properties">
          <div className="container">
            <SectionHeading
              title={siteText(settings, "vip_title", typedLocale) ?? t("home.vipTitle")}
              stackAction
              action={
                /* Icon alone, on request -- the crown says VIP under a
                   heading that already says it in words. The label it used
                   to show is still the accessible name and the tooltip, so
                   nothing is lost to a screen reader or a hesitating
                   cursor, and the office still edits it in Settings. */
                <Link
                  className="button button-showcase button-icon"
                  href="/properties?vip=1"
                  aria-label={siteText(settings, "vip_cta", typedLocale) ?? t("home.vipCta")}
                  title={siteText(settings, "vip_cta", typedLocale) ?? t("home.vipCta")}
                >
                  <Crown size={19} />
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
              title={siteText(settings, "featured_title", typedLocale) ?? t("home.featuredTitle")}
              stackAction
              action={
                <Link
                  className="button button-showcase button-icon"
                  href="/properties?featured=1"
                  aria-label={
                    siteText(settings, "featured_cta", typedLocale) ?? t("home.featuredCta")
                  }
                  title={siteText(settings, "featured_cta", typedLocale) ?? t("home.featuredCta")}
                >
                  <Star size={19} />
                </Link>
              }
            />
            <PropertyCarousel properties={featured} locale={typedLocale} />
          </div>
        </section>
      ) : null}

      <PropertyTypeGrid types={types} settings={settings} locale={typedLocale} shots={typeShots} />

      {latest.length > 0 ? (
        <section className="section properties-section home-all-properties" id="all-properties">
          <div className="container">
            {/* Two doors rather than one, on request: the single "open the
                properties page" button said where it went but not what was
                behind it, and sale and rent are the two questions a visitor
                actually arrives with. They sit at the end of the heading
                row rather than stacked under the title -- a pair reads as a
                choice, which is the point. */}
            <SectionHeading
              title={siteText(settings, "all_title", typedLocale) ?? t("home.allTitle")}
              action={
                <div className="section-action-pair">
                  <Link className="button button-showcase" href="/properties?purpose=sale">
                    <Tag size={15} />
                    {t("home.saleCta")}
                  </Link>
                  <Link className="button button-showcase" href="/properties?purpose=rent">
                    <KeyRound size={15} />
                    {t("home.rentCta")}
                  </Link>
                </div>
              }
            />
            <PropertyCarousel properties={latest} locale={typedLocale} />
          </div>
        </section>
      ) : null}

      {/* ContactBand is last so it lands directly above <Footer> (which
          layout.tsx renders after the page): the search-again cards answer
          the listings above them, and the WhatsApp band is the last word
          before the footer. */}
      <FooterSearch areas={areas} types={types} locale={typedLocale} />
      <ContactBand settings={settings} />
    </>
  );
}
