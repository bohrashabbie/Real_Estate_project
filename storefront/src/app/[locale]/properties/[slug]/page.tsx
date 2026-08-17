import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { decodeSlugParam, getProperty, getSettings, mediaUrl } from "@/lib/api";
import { formatPrice, formatSqm, telLink } from "@/lib/format";
import { MapTabs } from "@/components/map/map-tabs";
import { Gallery } from "@/components/property/gallery";
import { InquiryForm } from "@/components/property/inquiry-form";
import { PropertyMap } from "@/components/property/property-map";
import { StatusPill } from "@/components/property/status-pill";
import { WaPropertyButton } from "@/components/property/wa-property-button";
import {
  ArrowIcon,
  BathIcon,
  BedIcon,
  CheckIcon,
  ExpandIcon,
  ExternalIcon,
  LayersIcon,
  PhoneIcon,
  PinIcon,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const property = await getProperty(locale as Locale, slug);
  if (!property) return {};

  const description =
    property.description?.slice(0, 160) ??
    `${property.type.name} — ${property.area.name}`;
  const image = mediaUrl(property.main_image ?? property.images.find((i) => i.is_main)?.url);

  return {
    title: property.title,
    description,
    alternates: {
      canonical: `/${locale}/properties/${encodeURIComponent(property.slug ?? slug)}`,
      languages: localeAlternates(`/properties/${slug}`),
    },
    openGraph: {
      title: property.title,
      description,
      type: "article",
      locale,
      ...(image ? { images: [{ url: image, alt: property.title }] } : {}),
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "detail" });

  const [property, settings] = await Promise.all([
    getProperty(typedLocale, slug),
    getSettings(),
  ]);
  if (!property) notFound();

  // Slugs are per-locale, so switching language (or following a link written
  // in the other locale) lands here with a slug that belongs to the *other*
  // translation. The API resolves it either way, but leaving it in the URL
  // means two addresses for one page — send the visitor to the canonical one.
  // `ref_no` stays as-is: SPEC makes it a first-class way to reach a listing.
  const requested = decodeSlugParam(slug);
  if (property.slug && requested !== property.slug && requested !== property.ref_no) {
    redirect({ href: `/properties/${property.slug}`, locale: typedLocale });
  }

  const latitude = property.latitude === null ? null : Number(property.latitude);
  const longitude = property.longitude === null ? null : Number(property.longitude);
  const hasCoords =
    latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);

  const tiles = [
    { icon: <BedIcon width={22} height={22} />, label: t("rooms"), value: property.rooms },
    {
      icon: <ExpandIcon width={22} height={22} />,
      label: t("sqm"),
      value: formatSqm(property.area_sqm),
    },
    { icon: <LayersIcon width={22} height={22} />, label: t("floors"), value: property.floors },
    { icon: <BathIcon width={22} height={22} />, label: t("bathrooms"), value: property.bathrooms },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Gallery images={property.images} title={property.title} />

      {/* Headline block */}
      <header className="mt-8 text-center">
        <p className="text-sm font-bold tracking-wide text-gold">
          {property.type.name} • {t(`purpose.${property.purpose}`)}
        </p>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-[28px] font-normal leading-[1.4] text-navy sm:text-[36px]">
          {property.title}
        </h1>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-muted">
          {property.area.name}
          {property.block ? ` — ${t("block", { block: property.block })}` : null}
          <PinIcon width={18} height={18} className="text-gold" />
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wide text-muted/80" dir="ltr">
          {property.ref_no}
        </p>
        <div className="mt-4 flex justify-center">
          <StatusPill status={property.status} />
        </div>
        <p className="mt-4 text-3xl font-bold text-gold">
          {formatPrice(property.price, property.purpose, typedLocale)}
        </p>
      </header>

      {/* 2×2 stat tiles */}
      <section className="mt-8 grid grid-cols-2 gap-3.5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center justify-between gap-3 rounded-2xl bg-cream-100/80 p-5 ring-1 ring-cream-200"
          >
            <span className="text-gold">{tile.icon}</span>
            <span className="text-end">
              <span className="block text-xl font-bold text-navy">{tile.value ?? "—"}</span>
              <span className="block text-sm text-muted">{tile.label}</span>
            </span>
          </div>
        ))}
      </section>

      {/* Description */}
      {property.description ? (
        <section className="mt-10 text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">{t("descriptionTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line leading-relaxed text-muted">
            {property.description}
          </p>
        </section>
      ) : null}

      {/* Amenities */}
      {property.amenities.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-center text-2xl font-bold text-navy">{t("amenitiesTitle")}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {property.amenities.map((amenity) => (
              <li
                key={amenity.key}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-card ring-1 ring-cream-200"
              >
                <span className="font-semibold text-navy">{amenity.name}</span>
                <CheckIcon width={20} height={20} strokeWidth={2.4} className="shrink-0 text-gold" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Map — only when the office pinned coordinates. Two tabs: the site's
          own map, and PACI's Kuwait Finder, which is the address system this
          country actually navigates by. */}
      {hasCoords ? (
        <section className="mt-10 rounded-3xl bg-white p-4 shadow-card ring-1 ring-cream-200 sm:p-5">
          <h2 className="mb-4 text-xl font-bold text-navy">{t("mapTitle")}</h2>
          <MapTabs
            latitude={latitude}
            longitude={longitude}
            mapAction={
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-bold text-navy ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
              >
                <ExternalIcon width={16} height={16} className="text-gold" />
                {t("openInMaps")}
              </a>
            }
          >
            <PropertyMap latitude={latitude} longitude={longitude} />
          </MapTabs>
        </section>
      ) : null}

      {/* Contact card */}
      <section className="mt-10 rounded-3xl bg-white p-6 shadow-card ring-1 ring-cream-200 sm:p-8">
        <p className="text-center text-base font-bold text-gold-dark">{t("contactTitle")}</p>
        <p className="mt-2 text-center text-xl font-bold text-navy">{property.title}</p>

        <div className="mt-6 flex flex-col gap-3">
          {settings.phone ? (
            <a
              href={telLink(settings.phone)}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-navy px-6 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700"
            >
              {t("directContact")}
              <PhoneIcon width={20} height={20} />
            </a>
          ) : null}
          {settings.whatsapp ? (
            <WaPropertyButton number={settings.whatsapp} title={property.title} />
          ) : null}
        </div>

        <div className="my-7 flex items-center gap-4 text-sm font-semibold text-muted">
          <span className="h-px flex-1 bg-cream-200" />
          {t("orInquiry")}
          <span className="h-px flex-1 bg-cream-200" />
        </div>

        <InquiryForm
          propertyId={property.id}
          source="property"
          initialMessage={t("prefilledMessage", { title: property.title })}
        />
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-lg font-bold text-navy transition-colors hover:text-gold-dark"
        >
          {t("backToAll")}
          <ArrowIcon width={20} height={20} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
