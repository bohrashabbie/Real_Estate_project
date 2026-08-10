import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates, type Locale } from "@/i18n/routing";
import { getAreas, getPropertyTypes } from "@/lib/api";
import { RequestForm } from "@/components/request/request-form";
import { ClipboardIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "request" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("/request") },
  };
}

export default async function RequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "request" });

  const [areas, types] = await Promise.all([
    getAreas(typedLocale),
    getPropertyTypes(typedLocale),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-gold">
          <ClipboardIcon width={26} height={26} />
        </span>
        <h1 className="mt-4 text-3xl font-bold text-navy sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("subtitle")}</p>
      </header>

      <section className="mt-8 rounded-3xl bg-cream-50 p-6 shadow-card ring-1 ring-cream-200 sm:p-8">
        <RequestForm areas={areas} types={types} />
      </section>
    </div>
  );
}
