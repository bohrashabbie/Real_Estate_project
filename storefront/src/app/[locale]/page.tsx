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
import { VipCarousel } from "@/components/home/vip-carousel";
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
      ) : null}

      {featured.length > 0 ? (
        <section className="section properties-section home-featured-section" id="featured-properties">
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
              badge={
                /* The office's own mark rather than words, on request.
                   Swapping `/brand/section-logo.webp` swaps it everywhere
                   -- no code change to re-brand this row. */
                <Link
                  className="section-logo-badge"
                  href="/properties"
                  aria-label={siteText(settings, "all_title", typedLocale) ?? t("home.allTitle")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/section-logo.webp" alt="" aria-hidden />
                </Link>
              }
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
