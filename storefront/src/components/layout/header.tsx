"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { SiteSettings } from "@/lib/api";
import { telLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MenuIcon, PhoneIcon } from "@/components/ui/icons";
import { MenuOverlay } from "@/components/layout/menu-overlay";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/properties", key: "properties" },
  { href: "/smart-search", key: "smartSearch" },
  { href: "/map", key: "map" },
  { href: "/contact", key: "contact" },
] as const;

export function Header({ settings }: { settings: SiteSettings }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const siteName = locale === "ar" ? settings.name_ar : settings.name_en;
  const siteNameAlt = locale === "ar" ? settings.name_en : settings.name_ar;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cream-200/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-(--container-site) items-center gap-3 px-4 py-3 sm:px-6">
          {/* Wordmark */}
          <Link href="/" className="leading-tight">
            <span className="block font-display text-lg font-extrabold text-navy sm:text-xl">
              {siteName}
            </span>
            <span className="block text-[11px] font-semibold tracking-wide text-gold-dark">
              {siteNameAlt}
            </span>
          </Link>

          {/* Inline nav (desktop) */}
          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label={t("menu.title")}>
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active
                      ? "bg-navy text-white shadow-card"
                      : "text-navy/75 hover:bg-white hover:text-navy",
                  )}
                >
                  {t(`menu.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-2.5 lg:ms-0">
            {settings.phone ? (
              <a
                href={telLink(settings.phone)}
                aria-label={t("nav.call")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-navy hover:text-white"
              >
                <PhoneIcon width={19} height={19} />
              </a>
            ) : null}

            <Link
              href="/request"
              className="bg-gold-gradient hidden shrink-0 items-center rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98] sm:inline-flex"
            >
              {t("nav.listYourProperty")}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.openMenu")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-cream-100 lg:hidden"
            >
              <MenuIcon width={22} height={22} />
            </button>
          </div>
        </div>

        {/* Mobile gets the CTA on its own row so it never collides with the wordmark. */}
        <div className="border-t border-cream-200/70 px-4 pb-2.5 pt-2 sm:hidden">
          <Link
            href="/request"
            className="bg-gold-gradient flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-gold transition-all active:scale-[0.98]"
          >
            {t("nav.listYourProperty")}
          </Link>
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
