"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import { GitCompareArrows, Trash2, X } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiGet, mediaUrl, type PropertyDetail } from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { useCompare } from "@/lib/compare-store";

/**
 * The comparison table.
 *
 * The shortlist is only slugs in `localStorage`, so the full rows are fetched
 * here rather than stashed — a card saved last week would otherwise show last
 * week's price. A slug that no longer resolves (unpublished, sold, renamed)
 * drops out silently instead of rendering an empty column.
 */
export function CompareView({ locale }: { locale: Locale }) {
  const t = useTranslations("compare");
  const tc = useTranslations();
  const { items, ready, remove, clear } = useCompare();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const queries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["compare", locale, item.slug],
      queryFn: () =>
        apiGet<PropertyDetail>(`/properties/${encodeURIComponent(item.slug)}`, { locale }),
      retry: false,
    })),
  });

  const properties = queries
    .map((query) => query.data)
    .filter((property): property is PropertyDetail => Boolean(property));

  if (!mounted || !ready) return null;

  if (items.length === 0) {
    return (
      <div className="empty-compare">
        <GitCompareArrows size={40} />
        <h2>{t("emptyTitle")}</h2>
        <p>{t("emptyBody")}</p>
        <Link className="button button-dark" href="/properties">
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  const rows: { label: string; value: (property: PropertyDetail) => string }[] = [
    {
      label: t("rowPrice"),
      value: (property) => formatPrice(property.price, property.purpose, locale),
    },
    { label: t("rowPurpose"), value: (property) => tc(`purpose.${property.purpose}`) },
    { label: t("rowArea"), value: (property) => property.area.name },
    { label: t("rowType"), value: (property) => property.type.name },
    {
      label: t("rowSize"),
      value: (property) => {
        const sqm = formatSqm(property.area_sqm);
        return sqm ? `${sqm} ${tc("card.sqm")}` : "—";
      },
    },
    { label: t("rowRooms"), value: (property) => String(property.rooms ?? "—") },
    { label: t("rowBathrooms"), value: (property) => String(property.bathrooms ?? "—") },
    { label: t("rowStatus"), value: (property) => tc(`status.${property.status}`) },
    {
      label: t("rowAmenities"),
      value: (property) =>
        property.amenities.length > 0
          ? property.amenities.map((amenity) => amenity.name).join("، ")
          : "—",
    },
  ];

  return (
    <>
      <div className="comparison-toolbar">
        <span>{t("count", { count: items.length })}</span>
        <button type="button" onClick={clear}>
          <Trash2 size={14} />
          {t("clearAll")}
        </button>
      </div>

      <div className="comparison-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("specColumn")}</th>
              {properties.map((property) => {
                const image = mediaUrl(property.main_image);
                return (
                  <th key={property.id}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" />
                    ) : null}
                    <strong>{property.title}</strong>
                    <button type="button" onClick={() => remove(property.slug)}>
                      <X size={13} />
                      {t("remove")}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {properties.map((property) => (
                  <td key={property.id}>{row.value(property)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {properties.map((property) => (
                <td key={property.id}>
                  <Link
                    className="button button-dark small-button"
                    href={`/properties/${property.slug}`}
                  >
                    {t("openProperty")}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
