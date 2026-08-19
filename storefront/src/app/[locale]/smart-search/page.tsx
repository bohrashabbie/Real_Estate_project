import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes, getSettings } from "@/lib/api";
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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations("app");

  const [areas, types, settings] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
    getSettings(),
  ]);

  return (
    <section className="section smart-search-page">
      <div className="container">
        <SmartSearchWizard
          areas={areas}
          types={types}
          locale={typedLocale}
          whatsapp={settings.whatsapp?.trim() || null}
          siteName={t("name")}
        />
      </div>
    </section>
  );
}
