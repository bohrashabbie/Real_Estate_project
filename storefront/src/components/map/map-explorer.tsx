"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import {
  ArrowLeft,
  ExternalLink,
  List,
  Map as MapIcon,
  MapPin,
  MapPinned,
  RefreshCw,
  Smartphone,
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
import { formatBareAmount, formatPrice, formatSqm } from "@/lib/format";
import {
  KUWAIT_FINDER_ANDROID_URL,
  KUWAIT_FINDER_IOS_URL,
  KUWAIT_FINDER_URL,
} from "@/lib/kuwait-finder";
import { PropertyCard } from "@/components/property/property-card";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const KUWAIT_CENTER: [number, number] = [47.8, 29.35];
const MAX_PROPERTIES = 200;

interface Located {
  item: PropertyListItem;
  lat: number;
  lng: number;
}

/** Pages through `/properties` until exhausted, or the cap. */
async function fetchAll(locale: Locale): Promise<PropertyListItem[]> {
  const collected: PropertyListItem[] = [];
  let cursor: string | null = null;
  do {
    const page: Paginated<PropertyListItem> = await apiGet("/properties", {
      locale,
      limit: 50,
      ...(cursor ? { cursor } : {}),
    });
    collected.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor && collected.length < MAX_PROPERTIES);
  return collected;
}

/**
 * The map browser: gold price pins over Kuwait, a card for whichever is
 * selected, a list view for anyone who would rather scroll than pan, and
 * PACI's Kuwait Finder for anyone navigating by the address system Kuwait
 * actually uses — block, parcel, PACI number, none of which a world map
 * carries. The property page already links into the finder per listing; this
 * is the same map at country scale.
 *
 * The list endpoint carries no coordinates, so each listing is resolved through
 * the detail endpoint once and the ones the office never pinned drop out — the
 * toolbar says how many survived, because "8 properties" on a map showing three
 * pins is the kind of quiet lie that erodes trust in the whole listing.
 */
export function MapExplorer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);

  const [view, setView] = useState<"map" | "list" | "finder">("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["map-properties", locale],
    queryFn: () => fetchAll(locale),
  });

  const { data: located, isLoading } = useQuery({
    queryKey: ["map-located", locale, properties?.length ?? 0],
    enabled: Boolean(properties?.length),
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
    if (!located?.length || !map.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !map.current) return;

      for (const marker of markers.current) marker.remove();
      markers.current = [];

      for (const entry of located) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `map-pin${entry.item.slug === current?.item.slug ? " is-active" : ""}`;
        element.textContent = formatBareAmount(entry.item.price, locale);
        element.setAttribute("aria-label", entry.item.title);
        element.addEventListener("click", () => setSelected(entry.item.slug));

        markers.current.push(
          new maplibregl.Marker({ element })
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
    if (!map.current || !located?.length) return;
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
          <button
            type="button"
            className={view === "finder" ? "is-active" : undefined}
            onClick={() => setView("finder")}
          >
            <MapPinned size={15} />
            {t("finder.finderTab")}
          </button>
        </div>

        {/* Both are about our own listings; neither means anything over PACI's
            map, and a listing count beside it would read as a claim about
            what the finder is showing. */}
        {view === "finder" ? null : (
          <>
            <button type="button" className="button button-outline" onClick={recenter}>
              <RefreshCw size={14} />
              {t("mapPage.reset")}
            </button>

            <span>{isLoading ? t("mapPage.loading") : t("mapPage.count", { count })}</span>
          </>
        )}
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
      ) : view === "list" ? (
        <div className="property-grid two-column">
          {(located ?? []).map((entry) => (
            <PropertyCard key={entry.item.id} property={entry.item} locale={locale} />
          ))}
        </div>
      ) : (
        <FinderPanel />
      )}
    </>
  );
}

/**
 * PACI's client, embedded — with the way out sitting above the frame rather
 * than inside it.
 *
 * A government host is free to refuse framing, and `gis.paci.gov.kw` answers
 * nothing at all from outside Kuwait, so this frame coming up blank is a
 * normal outcome and not an error worth hiding. The button and the two app
 * links are plain links: they work whatever the frame does, and they are on
 * screen before the visitor has to go looking for them.
 */
function FinderPanel() {
  const t = useTranslations("finder");

  return (
    <div className="finder-panel">
      <div className="finder-panel-actions">
        <a
          className="button kuwait-finder-button"
          href={KUWAIT_FINDER_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} />
          {t("openInFinder")}
        </a>
        <a
          className="button button-outline"
          href={KUWAIT_FINDER_IOS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Smartphone size={14} />
          {t("iosApp")}
        </a>
        <a
          className="button button-outline"
          href={KUWAIT_FINDER_ANDROID_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Smartphone size={14} />
          {t("androidApp")}
        </a>
      </div>

      <iframe
        className="finder-frame"
        src={KUWAIT_FINDER_URL}
        title={t("finderTab")}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      <p className="finder-note">{t("embedNote")}</p>
    </div>
  );
}
