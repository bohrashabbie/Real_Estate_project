"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Languages, Link2, Menu, Phone } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/lib/api";
import { formatPhone, telLink } from "@/lib/format";

/**
 * The header's contact-and-language menu: the other language, the office's
 * phone number, and every link the office adds under admin Settings → Header
 * dropdown (`site.header_menu`).
 *
 * Two shapes from one list, so they can never disagree:
 *
 *   desktop  a three-line disc at the end of the header that opens a
 *            dropdown on hover (or tap).
 *   phone    the same entries as extra cards at the foot of the navigation
 *            drawer. The drawer already has its own three-line button, and
 *            two identical buttons side by side would be a guessing game --
 *            so below the drawer handover the disc steps aside
 *            (`.header-menu` in globals.css).
 *
 * The language entry keeps the query string, so switching language on
 * "For sale" stays on "For sale". `useSearchParams` sits behind a Suspense
 * boundary so statically rendered pages still build; until it resolves the
 * entry keeps the path alone.
 */
function useMenuEntries(settings: SiteSettings, search: string) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const next: Locale = locale === "ar" ? "en" : "ar";
  const phone = settings.phone?.trim();
  const extras = (Array.isArray(settings.header_menu) ? settings.header_menu : []).flatMap((item) => {
    const href = item?.href?.trim();
    const label = (locale === "ar" ? item?.label_ar || item?.label_en : item?.label_en || item?.label_ar)?.trim();
    return href && label ? [{ href, label, external: /^https?:\/\//.test(href) }] : [];
  });
  return {
    next,
    pathname,
    languageHref: search ? `${pathname}?${search}` : pathname,
    languageName: next === "en" ? "English" : "العربية",
    phone,
    extras,
  };
}

export function HeaderMenu({ settings }: { settings: SiteSettings }) {
  return (
    <Suspense fallback={<Dropdown settings={settings} search="" />}>
      <DropdownWithSearch settings={settings} />
    </Suspense>
  );
}

function DropdownWithSearch({ settings }: { settings: SiteSettings }) {
  return <Dropdown settings={settings} search={useSearchParams().toString()} />;
}

function Dropdown({ settings, search }: { settings: SiteSettings; search: string }) {
  const t = useTranslations("nav");
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { next, pathname, languageHref, languageName, phone, extras } = useMenuEntries(settings, search);

  // A tap on an entry navigates without unmounting the header.
  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const away = (event: PointerEvent) => {
      if (event.target instanceof Node && element.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", onKey);

    // Hover only where it is a real gesture. Closing waits a beat: the panel
    // sits a few pixels below the trigger, and a pointer crossing that gap
    // would otherwise shut the menu under itself.
    let closing: ReturnType<typeof setTimeout> | undefined;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const enter = () => {
      clearTimeout(closing);
      setOpen(true);
    };
    const leave = () => {
      clearTimeout(closing);
      closing = setTimeout(() => setOpen(false), 160);
    };
    if (fine) {
      element.addEventListener("pointerenter", enter);
      element.addEventListener("pointerleave", leave);
    }

    return () => {
      clearTimeout(closing);
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", onKey);
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className={`header-menu${open ? " is-open" : ""}`} ref={root}>
      {/* Three lines and nothing else, on request -- the phone, "ع" and
          chevron it used to carry crowded a 46px disc into a smudge. */}
      <button
        type="button"
        className="header-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuAria")}
        onClick={() => setOpen((value) => !value)}
      >
        <Menu size={20} />
      </button>

      {open ? (
        <div className="header-menu-panel" role="menu">
          <Link
            role="menuitem"
            href={languageHref}
            locale={next}
            hrefLang={next}
            aria-label={next === "en" ? t("switchToEnglish") : t("switchToArabic")}
          >
            <Languages size={16} />
            <span>{languageName}</span>
          </Link>

          {phone ? (
            <a role="menuitem" href={telLink(phone)} aria-label={t("callAria", { phone: formatPhone(phone) })}>
              <Phone size={16} />
              <span dir="ltr">{formatPhone(phone)}</span>
            </a>
          ) : null}

          {extras.map((item) =>
            item.external ? (
              <a key={item.href} role="menuitem" href={item.href} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                <span>{item.label}</span>
              </a>
            ) : (
              <Link key={item.href} role="menuitem" href={item.href}>
                <Link2 size={16} />
                <span>{item.label}</span>
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The same entries as cards at the foot of the phone navigation drawer. */
export function DrawerMenuEntries({ settings }: { settings: SiteSettings }) {
  return (
    <Suspense fallback={<DrawerEntries settings={settings} search="" />}>
      <DrawerEntriesWithSearch settings={settings} />
    </Suspense>
  );
}

function DrawerEntriesWithSearch({ settings }: { settings: SiteSettings }) {
  return <DrawerEntries settings={settings} search={useSearchParams().toString()} />;
}

function DrawerEntries({ settings, search }: { settings: SiteSettings; search: string }) {
  const t = useTranslations("nav");
  const { next, languageHref, languageName, phone, extras } = useMenuEntries(settings, search);

  const card = (icon: React.ReactNode, title: React.ReactNode, sub?: string) => (
    <>
      <span className="nav-card-icon">{icon}</span>
      <span className="nav-card-copy">
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      <ArrowLeft size={17} className="nav-card-arrow" />
    </>
  );

  return (
    <div className="nav-drawer-extras">
      <Link className="nav-card" href={languageHref} locale={next} hrefLang={next}>
        {card(<Languages size={19} />, languageName, next === "en" ? t("switchToEnglish") : t("switchToArabic"))}
      </Link>
      {phone ? (
        <a className="nav-card" href={telLink(phone)}>
          {card(<Phone size={19} />, <span dir="ltr">{formatPhone(phone)}</span>, t("callOffice"))}
        </a>
      ) : null}
      {extras.map((item) =>
        item.external ? (
          <a key={item.href} className="nav-card" href={item.href} target="_blank" rel="noopener noreferrer">
            {card(<ExternalLink size={19} />, item.label)}
          </a>
        ) : (
          <Link key={item.href} className="nav-card" href={item.href}>
            {card(<Link2 size={19} />, item.label)}
          </Link>
        ),
      )}
    </div>
  );
}
