import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Camera, Mail, MessageCircle, Phone } from "lucide-react";

import { localeAlternates } from "@/i18n/routing";
import { getSettings } from "@/lib/api";
import { formatPhone, telLink, waLink } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/contact`, languages: localeAlternates("/contact") },
  };
}

function socialUrl(base: string, handle: string | null | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${base}${value.replace(/^@/, "")}`;
}

/**
 * Every channel the office has configured, and nothing it has not.
 *
 * The reference's own subtitle makes the promise out loud — "we do not show an
 * empty field before it is entered from the admin panel" — so each card here is
 * conditional on its setting having a value. An empty tile that says "Instagram"
 * and goes nowhere is worse than no tile.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  const settings = await getSettings();
  const phone = settings.phone?.trim();
  const whatsapp = settings.whatsapp?.trim();
  const email = settings.email?.trim();
  const instagram = socialUrl("https://instagram.com/", settings.instagram);
  const x = socialUrl("https://x.com/", settings.x);
  const snapchat = socialUrl("https://www.snapchat.com/add/", settings.snapchat);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-grid">
          {phone ? (
            <a href={telLink(phone)}>
              <Phone size={18} />
              <span>
                <strong>{t("callDirect")}</strong>
                <small>{formatPhone(phone)}</small>
              </span>
            </a>
          ) : null}

          {whatsapp ? (
            <a href={waLink(whatsapp, t("whatsappMessage"))} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} />
              <span>
                <strong>{t("whatsapp")}</strong>
                <small>{formatPhone(whatsapp)}</small>
              </span>
            </a>
          ) : null}

          {email ? (
            <a href={`mailto:${email}`}>
              <Mail size={18} />
              <span>
                <strong>{t("email")}</strong>
                <small>{email}</small>
              </span>
            </a>
          ) : null}

          {instagram ? (
            <a href={instagram} target="_blank" rel="noopener noreferrer">
              <Camera size={18} />
              <span>
                <strong>Instagram</strong>
                <small>{t("officialAccount")}</small>
              </span>
            </a>
          ) : null}

          {x ? (
            <a href={x} target="_blank" rel="noopener noreferrer">
              <b>𝕏</b>
              <span>
                <strong>X / Twitter</strong>
                <small>{t("officialAccount")}</small>
              </span>
            </a>
          ) : null}

          {snapchat ? (
            <a href={snapchat} target="_blank" rel="noopener noreferrer">
              <b>◉</b>
              <span>
                <strong>Snapchat</strong>
                <small>{t("officialAccount")}</small>
              </span>
            </a>
          ) : null}
        </div>
      </section>
    </>
  );
}
