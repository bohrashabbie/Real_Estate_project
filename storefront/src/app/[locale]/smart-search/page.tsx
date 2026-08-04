import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { SmartSearchWizard } from "@/components/smart-search/wizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "smart" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("/smart-search") },
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

  const [areas, types] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
  ]);

  return <SmartSearchWizard areas={areas} types={types} locale={typedLocale} />;
}
