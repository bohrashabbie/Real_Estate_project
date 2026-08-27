"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiGet, type Paginated, type PropertyListItem } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { PropertyCarousel } from "@/components/properties/property-carousel";

/**
 * Every listing view (for-sale, for-rent, Featured, all) pages sideways
 * through `PropertyCarousel`, same as the home page's own Featured row.
 * Paging past the last loaded card fetches the next cursor page instead of
 * requiring a "show more" click — see `PropertyCarousel`'s `onNeedMore`.
 *
 * The first page still arrives already rendered from the server, so a cold
 * visit and a crawler both get real listings; this component only appends.
 * It keys off the serialised filters, so changing a filter resets the
 * appended tail rather than stacking new results under stale ones.
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

      <PropertyCarousel
        properties={[...initial.items, ...extra]}
        locale={locale}
        hasMore={Boolean(cursor)}
        loading={loading}
        onNeedMore={more}
      />
    </>
  );
}
