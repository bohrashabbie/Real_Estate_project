"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ClipboardList,
  House,
  KeyRound,
  MapPinned,
  Menu,
  Phone,
  Sparkles,
  Star,
  Tag,
  X,
  ArrowLeft,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, type NavIcon } from "@/lib/nav";
import { formatPhone, telLink } from "@/lib/format";
import type { SiteSettings } from "@/lib/api";
import { LocaleToggle } from "@/components/layout/locale-toggle";

const ICONS: Record<NavIcon, typeof House> = {
  house: House,
  tag: Tag,
  keyRound: KeyRound,
  star: Star,
  mapPinned: MapPinned,
  sparkles: Sparkles,
  clipboardList: ClipboardList,
};

/**
 * One nav, two shapes.
 *
 * The same seven `.nav-card` anchors are an inline text row above 760px and a
 * stack of icon cards in a fixed drawer below it — the stylesheet hides the
 * icon, the sub-label and the chevron on the wide layout. Nothing here branches
 * on viewport width, which is what keeps the two in step.
 */
export function Header({ settings }: { settings: SiteSettings }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A tap on a nav card navigates without unmounting the header, so the drawer
  // has to be told to close; watching the path covers the back button too.
  useEffect(() => setOpen(false), [pathname]);

  // A drawer that scrolls the page behind it reads as broken on a phone.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const phone = settings.phone?.trim();

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="brand" href="/" aria-label={`${t("app.name")} — ${t("nav.home")}`}>
            {/* The office's own logo artwork bakes the wordmark in, so this is
                the whole mark — no separate live text beside it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kwt25-logo-full.webp" alt="" aria-hidden />
          </Link>

          {/* The backdrop is a child of the header, not a sibling: `.site-header`
              is a positioned, z-indexed element, so it opens its own stacking
              context and the drawer's z-index:62 can only outrank the
              backdrop's 59 from inside it. Rendered outside, the blur lands on
              top of the menu it is meant to sit behind. */}
          {open ? (
            <div className="menu-backdrop" aria-hidden onClick={() => setOpen(false)} />
          ) : null}

          <nav className={`main-nav${open ? " is-open" : ""}`} aria-label={t("nav.aria")}>
            <div className="mobile-nav-head">
              <span>
                <strong>{t("nav.menuTitle")}</strong>
                <small>{t("nav.menuSubtitle")}</small>
              </span>
              <button type="button" aria-label={t("nav.closeMenu")} onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.key}
                  className={`nav-card${item.accent ? " nav-card-accent" : ""}`}
                  href={item.href}
                >
                  <span className="nav-card-icon">
                    <Icon size={19} />
                  </span>
                  <span className="nav-card-copy">
                    <b>{t(`nav.${item.key}`)}</b>
                    <small>{t(`nav.${item.key}Sub`)}</small>
                  </span>
                  <ArrowLeft size={17} className="nav-card-arrow" />
                </Link>
              );
            })}
          </nav>

          <div className="nav-actions">
            <Link
              className="metal-button header-list-property"
              href="/list-property"
              aria-label={t("nav.listProperty")}
            >
              <Building2 size={16} />
              <span>{t("nav.listProperty")}</span>
            </Link>

            {phone ? (
              <a
                className="header-phone header-phone-button"
                href={telLink(phone)}
                aria-label={t("nav.callAria", { phone: formatPhone(phone) })}
              >
                <Phone size={16} />
              </a>
            ) : null}

            <LocaleToggle />

            <button
              type="button"
              className="icon-button menu-button"
              aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
