import { getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { siteText, type SiteSettings } from "@/lib/api";
import { formatPhone, telLink, waLink } from "@/lib/format";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { SnapchatIcon } from "@/components/ui/snapchat-icon";
import type { Locale } from "@/i18n/routing";

/** `w91111`, `@w91111` and a full profile URL all end up as one link. */
function socialUrl(base: string, handle: string | null | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${base}${value.replace(/^@/, "")}`;
}

export async function Footer({ settings, locale }: { settings: SiteSettings; locale: Locale }) {
  const t = await getTranslations();

  const phone = settings.phone?.trim();
  const whatsapp = settings.whatsapp?.trim();
  const instagram = socialUrl("https://instagram.com/", settings.instagram);
  const x = socialUrl("https://x.com/", settings.x);
  const snapchat = socialUrl("https://www.snapchat.com/add/", settings.snapchat);

  return (
    <footer>
      <div className="container footer-grid">
        <div>
          {/* The office's own logo artwork, same asset and treatment as the
              header — see components/layout/header.tsx. Its wordmark is
              baked in, so no separate live text sits beside it here either. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="footer-logo" src="/brand/kwt25-logo-full.png" alt={t("app.name")} />
          <p>{siteText(settings, "footer_blurb", locale) ?? t("footer.blurb")}</p>
          <div className="footer-social">
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <InstagramIcon size={16} />
              </a>
            ) : null}
            {x ? (
              <a href={x} target="_blank" rel="noopener noreferrer" aria-label="X">
                𝕏
              </a>
            ) : null}
            {snapchat ? (
              <a href={snapchat} target="_blank" rel="noopener noreferrer" aria-label="Snapchat">
                <SnapchatIcon size={18} />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <strong>{t("footer.properties")}</strong>
          <Link href="/properties">{t("footer.allProperties")}</Link>
          <Link href="/properties?purpose=sale">{t("nav.sale")}</Link>
          <Link href="/properties?purpose=rent">{t("nav.rent")}</Link>
          <Link href="/properties?featured=1">{t("nav.featured")}</Link>
          <Link href="/smart-search">{t("footer.smartChoice")}</Link>
          <Link href="/compare">{t("footer.compare")}</Link>
          <Link href="/map">{t("footer.mapSearch")}</Link>
        </div>

        <div>
          <strong>{t("footer.office")}</strong>
          <Link href="/contact">{t("footer.contactUs")}</Link>
          <Link href="/request">{t("footer.requestProperty")}</Link>
          <Link href="/list-property">{t("footer.listProperty")}</Link>
        </div>

        <div>
          <strong>{t("footer.reach")}</strong>
          {phone ? (
            <a href={telLink(phone)}>
              <Phone size={14} />
              {formatPhone(phone)}
            </a>
          ) : null}
          {whatsapp ? (
            <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} />
              {t("footer.whatsappWith", { phone: formatPhone(whatsapp) })}
            </a>
          ) : null}
          {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
        </div>
      </div>

      <div className="container footer-bottom">
        <span className="footer-tagline">
          {siteText(settings, "footer_tagline", locale) ?? t("footer.tagline")}
        </span>
      </div>
    </footer>
  );
}
