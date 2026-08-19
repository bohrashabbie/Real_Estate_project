import { getTranslations } from "next-intl/server";
import { ArrowLeft, Clock3, MessageCircle, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { formatPhone, waLink } from "@/lib/format";
import type { SiteSettings } from "@/lib/api";

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
          <MessageCircle size={20} />
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

/** The heading + right-hand button that opens every property section. */
export function SectionHeading({
  kicker,
  title,
  body,
  action,
}: {
  kicker: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading heading-row">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
