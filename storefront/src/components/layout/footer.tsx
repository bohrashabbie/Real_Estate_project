import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { InstagramIcon, MailIcon, PhoneIcon, WhatsappIcon } from "@/components/ui/icons";

export function Footer({ settings, locale }: { settings: SiteSettings; locale: Locale }) {
  const t = useTranslations();
  const siteName = locale === "ar" ? settings.name_ar : settings.name_en;
  const year = new Date().getFullYear();

  const links: { href: string; label: string }[] = [
    { href: "/", label: t("menu.home") },
    { href: "/properties", label: t("menu.properties") },
    { href: "/smart-search", label: t("menu.smartSearch") },
    { href: "/map", label: t("menu.map") },
    { href: "/request", label: t("menu.request") },
    { href: "/contact", label: t("menu.contact") },
  ];

  return (
    <footer className="mt-16 bg-navy text-white">
      <div className="mx-auto grid max-w-(--container-site) gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          {/* The brand mark lives on black, so it only appears on dark surfaces. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt={siteName}
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-navy-600"
          />
          <p className="mt-4 text-lg font-bold">{siteName}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{t("app.tagline")}</p>
        </div>

        <nav aria-label={t("footer.quickLinks")}>
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gold">
            {t("footer.quickLinks")}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 transition-colors hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gold">
            {t("footer.contactUs")}
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            {settings.phone ? (
              <li>
                <a
                  href={telLink(settings.phone)}
                  className="inline-flex items-center gap-2.5 text-white/80 hover:text-gold"
                >
                  <PhoneIcon width={17} height={17} className="text-gold" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              </li>
            ) : null}
            {settings.whatsapp ? (
              <li>
                <a
                  href={waLink(settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/80 hover:text-gold"
                >
                  <WhatsappIcon width={17} height={17} className="text-gold" />
                  <span dir="ltr">{settings.whatsapp}</span>
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2.5 text-white/80 hover:text-gold"
                >
                  <MailIcon width={17} height={17} className="text-gold" />
                  {settings.email}
                </a>
              </li>
            ) : null}
            {settings.instagram ? (
              <li>
                <a
                  href={
                    settings.instagram.startsWith("http")
                      ? settings.instagram
                      : `https://instagram.com/${settings.instagram.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/80 hover:text-gold"
                >
                  <InstagramIcon width={17} height={17} className="text-gold" />
                  {settings.instagram}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-700 py-4 text-center text-xs text-white/50">
        © {year} {siteName} — {t("footer.rights")}
      </div>
    </footer>
  );
}
