"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { SiteSettings } from "@/lib/api";
import { telLink } from "@/lib/format";
import { MenuIcon, PhoneIcon } from "@/components/ui/icons";
import { MenuOverlay } from "@/components/layout/menu-overlay";

export function Header({ settings }: { settings: SiteSettings }) {
  const t = useTranslations();
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const siteName = locale === "ar" ? settings.name_ar : settings.name_en;
  const siteNameAlt = locale === "ar" ? settings.name_en : settings.name_ar;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cream-200/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-(--container-site) items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("nav.openMenu")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
          >
            <MenuIcon width={22} height={22} />
          </button>

          {settings.phone ? (
            <a
              href={telLink(settings.phone)}
              aria-label={t("nav.call")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-white shadow-card transition-colors hover:bg-navy-700"
            >
              <PhoneIcon width={20} height={20} />
            </a>
          ) : null}

          <Link
            href="/request"
            className="hidden shrink-0 items-center rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-navy shadow-card transition-colors hover:bg-gold-dark hover:text-white sm:inline-flex"
          >
            {t("nav.listYourProperty")}
          </Link>

          <Link href="/" className="ms-auto text-end leading-tight">
            <span className="block text-lg font-bold text-navy sm:text-xl">{siteName}</span>
            <span className="block text-[11px] font-medium tracking-wide text-gold-dark">
              {siteNameAlt}
            </span>
          </Link>
        </div>
        {/* Mobile gets the CTA on its own row so it never collides with the wordmark. */}
        <div className="border-t border-cream-200/70 px-4 pb-2.5 pt-2 sm:hidden">
          <Link
            href="/request"
            className="flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-navy shadow-card transition-colors hover:bg-gold-dark hover:text-white"
          >
            {t("nav.listYourProperty")}
          </Link>
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
