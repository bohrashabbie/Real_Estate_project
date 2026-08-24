import { getTranslations } from "next-intl/server";
import { ArrowLeft, Building2, Clock3, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { formatPhone, waLink } from "@/lib/format";
import type { PropertyType, SiteSettings } from "@/lib/api";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

/** The gold-outlined "answer five questions" nudge under each grid. */
export async function SmartOptionCard() {
  const t = await getTranslations("smart");

  return (
    <div className="smart-option-card">
      <span className="smart-option-icon">
        <Sparkles size={19} />
      </span>
      <div className="smart-option-copy">
        <span>{t("optionKicker")}</span>
        <h3>{t("optionTitle")}</h3>
        <p>{t("optionBody")}</p>
      </div>
      <div className="smart-option-action">
        <small>
          <Clock3 size={14} />
          {t("under30")}
        </small>
        <Link className="button button-outline small-button" href="/smart-search">
          <Sparkles size={14} />
          {t("optionCta")}
        </Link>
      </div>
    </div>
  );
}

/** "Didn't find it? Tell us what you want." */
export async function RequestTeaser() {
  const t = await getTranslations("requestTeaser");

  return (
    <section className="request-teaser">
      <div className="container request-teaser-inner">
        <div>
          <Sparkles size={18} />
          <span>{t("kicker")}</span>
          <h2>{t("title")}</h2>
        </div>
        <Link className="button button-gold button-large" href="/request">
          <ArrowLeft size={16} />
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}

/** The gold strip above the footer: one line, one WhatsApp number. */
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
 */
export async function PropertyTypeGrid({ types }: { types: PropertyType[] }) {
  const t = await getTranslations("home");
  const shown = types.slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <section className="section type-section" id="property-types">
      <div className="container">
        <SectionHeading
          kicker={t("typesKicker")}
          title={t("typesTitle")}
          body={t("typesBody")}
        />
        <div className="type-grid">
          {shown.map((type) => (
            <Link key={type.key} className="type-card" href={`/properties?type=${type.key}`}>
              <span>
                <Building2 size={26} />
              </span>
              <strong>{type.name}</strong>
            </Link>
          ))}
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
  body,
  action,
  stackAction = false,
}: {
  kicker: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  stackAction?: boolean;
}) {
  return (
    <div className={`section-heading heading-row${stackAction ? " heading-stacked" : ""}`}>
      <div>
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        {stackAction ? action : null}
      </div>
      {stackAction ? null : action}
    </div>
  );
}
