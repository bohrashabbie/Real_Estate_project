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
      {/* Short enough to sit in the same disc the call button uses, and still
          in the target language's own script: "En" for English, "ع" for
          Arabic — never a transliterated "Ar", which would spell an Arabic
          word in Latin letters on a button whose whole job is to signal that
          the other side is Arabic. The full name stays in the aria-label,
          so a screen reader still hears "switch to English", not "En". */}
      <span className={`locale-toggle-label locale-toggle-${next}`}>
        {next === "en" ? "En" : "ع"}
      </span>
    </Link>
  );
}
