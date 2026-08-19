import { getTranslations } from "next-intl/server";
import { Camera, MessageCircle, Phone } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { SiteSettings } from "@/lib/api";
import { formatPhone, telLink, waLink } from "@/lib/format";
import { BrandLockup } from "@/components/layout/brand-lockup";

/** `w91111`, `@w91111` and a full profile URL all end up as one link. */
function socialUrl(base: string, handle: string | null | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${base}${value.replace(/^@/, "")}`;
}

export async function Footer({ settings }: { settings: SiteSettings }) {
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
          <BrandLockup name={t("app.name")} tone="reversed" size="lg" />
          <p>{t("footer.blurb")}</p>
          <div className="footer-social">
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Camera size={16} />
              </a>
            ) : null}
            {x ? (
              <a href={x} target="_blank" rel="noopener noreferrer" aria-label="X">
                𝕏
              </a>
            ) : null}
            {snapchat ? (
              <a href={snapchat} target="_blank" rel="noopener noreferrer" aria-label="Snapchat">
                ◉
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <strong>{t("footer.properties")}</strong>
          <Link href="/properties">{t("footer.allProperties")}</Link>
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
        <span className="footer-tagline">{t("footer.tagline")}</span>
      </div>
    </footer>
  );
}
