import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BrandIntro } from "@/components/layout/brand-intro";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactFloats } from "@/components/layout/contact-floats";
import { ChatLauncher } from "@/components/layout/chat-launcher";
import { CompareBar } from "@/components/property/compare-bar";
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
    title: { default: `${t("name")} — ${t("titleSuffix")}`, template: `%s — ${t("name")}` },
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

/**
 * The frame every page renders inside, in the reference's order: the title
 * card, then `<main>` carrying the header, the page and the footer, then the
 * two fixed rails outside it.
 *
 * The header sits *inside* `<main>` because the reference's sticky offsets and
 * the drawer's `inset` are measured from it; moving it out shifts the drawer.
 */
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

  // Office contact numbers drive the header phone button, the floating rail,
  // the chat panel and the footer. `getSettings` never throws — the layout
  // renders with the defaults when the API is unreachable.
  const settings = await getSettings();

  return (
    <html lang={locale} dir={localeDirection[typedLocale]} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>
            <BrandIntro />
            <main>
              <Header settings={settings} />
              {children}
              <Footer settings={settings} />
            </main>
            {/* One rail, not two opposite corners: the launcher and the three
                buttons are the same offer — reach the office — so they share a
                column and a stacking context instead of racing each other for
                the bottom of the viewport from either side. */}
            <div className="contact-rail">
              <ChatLauncher settings={settings} />
              <ContactFloats settings={settings} />
            </div>
            <CompareBar />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
