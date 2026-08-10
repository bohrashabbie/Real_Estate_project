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

  const instagramHref = settings.instagram
    ? settings.instagram.startsWith("http")
      ? settings.instagram
      : `https://instagram.com/${settings.instagram.replace(/^@/, "")}`
    : null;

  return (
    <footer className="relative mt-20 bg-navy-950 text-cream">
      {/* Gold hairline crowning the footer. */}
      <div className="bg-gold-gradient h-1 w-full" aria-hidden />

      <div className="mx-auto grid max-w-(--container-site) gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* The brand mark lives on black, so it only appears on dark surfaces. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt={siteName}
            className="h-20 w-20 rounded-2xl object-cover ring-1 ring-cream-200/15"
          />
          <p className="mt-4 font-display text-lg font-extrabold">{siteName}</p>
          <p className="mt-2 text-sm leading-relaxed text-cream/60">{t("app.tagline")}</p>

          {/* Social row */}
          <div className="mt-5 flex items-center gap-2.5">
            {settings.whatsapp ? (
              <a
                href={waLink(settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("floats.whatsapp")}
                className="flex h-10 w-10 items-center justify-center bg-cream-50/8 text-gold-light ring-1 ring-cream-200/10 transition-colors hover:bg-gold hover:text-cream"
              >
                <WhatsappIcon width={18} height={18} />
              </a>
            ) : null}
            {instagramHref ? (
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("contact.instagram")}
                className="flex h-10 w-10 items-center justify-center bg-cream-50/8 text-gold-light ring-1 ring-cream-200/10 transition-colors hover:bg-gold hover:text-cream"
              >
                <InstagramIcon width={18} height={18} />
              </a>
            ) : null}
            {settings.email ? (
              <a
                href={`mailto:${settings.email}`}
                aria-label={t("contact.email")}
                className="flex h-10 w-10 items-center justify-center bg-cream-50/8 text-gold-light ring-1 ring-cream-200/10 transition-colors hover:bg-gold hover:text-cream"
              >
                <MailIcon width={18} height={18} />
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label={t("footer.quickLinks")}>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gold-light">
            <span className="h-px w-6 bg-gold" aria-hidden />
            {t("footer.quickLinks")}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-cream/70 transition-colors hover:text-gold-light"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gold-light">
            <span className="h-px w-6 bg-gold" aria-hidden />
            {t("footer.contactUs")}
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            {settings.phone ? (
              <li>
                <a
                  href={telLink(settings.phone)}
                  className="inline-flex items-center gap-2.5 text-cream/70 transition-colors hover:text-gold-light"
                >
                  <PhoneIcon width={16} height={16} className="text-gold" />
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
                  className="inline-flex items-center gap-2.5 text-cream/70 transition-colors hover:text-gold-light"
                >
                  <WhatsappIcon width={16} height={16} className="text-gold" />
                  <span dir="ltr">{settings.whatsapp}</span>
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-2.5 text-cream/70 transition-colors hover:text-gold-light"
                >
                  <MailIcon width={16} height={16} className="text-gold" />
                  {settings.email}
                </a>
              </li>
            ) : null}
            {settings.instagram && instagramHref ? (
              <li>
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-cream/70 transition-colors hover:text-gold-light"
                >
                  <InstagramIcon width={16} height={16} className="text-gold" />
                  {settings.instagram}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gold-light">
            <span className="h-px w-6 bg-gold" aria-hidden />
            {t("contact.hoursTitle")}
          </p>
          <ul className="flex flex-col gap-3 text-sm text-cream/70">
            <li>{t("contact.hoursWeek")}</li>
            <li>{t("contact.hoursNote")}</li>
          </ul>
          <Link
            href="/request"
            className="bg-gold-gradient mt-6 inline-flex items-center px-6 py-3 text-sm font-bold text-cream shadow-gold transition-all hover:brightness-110"
          >
            {t("nav.listYourProperty")}
          </Link>
        </div>
      </div>

      <div className="border-t border-cream-200/10 py-5 text-center text-xs text-cream/45">
        © {year} {siteName} — {t("footer.rights")}
      </div>
    </footer>
  );
}
