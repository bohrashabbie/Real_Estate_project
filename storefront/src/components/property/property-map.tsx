"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** Single-marker map card on the property detail page. maplibre is imported
 *  inside the effect so it never touches the server bundle. */
export function PropertyMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

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
      instance.scrollZoom.disable();
      new maplibregl.Marker({ color: "#0F3D33" }).setLngLat([longitude, latitude]).addTo(instance);
      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude]);

  return <div ref={container} className="h-80 w-full rounded-2xl sm:h-96" />;
}
