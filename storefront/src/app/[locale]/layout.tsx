import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingContact } from "@/components/layout/floating-contact";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { QueryProvider } from "@/providers/query-provider";
import { getSettings } from "@/lib/api";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";
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
    // Without a metadataBase every `alternates`/`openGraph` URL below stays
    // path-relative, which crawlers and social scrapers cannot resolve.
    metadataBase: new URL(SITE_URL),
    title: { default: t("name"), template: `%s — ${t("name")}` },
    description: t("tagline"),
    alternates: { canonical: `/${locale}`, languages: localeAlternates("") },
    openGraph: {
      type: "website",
      siteName: t("name"),
      locale,
      title: t("name"),
      description: t("tagline"),
      url: `/${locale}`,
      images: [{ url: "/logo-mark.png", width: 512, height: 512, alt: t("name") }],
    },
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
      <head>
        {/* Stamps the theme before first paint. A visitor who chose dark must
            never see a flash of the light ground on the way in, and nothing
            React renders can run early enough to prevent that. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
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
