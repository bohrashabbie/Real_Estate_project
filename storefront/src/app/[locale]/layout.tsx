import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingContact } from "@/components/layout/floating-contact";
import { QueryProvider } from "@/providers/query-provider";
import { getSettings } from "@/lib/api";
import { fontVariables } from "@/lib/fonts";
import { localeAlternates, localeDirection, routing, type Locale } from "@/i18n/routing";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });

  return {
    title: { default: t("name"), template: `%s — ${t("name")}` },
    description: t("tagline"),
    alternates: { languages: localeAlternates("") },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  // Office contact numbers drive the header phone button, the floating rail
  // and the footer. `getSettings` never throws — the layout renders with the
  // defaults when the API is unreachable.
  const settings = await getSettings();

  return (
    <html lang={locale} dir={localeDirection[typedLocale]} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <QueryProvider>
            <Header settings={settings} />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} locale={typedLocale} />
            <FloatingContact settings={settings} />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
