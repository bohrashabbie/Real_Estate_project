import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, CircleCheck, FileText, LockKeyhole } from "lucide-react";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { ListPropertyForm } from "@/components/request/list-property-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listProperty" });
  return {
    title: t("title"),
    description: t("body"),
    alternates: {
      canonical: `/${locale}/list-property`,
      languages: localeAlternates("/list-property"),
    },
  };
}

export default async function ListPropertyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations("listProperty");

  const [areas, types] = await Promise.all([getAreas(typedLocale), getPropertyTypes(typedLocale)]);

  return (
    <section className="section request-page list-property-page">
      <div className="container request-page-grid list-property-grid">
        <aside>
          <span className="request-icon">
            <Building2 size={22} />
          </span>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{t("title")}</h1>
          <p>{t("body")}</p>
          <ul>
            <li>
              <FileText size={16} />
              {t("point1")}
            </li>
            <li>
              <LockKeyhole size={16} />
              {t("point2")}
            </li>
            <li>
              <CircleCheck size={16} />
              {t("point3")}
            </li>
          </ul>

          <div className="listing-process">
            <span>01</span>
            <div>
              <strong>{t("step1Title")}</strong>
              <small>{t("step1Body")}</small>
            </div>
            <span>02</span>
            <div>
              <strong>{t("step2Title")}</strong>
              <small>{t("step2Body")}</small>
            </div>
          </div>
        </aside>

        <div className="request-form-card list-property-form-card">
          <ListPropertyForm areas={areas} types={types} />
        </div>
      </div>
    </section>
  );
}
