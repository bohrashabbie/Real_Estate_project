"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiGet, type Paginated, type PropertyListItem } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { PropertyCard } from "@/components/property/property-card";

/** Two rows of the four-column grid. */
const PAGE_SIZE = 8;
/** Fetched a page at a time behind the visitor: three of theirs per round
 *  trip, so paging forward usually costs nothing. */
const FETCH_SIZE = 24;

/**
 * The results grid, paged eight at a time — four columns, two rows, on every
 * listing view (for sale, for rent, Featured, all).
 *
 * The page numbers are real, but the API underneath them is not offset-paged:
 * the project's rule is cursor pagination on `(created_at, id)`, so there is
 * no `?page=4` to ask the server for. The two are reconciled here — results
 * accumulate in a buffer as cursors are followed, and the numbers page
 * through what has been loaded. Stepping past the end of the buffer fetches
 * the next cursor first and then advances, so the visitor never sees a page
 * that is empty while more exists.
 *
 * The first page arrives already rendered from the server, so a cold visit
 * and a crawler both get real listings. It keys off the serialised filters,
 * so changing one resets to page one rather than stranding the reader on
 * page four of results that no longer exist.
 */
export function ResultsGrid({
  initial,
  filters,
  locale,
}: {
  initial: Paginated<PropertyListItem>;
  filters: Record<string, string | string[]>;
  locale: Locale;
}) {
  const t = useTranslations("listing");
  const key = JSON.stringify(filters);
  const gridRef = useRef<HTMLDivElement>(null);
  // Skips the scroll on first paint: only a page *change* should move the
  // viewport, not the server-rendered first page arriving.
  const paged = useRef(false);

  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.next_cursor);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.next_cursor);
    setPage(0);
    paged.current = false;
  }, [key, initial.items, initial.next_cursor]);

  useEffect(() => {
    if (!paged.current) return;
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const loadedPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // One more page exists but hasn't been fetched: the numbers show what is
  // known, and Next stays live to go and get the rest.
  const hasMore = Boolean(cursor);

  async function goTo(target: number) {
    if (target < 0 || loading) return;

    if (target >= loadedPages) {
      if (!hasMore) return;
      setLoading(true);
      try {
        const next = await apiGet<Paginated<PropertyListItem>>("/properties", {
          locale,
          ...filters,
          cursor,
          limit: FETCH_SIZE,
        });
        setItems((current) => [...current, ...next.items]);
        setCursor(next.next_cursor);
        // Only move once the results are actually in: a page number that
        // lands on nothing is worse than a moment's wait on the button.
        if (next.items.length > 0) {
          paged.current = true;
          setPage(target);
        }
      } catch {
        // A failed fetch leaves the reader where they are, button live.
      } finally {
        setLoading(false);
      }
      return;
    }

    paged.current = true;
    setPage(target);
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

  const visible = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <div className="property-grid featured-four" ref={gridRef}>
        {visible.map((property) => (
          <PropertyCard key={property.id} property={property} locale={locale} />
        ))}
      </div>

      {loadedPages > 1 || hasMore ? (
        <div className="property-pagination">
          {/* Chevrons are physical in both directions, following the two
              sliders on the home page: left is previous, right is next. */}
          <button
            type="button"
            aria-label={t("previousPage")}
            onClick={() => goTo(page - 1)}
            disabled={page === 0 || loading}
          >
            <ChevronLeft size={16} />
          </button>

          <div>
            {Array.from({ length: loadedPages }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index === page ? "is-active" : undefined}
                aria-current={index === page || undefined}
                aria-label={t("goToPage", { page: String(index + 1) })}
                onClick={() => goTo(index)}
              >
                {/* Latin digits: the reference sets counts like this one in
                    Latin under both locales -- only prices and the area
                    tally switch script (see lib/format.ts). */}
                {index + 1}
              </button>
            ))}
            {hasMore ? <span className="pagination-more">…</span> : null}
          </div>

          <button
            type="button"
            aria-label={t("nextPage")}
            onClick={() => goTo(page + 1)}
            disabled={loading || (page === loadedPages - 1 && !hasMore)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
