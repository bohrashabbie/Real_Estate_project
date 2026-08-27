"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * The one control the reference has no slot for, because the reference is
 * Arabic-only and this site is not.
 *
 * It re-renders the current path in the other locale rather than sending
 * everyone home: someone reading a listing in Arabic wants that listing in
 * English, not the front page.
 */
export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("nav");

  const next: Locale = locale === "ar" ? "en" : "ar";

  return (
    <Link
      className="locale-toggle"
      href={pathname}
      locale={next}
      aria-label={next === "en" ? t("switchToEnglish") : t("switchToArabic")}
      hrefLang={next}
    >
      <span>{next === "en" ? "EN" : "AR"}</span>
    </Link>
  );
}
