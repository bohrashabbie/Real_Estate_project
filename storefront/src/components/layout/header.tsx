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
      <header className="sticky top-0 z-40 border-b border-cream-200/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-(--container-site) items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          {/* Brand mark + wordmark.

              The bar carries five things on a phone — mark, CTA, phone tile,
              language, menu — and every one of the controls is `shrink-0`,
              because a squashed button is worse than a scrolled one. That
              makes the wordmark the only element that can give way, so it is
              the one that does: below `sm` the mark alone stands in for it,
              still linking home. Without this the row overflowed a 360px
              viewport and pushed the logo clean off the screen. */}
          <Link
            href="/"
            // Below `sm` the visible wordmark is gone and the mark's alt is
            // empty, which would leave this link with no accessible name.
            aria-label={siteName}
            className="flex min-w-0 items-center gap-2.5 leading-tight"
          >
            {/* The mark is gold-on-black artwork, so it keeps its own dark
                tile rather than sitting bare on the cream bar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-cream-300 sm:h-11 sm:w-11"
            />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-display text-base font-extrabold text-navy sm:text-xl">
                {siteName}
              </span>
              {siteNameAlt ? (
                <span className="block truncate text-[11px] font-semibold tracking-wide text-gold-dark">
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

          {/* Ordered as the reference design has it — gold CTA closest to the
              wordmark, then the navy phone tile, then the utility controls on
              the far edge. The language switch sits with the menu button
              because both are utilities, and it has to be here rather than
              only inside the overlay: locale detection is off, so this is the
              one route into English. */}
          <div className="ms-auto flex items-center gap-2 lg:ms-0 sm:gap-2.5">
            {/* The CTA is the only elastic thing in the bar, so it carries a
                short label on phones. Measured at 360px: the four controls,
                the mark and the gaps leave it 127px, and the full English
                label "List your property with us" is 188px — which pushed the
                menu button clean off the screen. */}
            <Link
              href="/request"
              className="bg-gold inline-flex shrink-0 items-center rounded-full px-3 py-2.5 text-[13px] font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98] sm:px-6 sm:text-sm"
            >
              <span className="sm:hidden">{t("nav.listYourPropertyShort")}</span>
              <span className="hidden sm:inline">{t("nav.listYourProperty")}</span>
            </Link>

            {settings.phone ? (
              <a
                href={telLink(settings.phone)}
                aria-label={t("nav.call")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-white shadow-card transition-colors hover:bg-navy-700"
              >
                <PhoneIcon width={19} height={19} />
              </a>
            ) : null}

            <LocaleToggle />

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.openMenu")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100 text-navy transition-colors hover:bg-cream-200 lg:hidden"
            >
              <MenuIcon width={22} height={22} />
            </button>
          </div>
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
