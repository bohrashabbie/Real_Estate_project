import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes, getSettings } from "@/lib/api";
import { one, type SearchParams } from "@/lib/search-params";
import { SmartSearchWizard } from "@/components/smart-search/wizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "smart" });
  return {
    title: t("metaTitle"),
    description: t("sidebarBody"),
    alternates: {
      canonical: `/${locale}/smart-search`,
      languages: localeAlternates("/smart-search"),
    },
  };
}

export default async function SmartSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations("app");
  const query = await searchParams;

  const [areas, types, settings] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getSettings(),
  ]);

  // FooterSearch (the home page's search-again cards) sends its area/type/
  // purpose here instead of to /properties -- see the wizard's own comment
  // on `initial` for why that means skipping straight to results.
  const rawPurpose = one(query.purpose);
  const purpose: "sale" | "rent" | undefined =
    rawPurpose === "sale" || rawPurpose === "rent" ? rawPurpose : undefined;
  const initial = { area: one(query.area), type: one(query.type), purpose };

  return (
    <section className="section smart-search-page">
      <div className="container">
        <SmartSearchWizard
          areas={areas}
          types={types}
          locale={typedLocale}
          whatsapp={settings.whatsapp?.trim() || null}
          siteName={t("name")}
          initial={initial}
        />
      </div>
    </section>
  );
}
