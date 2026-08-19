import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { CompareView } from "@/components/compare/compare-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
    alternates: { canonical: `/${locale}/compare`, languages: localeAlternates("/compare") },
    // The shortlist lives in one browser; there is nothing here to index.
    robots: { index: false, follow: true },
  };
}

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compare");

  return (
    <>
      <section className="page-hero small-page-hero">
        <div className="container">
          <span className="section-kicker">{t("pageKicker")}</span>
          <h1>{t("pageTitle")}</h1>
          <p>{t("pageSubtitle")}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <CompareView locale={locale as Locale} />
        </div>
      </section>
    </>
  );
}
