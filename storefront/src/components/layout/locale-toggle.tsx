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
 * It shows the language you would switch *to*, not the one you are in: "EN"
 * while reading Arabic. A control labelled with the current state reads as a
 * status display and leaves people unsure whether pressing it changes anything.
 *
 * The current query string rides along, so switching language from a filtered
 * listing keeps the filters.
 */
export function LocaleToggle({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = locale === "ar" ? "en" : "ar";
  const query = searchParams.toString();
  const label = t(next === "en" ? "switchToEnglish" : "switchToArabic");

  return (
    <button
      type="button"
      lang={next}
      onClick={() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: next })}
      aria-label={label}
      title={label}
      className={cn(
        // Stays a 44px target on the narrowest phone, where the header already
        // carries the CTA, the phone tile and the menu button; the globe joins
        // the label only once there is room for both.
        "flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors",
        tone === "dark"
          ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
          : "bg-cream-100 text-navy hover:bg-gold-100",
        className,
      )}
    >
      <GlobeIcon width={17} height={17} className="hidden text-gold sm:block" />
      <span>{next === "en" ? "EN" : "ع"}</span>
    </button>
  );
}
