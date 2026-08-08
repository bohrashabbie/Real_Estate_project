import type { Metadata } from "next"
import { Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import "../globals.css"
import { locales, localeDirections, type Locale } from "@/i18n/routing"
import { QueryProvider } from "@/providers/query-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"

/* IBM Plex Sans Arabic carries both scripts well; Arabic is the default
 * locale, so the primary face must be Arabic-first. */
const sans = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
})
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "kwt25 Admin — عقار الكويت",
  description: "Internal admin panel for Kuwait 25 (kwt25) staff.",
  icons: { icon: "/favicon.png" },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as Locale)) notFound()

  // Enables static rendering for this request's locale.
  setRequestLocale(locale)

  const messages = await getMessages()
  const dir = localeDirections[locale as Locale]

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${sans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                position={dir === "rtl" ? "top-left" : "top-right"}
                dir={dir}
              />
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
