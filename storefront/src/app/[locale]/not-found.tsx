import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ArrowIcon, SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto flex max-w-(--container-site) flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-gold">
        <SearchIcon width={28} height={28} />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-navy">{t("title")}</h1>
      <p className="mt-2 max-w-md text-muted">{t("body")}</p>
      <Link
        href="/properties"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-navy-700"
      >
        {t("cta")}
        <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
      </Link>
    </div>
  );
}
