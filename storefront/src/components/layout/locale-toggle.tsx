"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { GlobeIcon } from "@/components/ui/icons";

/**
 * Arabic ⇄ English switch. Locale detection is off (see `i18n/routing.ts`), so
 * this button is the *only* way into English — it must be reachable on every
 * breakpoint, not buried in the mobile menu.
 *
 * The current query string rides along so switching language from a filtered
 * listing keeps the filters.
 */
export function LocaleToggle({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = locale === "ar" ? "en" : "ar";
  const query = searchParams.toString();

  return (
    <button
      type="button"
      lang={next}
      onClick={() =>
        router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })
      }
      aria-label={t(next === "en" ? "switchToEnglish" : "switchToArabic")}
      title={t(next === "en" ? "switchToEnglish" : "switchToArabic")}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors",
        tone === "dark"
          ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
          : "bg-white text-navy shadow-card ring-1 ring-cream-200 hover:bg-navy hover:text-white",
        className,
      )}
    >
      <GlobeIcon width={18} height={18} />
      <span>{next === "en" ? "EN" : "ع"}</span>
    </button>
  );
}
