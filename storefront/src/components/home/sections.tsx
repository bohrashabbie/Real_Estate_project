import { getTranslations } from "next-intl/server";
import { ArrowLeft, Building2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { formatPhone, waLink } from "@/lib/format";
import { mediaUrl, siteText, type Banner, type PropertyType, type SiteSettings } from "@/lib/api";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ScrollRail } from "@/components/ui/scroll-rail";
import type { Locale } from "@/i18n/routing";

/** The gold strip above the footer: one line, one WhatsApp number. Rendered by
 *  the layout, so it closes every page rather than only the home page. */
export async function ContactBand({ settings }: { settings: SiteSettings }) {
  const t = await getTranslations("contactBand");
  const whatsapp = settings.whatsapp?.trim();
  if (!whatsapp) return null;

  return (
    <section className="contact-band">
      <div className="container">
        <div>
          <WhatsAppIcon size={22} />
          <span>
            <strong>{t("title")}</strong>
            <small>{t("subtitle")}</small>
          </span>
        </div>
        <a href={waLink(whatsapp, t("message"))} target="_blank" rel="noopener noreferrer">
          <ArrowLeft size={15} />
          {formatPhone(whatsapp)}
        </a>
      </div>
    </section>
  );
}

/**
 * The office's advert band, managed from admin → Banners → Home adverts, on
 * request -- in place of the two photographs of a villa and a tower that used
 * to stand here and could only be changed by editing the catalogue.
 *
 * Two to a row, the size those photographs were. More than two scroll sideways
 * on the same rail (and bar) as the property rows; a single advert runs the
 * full width. The artwork carries its own message, so nothing is laid over it
 * -- the alt text the office writes is its accessible name.
 */
function HomeAds({ ads, ariaLabel }: { ads: Banner[]; ariaLabel: string }) {
  const shown = ads.flatMap((ad) => {
    const image = mediaUrl(ad.image_url);
    return image ? [{ ...ad, image }] : [];
  });
  if (shown.length === 0) return null;

  return (
    <ScrollRail
      className={`home-ads${shown.length === 1 ? " is-single" : ""}`}
      trackClassName="home-ads-track"
      ariaLabel={ariaLabel}
    >
      {shown.map((ad) => {
        // eslint-disable-next-line @next/next/no-img-element
        const artwork = <img src={ad.image} alt={ad.alt} loading="lazy" />;
        if (!ad.href) {
          return (
            <div className="home-ad" key={ad.id}>
              {artwork}
            </div>
          );
        }
        return /^https?:\/\//.test(ad.href) ? (
          <a className="home-ad" key={ad.id} href={ad.href} target="_blank" rel="noopener noreferrer">
            {artwork}
          </a>
        ) : (
          <Link className="home-ad" key={ad.id} href={ad.href}>
            {artwork}
          </Link>
        );
      })}
    </ScrollRail>
  );
}

/**
 * "Browse by property type" — the six tiles between the office's picks and
 * everything else, restored from the pre-reference build.
 *
 * A type is the first cut most people make, before area and before price, and
 * the quick-search bar only offers it inside a menu they have to open. The
 * tiles are the same six links spelled out.
 *
 * One building mark on every tile, as before: the reader is scanning the six
 * names, and six different pictograms make them look like six different kinds
 * of thing rather than six values of one field. The colours are the current
 * palette's, not that build's retired green-and-terracotta.
 *
 * The row is a marquee, not a scroller: it drifts continuously like an ad
 * strip rather than sitting still behind a scrollbar waiting to be dragged.
 * That is done entirely in CSS (`.type-marquee` in globals.css), so this
 * stays a server component — an earlier JS version drove a scroll container
 * on a timer and deadlocked against its own scroll handler.
 *
 * The list is rendered twice for that, as two identical sibling copies: the
 * track animates by exactly half its width, which is exactly one copy, so
 * the seam lands where the loop began and the drift never visibly jumps.
 * The second copy is `aria-hidden` and untabbable — it is the same set of
 * links, and a screen reader should hear each type once.
 */
export async function PropertyTypeGrid({
  types,
  settings,
  locale,
  ads = [],
}: {
  types: PropertyType[];
  settings: SiteSettings;
  locale: Locale;
  /** The home advert band's live banners (`placement=home_ad`). Empty until
   *  the office publishes one, and the band drops out rather than leaving a
   *  hole. */
  ads?: Banner[];
}) {
  const t = await getTranslations("home");
  // The reference showed six because it only ever had six; the marquee now
  // carries the row sideways on its own, so an office that adds a seventh
  // type doesn't need this cut raised by hand.
  const shown = types;
  if (shown.length === 0) return null;

  const card = (type: PropertyType, clone: boolean) => (
    <Link
      key={`${clone ? "clone" : "real"}-${type.key}`}
      className="type-card"
      href={`/properties?type=${type.key}`}
      tabIndex={clone ? -1 : undefined}
    >
      <span>
        <Building2 size={26} />
      </span>
      <strong>{type.name}</strong>
    </Link>
  );

  return (
    <section className="section type-section" id="property-types">
      <div className="container">
        {/* No `body` any more, on request -- "start the content directly
            from the property listings". The heading carries the section on
            its own and the tiles follow it immediately. `types_body` is
            still in Settings but nothing reads it now. */}
        <SectionHeading title={siteText(settings, "types_title", locale) ?? t("typesTitle")} />

        <HomeAds ads={ads} ariaLabel={t("adsAria")} />

        <div className="type-marquee">
          {/* The loop is timed per card (5s each), not per lap: a nine-type
              office drifts at the same speed as a six-type one instead of
              racing to finish a fixed-length lap. */}
          <div
            className="type-marquee-track"
            style={{ animationDuration: `${shown.length * 5}s` }}
          >
            <div className="type-marquee-copy">
              {shown.map((type) => card(type, false))}
            </div>
            <div className="type-marquee-copy" aria-hidden>
              {shown.map((type) => card(type, true))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The heading + button that opens every property section.
 *
 * `stackAction` moves the button out of the far end of the row and under the
 * title, which is where it belongs on a section that has no body sentence:
 * with nothing between them, a button pinned to the opposite margin reads as
 * unrelated to the heading it acts on.
 */
export function SectionHeading({
  kicker,
  title,
  badge,
  body,
  action,
  stackAction = false,
}: {
  kicker?: string;
  /** Optional: VIP and Featured drop it and let their badge stand for the
   *  section on its own, on request -- the gold "VIP" and the star say it,
   *  and a title under them was saying it twice. The badge keeps the title
   *  as its accessible name, so nothing is lost to a screen reader (see
   *  those call sites' `aria-label`). */
  title?: string;
  /** Stands where the title would: the office's logo on All listings. A
   *  section has one or the other, never both. */
  badge?: React.ReactNode;
  body?: string;
  action?: React.ReactNode;
  stackAction?: boolean;
}) {
  const titled = Boolean(title);
  return (
    <div
      className={`section-heading heading-row${stackAction ? " heading-stacked" : ""}${
        titled ? "" : " heading-badge-only"
      }`}
    >
      <div>
        {kicker ? <span className="section-kicker">{kicker}</span> : null}
        {title ? <h2>{title}</h2> : null}
        {badge}
        {body ? <p>{body}</p> : null}
        {stackAction ? action : null}
      </div>
      {stackAction ? null : action}
    </div>
  );
}
