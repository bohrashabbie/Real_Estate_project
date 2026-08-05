"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Locale } from "@/i18n/routing";
import { apiGet, mediaUrl, type Paginated, type PropertyListItem } from "@/lib/api";
import { formatPrice } from "@/lib/format";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const KUWAIT_CENTER: [number, number] = [47.96, 29.28];
const MAX_PROPERTIES = 200;

/** Pages through /properties until exhausted (or the cap) and keeps only the
 *  listings the office actually pinned on the map. */
async function fetchMappableProperties(locale: Locale): Promise<PropertyListItem[]> {
  const collected: PropertyListItem[] = [];
  let cursor: string | null = null;
  do {
    const page: Paginated<PropertyListItem> = await apiGet("/properties", {
      locale,
      ...(cursor ? { cursor } : {}),
    });
    collected.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor && collected.length < MAX_PROPERTIES);
  return collected;
}

export function MapExplorer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["map-properties", locale],
    queryFn: () => fetchMappableProperties(locale),
  });

  // The list endpoint doesn't include coordinates, so each pinned candidate is
  // resolved through the detail endpoint — capped and parallelised.
  const { data: located } = useQuery({
    queryKey: ["map-located", locale, properties?.length ?? 0],
    enabled: Boolean(properties?.length),
    queryFn: async () => {
      const details = await Promise.all(
        (properties ?? []).map(async (item) => {
          try {
            const detail = await apiGet<{
              latitude: string | number | null;
              longitude: string | number | null;
            }>(`/properties/${encodeURIComponent(item.slug)}`, { locale });
            const lat = detail.latitude === null ? NaN : Number(detail.latitude);
            const lng = detail.longitude === null ? NaN : Number(detail.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return { item, lat, lng };
          } catch {
            return null;
          }
        }),
      );
      return details.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    },
  });

  // Map init.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container.current || map.current) return;
      const instance = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE,
        center: KUWAIT_CENTER,
        zoom: 10,
        attributionControl: { compact: true },
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }));
      map.current = instance;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Markers whenever located data lands.
  useEffect(() => {
    if (!located?.length) return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !map.current) return;

      for (const { item, lat, lng } of located) {
        const image = mediaUrl(item.main_image);
        const popupEl = document.createElement("div");
        popupEl.className = "w-56";
        popupEl.innerHTML = `
          ${image ? `<img src="${image}" alt="" class="h-28 w-full object-cover" />` : ""}
          <div class="p-3">
            <p class="text-sm font-bold text-navy leading-snug">${escapeHtml(item.title)}</p>
            <p class="mt-1 text-sm font-bold text-gold">${escapeHtml(
              formatPrice(item.price, item.purpose, locale),
            )}</p>
            <a href="/${locale}/properties/${encodeURIComponent(item.slug)}"
               class="mt-2 inline-block text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4">
              ${escapeHtml(t("card.viewDetails"))}
            </a>
          </div>`;

        new maplibregl.Marker({ color: "#C0764A" })
          .setLngLat([lng, lat])
          .setPopup(new maplibregl.Popup({ offset: 20, maxWidth: "260px" }).setDOMContent(popupEl))
          .addTo(map.current);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [located, locale, t]);

  return (
    <div className="relative">
      <div ref={container} className="h-[calc(100dvh-8rem)] min-h-[28rem] w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <p className="pointer-events-auto rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-navy shadow-float ring-1 ring-cream-200">
          {isLoading
            ? t("mapPage.loading")
            : t("mapPage.count", { count: located?.length ?? 0 })}
        </p>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
