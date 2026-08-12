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
  // The second line is the *other* locale's wordmark, and it only earns its
  // place when the office actually has two. A single brand spelled the same
  // way in both would otherwise render stacked on top of itself.
  const otherName = locale === "ar" ? settings.name_en : settings.name_ar;
  const siteNameAlt = otherName === siteName ? null : otherName;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cream-200/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-(--container-site) items-center gap-3 px-4 py-3 sm:px-6">
          {/* Brand mark + wordmark */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 leading-tight">
            {/* The mark is gold-on-black artwork, so it keeps its own dark
                tile rather than sitting bare on the cream bar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-cream-300 sm:h-11 sm:w-11"
            />
            <span>
              <span className="block font-display text-base font-extrabold text-navy sm:text-xl">
                {siteName}
              </span>
              {siteNameAlt ? (
                <span className="block text-[11px] font-semibold tracking-wide text-gold-dark">
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

          {/* The action trio, in the order the reference design puts it: the
              gold CTA sits closest to the wordmark, then the navy phone tile,
              then the hamburger on the far edge. Language switching lives in
              the menu overlay rather than here — the reference header carries
              only these three controls, and the overlay already has a full
              locale row at its foot. */}
          <div className="ms-auto flex items-center gap-2 lg:ms-0 sm:gap-2.5">
            <Link
              href="/request"
              className="bg-gold-gradient inline-flex shrink-0 items-center rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98] sm:px-6 sm:text-sm"
            >
              {t("nav.listYourProperty")}
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
