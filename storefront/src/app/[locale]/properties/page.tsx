import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { ListingView } from "@/components/properties/listing-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("/properties") },
  };
}

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  // Taxonomy powers the filter panel; safe fallbacks keep the page rendering
  // (and `next build` passing) with no API behind it.
  const [areas, types] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
  ]);

  return (
    <Suspense>
      <ListingView areas={areas} types={types} locale={typedLocale} />
    </Suspense>
  );
}
