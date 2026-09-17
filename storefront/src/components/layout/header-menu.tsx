"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ExternalLink, Languages, Link2, Phone } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SiteSettings } from "@/lib/api";
import { formatPhone, telLink } from "@/lib/format";

/**
 * The header's one dropdown, on request, in place of the separate call disc
 * and language disc that used to sit at the end of the header.
 *
 * Two entries are built in and always there -- the other language, and the
 * office's phone number -- and every link the office adds under admin
 * Settings → Header dropdown (`site.header_menu`) is listed beneath them.
 *
 * Opens on hover where hovering is a real gesture, and on tap everywhere --
 * the same split the quick-search fields use, for the same reason: on a touch
 * screen "hover" fires on the tap meant to open it and never fires again to
 * close it.
 *
 * The language entry keeps the query string, so switching language on
 * "For sale" stays on "For sale". `useSearchParams` sits behind a Suspense
 * boundary so statically rendered pages still build; until it resolves the
 * entry keeps the path alone.
 */
export function HeaderMenu({ settings }: { settings: SiteSettings }) {
  return (
    <Suspense fallback={<Menu settings={settings} search="" />}>
      <MenuWithSearch settings={settings} />
    </Suspense>
  );
}

function MenuWithSearch({ settings }: { settings: SiteSettings }) {
  return <Menu settings={settings} search={useSearchParams().toString()} />;
}

function Menu({ settings, search }: { settings: SiteSettings; search: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("nav");
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const next: Locale = locale === "ar" ? "en" : "ar";
  const phone = settings.phone?.trim();
  const extras = (Array.isArray(settings.header_menu) ? settings.header_menu : []).flatMap(
    (item) => {
      const href = item?.href?.trim();
      const label = (locale === "ar" ? item?.label_ar || item?.label_en : item?.label_en || item?.label_ar)?.trim();
      return href && label ? [{ href, label, external: /^https?:\/\//.test(href) }] : [];
    },
  );

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
      <button
        type="button"
        className="header-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuAria")}
        onClick={() => setOpen((value) => !value)}
      >
        <Phone size={15} />
        <span className={`header-menu-lang header-menu-lang-${next}`}>{next === "en" ? "En" : "ع"}</span>
        <ChevronDown size={14} className="header-menu-chevron" />
      </button>

      {open ? (
        <div className="header-menu-panel" role="menu">
          <Link
            role="menuitem"
            href={search ? `${pathname}?${search}` : pathname}
            locale={next}
            hrefLang={next}
            aria-label={next === "en" ? t("switchToEnglish") : t("switchToArabic")}
          >
            <Languages size={16} />
            <span>{next === "en" ? "English" : "العربية"}</span>
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
