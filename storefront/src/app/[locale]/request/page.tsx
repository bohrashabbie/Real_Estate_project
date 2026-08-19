import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleCheck, House } from "lucide-react";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { RequestForm } from "@/components/request/request-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "request" });
  return {
    title: t("title"),
    description: t("body"),
    alternates: { canonical: `/${locale}/request`, languages: localeAlternates("/request") },
  };
}

export default async function RequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations("request");

  const [areas, types] = await Promise.all([getAreas(typedLocale), getPropertyTypes(typedLocale)]);

  return (
    <section className="section request-page">
      <div className="container request-page-grid">
        <aside>
          <span className="request-icon">
            <House size={22} />
          </span>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("body")}</p>
          <ul>
            <li>
              <CircleCheck size={16} />
              {t("point1")}
            </li>
            <li>
              <CircleCheck size={16} />
              {t("point2")}
            </li>
            <li>
              <CircleCheck size={16} />
              {t("point3")}
            </li>
          </ul>
        </aside>

        <div className="request-form-card">
          <RequestForm areas={areas} types={types} locale={typedLocale} />
        </div>
      </div>
    </section>
  );
}
