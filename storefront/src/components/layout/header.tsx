"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { SiteSettings } from "@/lib/api";
import { telLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MenuIcon, PhoneIcon } from "@/components/ui/icons";
import { MenuOverlay } from "@/components/layout/menu-overlay";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";

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
  // The second line is the *other* locale's wordmark, and it only earns its
  // place when the office actually has two. A single brand spelled the same
  // way in both would otherwise render stacked on top of itself.
  const otherName = locale === "ar" ? settings.name_en : settings.name_ar;
  const siteNameAlt = otherName === siteName ? null : otherName;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-(--container-site) items-center gap-3 px-4 py-3 sm:px-6">
          {/* Brand mark + wordmark */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 leading-tight">
            {/* The mark is artwork on black, so it keeps its own tile rather
                than sitting bare on the plaster bar — square, like everything
                else in the system. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 border border-cream-300 object-cover sm:h-11 sm:w-11"
            />
            <span>
              <span className="block font-display text-base font-extrabold tracking-wide text-navy sm:text-xl">
                {siteName}
              </span>
              {siteNameAlt ? (
                <span className="block text-[11px] font-semibold tracking-wider text-gold">
                  {siteNameAlt}
                </span>
              ) : null}
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
                    // Active state is a rule under the label, not a filled
                    // pill — the accent marks position, it doesn't decorate.
                    "border-b px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "border-gold text-navy"
                      : "border-transparent text-muted hover:text-navy",
                  )}
                >
                  {t(`menu.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-2 lg:ms-0 sm:gap-2.5">
            {/* Appearance and language are the same kind of choice, so they sit
                together as a matched pair of segmented controls. */}
            <ThemeToggle className="hidden sm:inline-flex" />
            <LocaleToggle />

            {settings.phone ? (
              <a
                href={telLink(settings.phone)}
                aria-label={t("nav.call")}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-cream-200 bg-cream-50 text-navy transition-colors hover:bg-navy hover:text-cream"
              >
                <PhoneIcon width={18} height={18} />
              </a>
            ) : null}

            <Link
              href="/request"
              className="hidden shrink-0 items-center border border-gold px-5 py-2.5 text-sm font-bold text-gold transition-colors hover:bg-gold hover:text-cream sm:inline-flex"
            >
              {t("nav.listYourProperty")}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.openMenu")}
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-cream-200 bg-cream-50 text-navy transition-colors hover:bg-cream-100 lg:hidden"
            >
              <MenuIcon width={20} height={20} />
            </button>
          </div>
        </div>

        {/* Mobile gets the CTA on its own row so it never collides with the
            wordmark, and carries the appearance switch that the desktop bar
            shows inline — it belongs in reach on the device that has a system
            dark mode people actually use. */}
        <div className="flex items-center gap-3 border-t border-cream-200 px-4 pb-2.5 pt-2 sm:hidden">
          <Link
            href="/request"
            className="flex flex-1 items-center justify-center border border-gold px-5 py-2.5 text-sm font-bold text-gold"
          >
            {t("nav.listYourProperty")}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
