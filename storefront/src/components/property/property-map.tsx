"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * The single-pin map on the detail page.
 *
 * maplibre is imported inside the effect so none of it reaches the server
 * bundle or the initial download; until it lands, the `.map-loading` panel the
 * reference shows holds the space, so the page does not reflow when tiles
 * arrive.
 */
export function PropertyMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const t = useTranslations("detail");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container.current || map.current) return;

      const instance = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE,
        center: [longitude, latitude],
        zoom: 14,
        attributionControl: { compact: true },
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }));
      // A page-scroll that zooms the map instead is the classic embedded-map
      // annoyance; drag still pans.
      instance.scrollZoom.disable();
      new maplibregl.Marker({ color: "#0d1b2a" }).setLngLat([longitude, latitude]).addTo(instance);
      instance.on("load", () => setReady(true));
      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div className="property-location-map" aria-label={t("mapAria", { title: label })}>
      {!ready ? <div className="map-loading">{t("mapLoading")}</div> : null}
      <div ref={container} className="map-surface" />
    </div>
  );
}
