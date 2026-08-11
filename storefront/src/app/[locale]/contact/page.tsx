import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates } from "@/i18n/routing";
import { getSettings } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { InquiryForm } from "@/components/property/inquiry-form";
import {
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  WhatsappIcon,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { languages: localeAlternates("/contact") },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  const settings = await getSettings();

  const cards = [
    settings.phone
      ? {
          key: "phone",
          label: t("phone"),
          value: settings.phone,
          href: telLink(settings.phone),
          icon: <PhoneIcon width={24} height={24} />,
          external: false,
        }
      : null,
    settings.whatsapp
      ? {
          key: "whatsapp",
          label: t("whatsapp"),
          value: settings.whatsapp,
          href: waLink(settings.whatsapp),
          icon: <WhatsappIcon width={24} height={24} />,
          external: true,
        }
      : null,
    settings.email
      ? {
          key: "email",
          label: t("email"),
          value: settings.email,
          href: `mailto:${settings.email}`,
          icon: <MailIcon width={24} height={24} />,
          external: false,
        }
      : null,
    settings.instagram
      ? {
          key: "instagram",
          label: t("instagram"),
          value: settings.instagram,
          href: settings.instagram.startsWith("http")
            ? settings.instagram
            : `https://instagram.com/${settings.instagram.replace(/^@/, "")}`,
          icon: <InstagramIcon width={24} height={24} />,
          external: true,
        }
      : null,
  ].filter((card) => card !== null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="text-center">
        <p className="text-sm font-bold tracking-wide text-gold">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("subtitle")}</p>
      </header>

      {cards.length > 0 ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <a
              key={card.key}
              href={card.href}
              {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-cream-200 transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-gold transition-colors group-hover:bg-navy">
                {card.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-muted">{card.label}</span>
                <span className="block font-bold text-navy" dir="ltr">
                  {card.value}
                </span>
              </span>
            </a>
          ))}
        </section>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-cream-300 bg-white/60 p-8 text-center text-muted">
          {t("noContacts")}
        </p>
      )}

      {/* Working hours */}
      <section className="mt-6 rounded-2xl bg-navy p-6 text-center text-white sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wider text-gold">{t("hoursTitle")}</p>
        <p className="mt-2 text-lg font-bold">{t("hoursWeek")}</p>
        <p className="mt-1 text-sm text-white/70">{t("hoursNote")}</p>
      </section>

      {/* Inquiry form */}
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card ring-1 ring-cream-200 sm:p-8">
        <h2 className="text-center text-2xl font-bold text-navy">{t("formTitle")}</h2>
        <p className="mt-2 text-center text-muted">{t("formSubtitle")}</p>
        <div className="mt-6">
          <InquiryForm source="contact" wide />
        </div>
      </section>
    </div>
  );
}
