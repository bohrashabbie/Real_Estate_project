"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowIcon,
  BuildingIcon,
  ClipboardIcon,
  CloseIcon,
  GlobeIcon,
  HomeIcon,
  MapIcon,
  PhoneIcon,
  SparkleIcon,
  StarIcon,
} from "@/components/ui/icons";

interface MenuItem {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  dark?: boolean;
}

/** Full-screen destination menu from the old site: big card rows, the featured
 *  and smart-search rows inverted to navy. */
export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("menu");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const items: MenuItem[] = [
    {
      href: "/",
      title: t("home"),
      subtitle: t("homeSub"),
      icon: <HomeIcon width={24} height={24} />,
    },
    {
      href: "/properties",
      title: t("properties"),
      subtitle: t("propertiesSub"),
      icon: <BuildingIcon width={24} height={24} />,
    },
    {
      href: "/properties?featured=1",
      title: t("featured"),
      subtitle: t("featuredSub"),
      icon: <StarIcon width={24} height={24} />,
      dark: true,
    },
    {
      href: "/smart-search",
      title: t("smartSearch"),
      subtitle: t("smartSearchSub"),
      icon: <SparkleIcon width={24} height={24} />,
      dark: true,
    },
    {
      href: "/map",
      title: t("map"),
      subtitle: t("mapSub"),
      icon: <MapIcon width={24} height={24} />,
    },
    {
      href: "/request",
      title: t("request"),
      subtitle: t("requestSub"),
      icon: <ClipboardIcon width={24} height={24} />,
    },
    {
      href: "/contact",
      title: t("contact"),
      subtitle: t("contactSub"),
      icon: <PhoneIcon width={24} height={24} />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-4 w-[min(94vw,40rem)] rounded-3xl bg-cream p-5 shadow-float sm:my-8 sm:p-7"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-navy">{t("title")}</p>
            <p className="text-sm text-muted">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-11 w-11 items-center justify-center bg-cream-50 text-navy shadow-card ring-1 ring-cream-200 hover:bg-cream-100"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-4 rounded-2xl p-4 shadow-card ring-1 transition-transform hover:-translate-y-0.5",
                item.dark
                  ? "bg-navy text-cream ring-navy-700"
                  : "bg-cream-50 text-navy ring-cream-200",
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-gold",
                  item.dark ? "bg-navy-700" : "bg-cream-100",
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">
                <span className="block text-lg font-bold">{item.title}</span>
                <span className={cn("block text-sm", item.dark ? "text-cream/70" : "text-muted")}>
                  {item.subtitle}
                </span>
              </span>
              <ArrowIcon
                width={20}
                height={20}
                // ArrowIcon ships pointing inline-end; the site convention is
                // `rtl:rotate-180`. This row had it inverted, so in Arabic the
                // "go to page" arrow pointed backwards.
                className="text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
              />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          lang={locale === "ar" ? "en" : "ar"}
          onClick={() => {
            onClose();
            // Carry the query string over, so switching language from a
            // filtered listing does not silently drop the filters.
            const query = searchParams.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, {
              locale: locale === "ar" ? "en" : "ar",
            });
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-cream-50 px-5 py-3 text-sm font-bold text-navy shadow-card ring-1 ring-cream-200 hover:bg-cream-100"
        >
          <GlobeIcon width={18} height={18} className="text-gold" />
          {locale === "ar" ? "English" : "العربية"}
        </button>
      </div>
    </div>
  );
}
