import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { MapExplorer } from "@/components/map/map-explorer";
import { MapTabs } from "@/components/map/map-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mapPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("/map") },
  };
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // No coordinates here: this page is the whole country, so Kuwait Finder
  // opens on Kuwait rather than on any one pin.
  return (
    <div className="mx-auto max-w-(--container-site) px-4 py-6 sm:px-6">
      <MapTabs>
        <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cream-200">
          <MapExplorer locale={locale as Locale} />
        </div>
      </MapTabs>
    </div>
  );
}
