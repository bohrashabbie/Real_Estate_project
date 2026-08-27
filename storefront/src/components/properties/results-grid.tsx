"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, SearchX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiGet, type Paginated, type PropertyListItem } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { PropertyCard } from "@/components/property/property-card";

/**
 * The results grid, with the "show more" that the API's cursor pagination
 * implies — there are no page numbers to render because there is no offset.
 *
 * The first page arrives already rendered from the server, so a cold visit and
 * a crawler both get real listings; this component only appends. It keys off
 * the serialised filters, so changing a filter resets the appended tail rather
 * than stacking new results under stale ones.
 *
 * Every listing view (for-sale, for-rent, Featured, all) uses this same grid —
 * only the home page's own Featured row is the sideways-paging
 * `PropertyCarousel` instead; a full listing page keeps "show more" so
 * browsing the whole catalogue reads as one continuous list, not laps around
 * a curated rail.
 */
export function ResultsGrid({
  initial,
  filters,
  locale,
}: {
  initial: Paginated<PropertyListItem>;
  filters: Record<string, string>;
  locale: Locale;
}) {
  const t = useTranslations("listing");
  const key = JSON.stringify(filters);

  const [extra, setExtra] = useState<PropertyListItem[]>([]);
  const [cursor, setCursor] = useState(initial.next_cursor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExtra([]);
    setCursor(initial.next_cursor);
  }, [key, initial.next_cursor]);

  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await apiGet<Paginated<PropertyListItem>>("/properties", {
        locale,
        ...filters,
        cursor,
        limit: 12,
      });
      setExtra((current) => [...current, ...page.items]);
      setCursor(page.next_cursor);
    } catch {
      // A failed append leaves the button in place so it can be retried.
    } finally {
      setLoading(false);
    }
  }

  if (initial.items.length === 0) {
    return (
      <div className="no-results">
        <SearchX size={38} />
        <h2>{t("emptyTitle")}</h2>
        <p>{t("emptyBody")}</p>
        <Link className="button button-dark" href="/properties">
          {t("clearFilters")}
        </Link>
      </div>
    );
  }

  const shown = initial.items.length + extra.length;

  return (
    <>
      {/* The range heading lives here rather than on the page, because "show
          more" changes it — rendered upstream it would still read 1–12 after
          three appends. */}
      <div className="regular-results-heading">
        <div>
          <span>{t("restLabel")}</span>
          <strong>
            {/* Passed as strings on purpose: a number argument would be
                localised to Arabic-Indic digits, and the reference sets counts
                like this one in Latin — only prices and the area tally switch
                script. */}
            {cursor
              ? t("showingPartial", { from: "1", to: String(shown) })
              : t("showing", { from: "1", to: String(shown), total: String(shown) })}
          </strong>
        </div>
      </div>

      <div className="property-grid featured-four">
        {[...initial.items, ...extra].map((property) => (
          <PropertyCard key={property.id} property={property} locale={locale} />
        ))}
      </div>

      {cursor ? (
        <div className="property-pagination">
          <button type="button" onClick={more} disabled={loading}>
            <ChevronDown size={15} />
            {loading ? t("loading") : t("showMore")}
          </button>
        </div>
      ) : null}
    </>
  );
}
