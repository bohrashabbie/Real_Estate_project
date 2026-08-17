import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ArrowIcon, HomeIcon, SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto flex max-w-(--container-site) flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-gold">
        <SearchIcon width={28} height={28} />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-navy">{t("title")}</h1>
      <p className="mt-2 max-w-md text-muted">{t("body")}</p>
      {/* This page carries its own way home rather than relying on the
          layout's `BackToHome`: on the not-found boundary `usePathname()`
          reports "/", so that component hides itself here — precisely where a
          visitor is most stuck. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-2xl bg-navy px-6 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-navy-700"
        >
          {t("cta")}
          <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-gold-100 hover:ring-gold/60"
        >
          <HomeIcon width={16} height={16} className="text-gold" />
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
