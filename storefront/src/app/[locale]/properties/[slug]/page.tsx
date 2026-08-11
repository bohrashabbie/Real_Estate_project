import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { decodeSlugParam, getProperty, getSettings, mediaUrl } from "@/lib/api";
import { formatPrice, formatSqm, telLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Gallery } from "@/components/property/gallery";
import { InquiryForm } from "@/components/property/inquiry-form";
import { PropertyMap } from "@/components/property/property-map";
import { StatusPill } from "@/components/property/status-pill";
import { WaPropertyButton } from "@/components/property/wa-property-button";
import {
  ArrowIcon,
  CheckIcon,
  ExternalIcon,
  PhoneIcon,
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

/**
 * One property.
 *
 * Was a narrow centred column: every heading, every number and every paragraph
 * centre-aligned down the middle of a 56rem page, with the price and the phone
 * number at the very bottom. That is the shape of a flyer, and it put the one
 * thing the page exists for — contacting the office — below everything else.
 *
 * Now it is a record and a counter: the detail reads down the main column at
 * full width, while price, status, phone, WhatsApp and the inquiry form sit in
 * a sticky column that stays on screen the whole way down. Same grid as the
 * listings page, so the two pages feel like one building.
 */
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

  // The dimension row — the same device as the listing cards, so the numbers
  // are read the same way on both pages.
  const dims = [
    { label: t("rooms"), value: property.rooms },
    { label: t("bathrooms"), value: property.bathrooms },
    { label: t("floors"), value: property.floors },
    { label: t("sqm"), value: formatSqm(property.area_sqm) },
  ];

  return (
    <div className="mx-auto max-w-(--container-site) px-4 sm:px-6">
      {/* Trail — where this sits in the register. */}
      <nav className="flex flex-wrap items-center gap-2 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        <Link href="/properties" className="transition-colors hover:text-gold">
          {t("backToAll")}
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/properties?area=${property.area.slug}`}
          className="transition-colors hover:text-gold"
        >
          {property.area.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-navy" dir="ltr">
          {property.ref_no}
        </span>
      </nav>

      <Gallery images={property.images} title={property.title} />

      <div className="grid border-t border-cream-200 lg:grid-cols-[1fr_21rem]">
        {/* ---------------------------------------------------------------- */}
        {/* The record                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0 py-8 lg:pe-10">
          <header>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
              {property.type.name}
              <span className="h-2.5 w-px bg-cream-300" aria-hidden />
              <span className="text-muted">{t(`purpose.${property.purpose}`)}</span>
              <StatusPill status={property.status} className="ms-1" />
            </p>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-navy sm:text-4xl">
              {property.title}
            </h1>

            <p className="mt-2 text-muted">
              {property.area.name}
              {property.block ? ` — ${t("block", { block: property.block })}` : null}
            </p>
          </header>

          <div className="dims mt-7">
            {dims.map((dim) => (
              <span
                key={dim.label}
                className={cn("dim", (dim.value ?? null) === null && "opacity-40")}
              >
                <span className="dim-v text-xl">{dim.value ?? "—"}</span>
                <span className="dim-k">{dim.label}</span>
              </span>
            ))}
          </div>

          {property.description ? (
            <section className="mt-10 border-t border-cream-200 pt-7">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {t("descriptionTitle")}
              </h2>
              <p className="mt-4 max-w-2xl whitespace-pre-line text-base leading-relaxed text-navy/85">
                {property.description}
              </p>
            </section>
          ) : null}

          {property.amenities.length > 0 ? (
            <section className="mt-10 border-t border-cream-200 pt-7">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {t("amenitiesTitle")}
              </h2>
              {/* A checked list, not a grid of boxed cards — an amenity is one
                  word and does not need a container to prove it exists. */}
              <ul className="mt-4 grid gap-x-10 sm:grid-cols-2">
                {property.amenities.map((amenity) => (
                  <li
                    key={amenity.key}
                    className="flex items-center gap-3 border-t border-cream-200 py-2.5 text-sm font-semibold text-navy first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
                  >
                    <CheckIcon width={14} height={14} strokeWidth={3} className="shrink-0 text-gold" />
                    {amenity.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasCoords ? (
            <section className="mt-10 border-t border-cream-200 pt-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  {t("mapTitle")}
                </h2>
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-cream-200 px-3.5 py-2 text-xs font-bold text-navy transition-colors hover:border-gold hover:text-gold"
                >
                  <ExternalIcon width={14} height={14} />
                  {t("openInMaps")}
                </a>
              </div>
              <div className="border border-cream-200">
                <PropertyMap latitude={latitude} longitude={longitude} />
              </div>
            </section>
          ) : null}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* The counter — price and every way to reach the office             */}
        {/* ---------------------------------------------------------------- */}
        <aside className="border-t border-cream-200 py-8 lg:border-s lg:border-t-0 lg:ps-8">
          <div className="lg:sticky lg:top-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              {t(`purpose.${property.purpose}`)}
            </p>
            <p className="mt-1.5 font-display text-3xl font-extrabold tabular-nums text-gold">
              {formatPrice(property.price, property.purpose, typedLocale)}
            </p>

            <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-cream-200 pt-3 text-xs">
              <span className="font-bold uppercase tracking-[0.14em] text-muted">
                {t("refLabel")}
              </span>
              <span className="font-bold tabular-nums text-navy" dir="ltr">
                {property.ref_no}
              </span>
            </p>

            <div className="mt-6 flex flex-col gap-2">
              {settings.phone ? (
                <a
                  href={telLink(settings.phone)}
                  className="flex items-center justify-center gap-2.5 bg-navy px-6 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-gold"
                >
                  <PhoneIcon width={17} height={17} />
                  {t("directContact")}
                </a>
              ) : null}
              {settings.whatsapp ? (
                <WaPropertyButton number={settings.whatsapp} title={property.title} />
              ) : null}
            </div>

            <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              <span className="h-px flex-1 bg-cream-200" aria-hidden />
              {t("orInquiry")}
              <span className="h-px flex-1 bg-cream-200" aria-hidden />
            </div>

            <InquiryForm
              propertyId={property.id}
              source="property"
              initialMessage={t("prefilledMessage", { title: property.title })}
            />
          </div>
        </aside>
      </div>

      <div className="border-t border-cream-200 py-8">
        <Link
          href="/properties"
          className="group/back inline-flex items-center gap-3 text-sm font-bold text-navy transition-colors hover:text-gold"
        >
          <ArrowIcon
            width={17}
            height={17}
            className="rotate-180 transition-transform group-hover/back:-translate-x-1 rtl:rotate-0 rtl:group-hover/back:translate-x-1"
          />
          {t("backToAll")}
        </Link>
      </div>
    </div>
  );
}
