"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import {
  ArrowLeft,
  List,
  Map as MapIcon,
  MapPin,
  RefreshCw,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  apiGet,
  mediaUrl,
  type Paginated,
  type PropertyDetail,
  type PropertyListItem,
} from "@/lib/api";
import { formatPrice, formatSqm } from "@/lib/format";
import { PropertyCard } from "@/components/property/property-card";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const KUWAIT_CENTER: [number, number] = [47.8, 29.35];
const MAX_PROPERTIES = 200;

/** A filled pin with a white centre -- drawn inline rather than as a React
 *  icon, because MapLibre markers are plain DOM elements built outside
 *  React. `currentColor` lets the CSS recolour it on hover. */
const PIN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C7.6 2 4 5.5 4 9.8c0 5.6 7.1 11.6 7.4 11.9a.9.9 0 0 0 1.2 0C12.9 21.4 20 15.4 20 9.8 20 5.5 16.4 2 12 2z"/><circle cx="12" cy="9.8" r="3.3" fill="#fff"/></svg>';

interface Located {
  item: PropertyListItem;
  lat: number;
  lng: number;
}

/** Pages through `/properties` with the page's filters until exhausted, or
 *  the cap. */
async function fetchAll(
  locale: Locale,
  filters: Record<string, string | string[]>,
): Promise<PropertyListItem[]> {
  const collected: PropertyListItem[] = [];
  let cursor: string | null = null;
  do {
    const page: Paginated<PropertyListItem> = await apiGet("/properties", {
      locale,
      limit: 50,
      ...filters,
      ...(cursor ? { cursor } : {}),
    });
    collected.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor && collected.length < MAX_PROPERTIES);
  return collected;
}

/**
 * The map browser: a gold pin on every property over Kuwait, its price on
 * hover, a card for whichever is selected, and a list view for anyone who
 * would rather scroll than pan.
 *
 * It shows what the page's search bar asked for -- `filters` is read from the
 * same query string the listing page uses -- so narrowing the search narrows
 * the pins.
 *
 * The list endpoint carries no coordinates, so each listing is resolved through
 * the detail endpoint once and the ones the office never pinned drop out — the
 * toolbar says how many survived, because "8 properties" on a map showing three
 * pins is the kind of quiet lie that erodes trust in the whole listing.
 */
export function MapExplorer({
  locale,
  filters = {},
}: {
  locale: Locale;
  filters?: Record<string, string | string[]>;
}) {
  const t = useTranslations();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);

  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const filterKey = JSON.stringify(filters);

  const { data: properties } = useQuery({
    queryKey: ["map-properties", locale, filterKey],
    queryFn: () => fetchAll(locale, filters),
  });

  // Keyed by the ids themselves, not a count: two searches can return the
  // same number of listings and must not share each other's coordinates.
  const idsKey = (properties ?? []).map((item) => item.id).join(",");

  const { data: located, isLoading } = useQuery({
    queryKey: ["map-located", locale, idsKey],
    enabled: properties !== undefined,
    queryFn: async (): Promise<Located[]> => {
      const details = await Promise.all(
        (properties ?? []).map(async (item) => {
          try {
            const detail = await apiGet<PropertyDetail>(
              `/properties/${encodeURIComponent(item.slug)}`,
              { locale },
            );
            const lat = detail.latitude === null ? NaN : Number(detail.latitude);
            const lng = detail.longitude === null ? NaN : Number(detail.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return { item, lat, lng };
          } catch {
            return null;
          }
        }),
      );
      return details.filter((entry): entry is Located => entry !== null);
    },
  });

  const current = useMemo(
    () => located?.find((entry) => entry.item.slug === selected) ?? located?.[0] ?? null,
    [located, selected],
  );

  useEffect(() => {
    if (view !== "map") return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container.current || map.current) return;
      const instance = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE,
        center: KUWAIT_CENTER,
        zoom: 8.4,
        attributionControl: { compact: true },
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }));
      instance.on("load", () => setReady(true));
      map.current = instance;
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  // Tear the map down only when the component unmounts, not on every view flip.
  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!map.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !map.current) return;

      // Cleared first and unconditionally: a search that matches nothing
      // must empty the map, not leave the previous search's pins standing.
      for (const marker of markers.current) marker.remove();
      markers.current = [];

      for (const entry of located ?? []) {
        const price = formatPrice(entry.item.price, entry.item.purpose, locale);

        // MapLibre owns the outer element's transform to position it, so the
        // pin that lifts and scales on hover is a child it doesn't touch.
        const element = document.createElement("div");
        element.className = "map-marker";

        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = `map-pin${entry.item.slug === current?.item.slug ? " is-active" : ""}`;
        pin.setAttribute("aria-label", `${entry.item.title} — ${price}`);
        pin.innerHTML = PIN_SVG;
        const label = document.createElement("span");
        label.className = "map-pin-price";
        label.textContent = price;
        pin.appendChild(label);
        pin.addEventListener("click", () => setSelected(entry.item.slug));
        element.appendChild(pin);

        markers.current.push(
          new maplibregl.Marker({ element, anchor: "bottom" })
            .setLngLat([entry.lng, entry.lat])
            .addTo(map.current),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [located, locale, current?.item.slug, ready]);

  function recenter() {
    if (!map.current) return;
    map.current.flyTo({ center: KUWAIT_CENTER, zoom: 8.4 });
  }

  const count = located?.length ?? 0;
  const image = current ? mediaUrl(current.item.main_image) : null;
  const sqm = current ? formatSqm(current.item.area_sqm) : null;

  return (
    <>
      <div className="map-toolbar">
        <div className="segmented">
          <button
            type="button"
            className={view === "map" ? "is-active" : undefined}
            onClick={() => setView("map")}
          >
            <MapIcon size={15} />
            {t("mapPage.mapView")}
          </button>
          <button
            type="button"
            className={view === "list" ? "is-active" : undefined}
            onClick={() => setView("list")}
          >
            <List size={15} />
            {t("mapPage.listView")}
          </button>
        </div>

        <button type="button" className="button button-outline" onClick={recenter}>
          <RefreshCw size={14} />
          {t("mapPage.reset")}
        </button>

        <span>{isLoading ? t("mapPage.loading") : t("mapPage.count", { count })}</span>
      </div>

      {view === "map" ? (
        <div className="real-map-layout">
          <div className="real-map">
            {!ready ? <div className="map-loading">{t("mapPage.loadingMap")}</div> : null}
            <div ref={container} className="map-surface" />
          </div>

          {current ? (
            <aside className="map-selected-card">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={t("card.imageAlt", { title: current.item.title })} />
              ) : null}
              <h2>{current.item.title}</h2>
              <p>
                <MapPin size={14} />
                {current.item.area.name}
              </p>
              <div>
                {sqm ? (
                  <span>
                    {sqm} {t("card.sqm")}
                  </span>
                ) : null}
                {current.item.rooms ? (
                  <span>{t("card.rooms", { count: current.item.rooms })}</span>
                ) : null}
                <span>{t(`status.${current.item.status}`)}</span>
              </div>
              <strong>{formatPrice(current.item.price, current.item.purpose, locale)}</strong>
              <Link
                className="button button-gold full-button"
                href={`/properties/${current.item.slug}`}
              >
                <ArrowLeft size={15} />
                {t("mapPage.openProperty")}
              </Link>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="property-grid two-column">
          {(located ?? []).map((entry) => (
            <PropertyCard key={entry.item.id} property={entry.item} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
