import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { MapExplorer } from "@/components/map/map-explorer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mapPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/map`, languages: localeAlternates("/map") },
  };
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mapPage");

  return (
    <>
      <section className="page-hero map-page-hero">
        <div className="container">
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </section>

      <section className="section map-browser">
        <div className="container">
          <MapExplorer locale={locale as Locale} />
        </div>
      </section>
    </>
  );
}
