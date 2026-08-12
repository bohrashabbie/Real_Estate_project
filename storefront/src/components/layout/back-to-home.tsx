"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { ArrowIcon, HomeIcon } from "@/components/ui/icons";

/**
 * A way back to the home page, at the foot of every page except the home page
 * itself.
 *
 * It lives in the layout rather than being pasted into each route so a page
 * added later gets it without anyone remembering to. `usePathname` here comes
 * from `@/i18n/navigation`, which strips the locale prefix — so "/" matches
 * both `/ar` and `/en`, and the link correctly hides itself on both.
 *
 * The footer already carries a "Home" entry among its quick links, but that is
 * a small item in a column of eight; this is the deliberate, obvious exit at
 * the end of the reading flow.
 */
export function BackToHome() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <div className="border-t border-cream-200">
      <div className="mx-auto max-w-(--container-site) px-4 py-8 text-center sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-gold-100 hover:ring-gold/60"
        >
          <HomeIcon width={17} height={17} className="text-gold" />
          {t("backToHome")}
          {/* Points back the way the visitor came, so it mirrors under RTL. */}
          <ArrowIcon width={16} height={16} className="rotate-180 rtl:rotate-0" />
        </Link>
      </div>
    </div>
  );
}
