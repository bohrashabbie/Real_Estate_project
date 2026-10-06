"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import type { BlockShape } from "@/lib/api/types"

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"
const KUWAIT_CENTER: [number, number] = [47.96, 29.28]
// Esri's free World Imagery -- the "Satellite" view. Drawn under the street
// style's labels, so names and roads stay readable over the photo, the way
// Google's hybrid view does it.
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

export type AreaShape = { lat: number; lng: number; radius_m: number }

/** A circle as a polygon, close enough at area scale (a few km). */
function circle({ lat, lng, radius_m }: AreaShape, steps = 72): [number, number][] {
  const dLat = radius_m / 111_320
  const dLng = radius_m / (111_320 * Math.cos((lat * Math.PI) / 180))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const theta = (i / steps) * 2 * Math.PI
    return [lng + dLng * Math.sin(theta), lat + dLat * Math.cos(theta)]
  })
}

function bounds({ lat, lng, radius_m }: AreaShape): [[number, number], [number, number]] {
  const dLat = radius_m / 111_320
  const dLng = radius_m / (111_320 * Math.cos((lat * Math.PI) / 180))
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat + dLat],
  ]
}

/**
 * Click-to-pin coordinate picker for the property form. Clicking the map (or
 * dragging the pin) writes latitude/longitude back through `onChange`; typing
 * in the coordinate inputs moves the pin. Read-only when `disabled`.
 *
 * On request it also shows the property's area -- shaded, as a gold circle --
 * and flies to fit it when the office picks an area, and it has a
 * Street / Satellite switch.
 */
export function LocationPicker({
  latitude,
  longitude,
  disabled,
  focusKey = 0,
  area = null,
  areaFitKey = 0,
  block = null,
  blockFitKey = 0,
  onChange,
}: {
  latitude: string
  longitude: string
  disabled?: boolean
  /** Bumped by the form when it places the pin from the address, so the map
   *  zooms to it. Dragging or typing coordinates moves the pin, not the view. */
  focusKey?: number
  /** The selected area, shaded on the map. Null hides the shading. */
  area?: AreaShape | null
  /** Bumped when the office picks an area, so the map flies to fit it.
   *  Opening a saved property draws the area without moving the view. */
  areaFitKey?: number
  /** The typed block's real outline, shaded more strongly inside the area. */
  block?: BlockShape | null
  /** Bumped when a block outline arrives from a lookup, so the map fits it. */
  blockFitKey?: number
  onChange: (latitude: string, longitude: string) => void
}) {
  const t = useTranslations("properties.map")
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const placeMarker = useRef<((lng: number, lat: number) => void) | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [loaded, setLoaded] = useState(false)
  const [satellite, setSatellite] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const maplibregl = (await import("maplibre-gl")).default
      if (cancelled || !container.current || map.current) return

      const lat = Number(latitude)
      const lng = Number(longitude)
      const hasPoint =
        latitude !== "" && longitude !== "" && Number.isFinite(lat) && Number.isFinite(lng)

      const instance = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE,
        center: hasPoint ? [lng, lat] : KUWAIT_CENTER,
        zoom: hasPoint ? 14 : 9.5,
        attributionControl: { compact: true },
      })
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }))

      instance.on("load", () => {
        // Satellite under the first label layer, hidden until switched on.
        const firstLabel = instance.getStyle().layers?.find((layer) => layer.type === "symbol")?.id
        instance.addSource("satellite", {
          type: "raster",
          tiles: [SATELLITE_TILES],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Imagery © Esri",
        })
        instance.addLayer(
          { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } },
          firstLabel
        )
        // The area: a gold wash with a firmer gold edge.
        instance.addSource("area", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        instance.addLayer({
          id: "area-fill",
          type: "fill",
          source: "area",
          paint: { "fill-color": "#c8a45d", "fill-opacity": 0.18 },
        })
        instance.addLayer({
          id: "area-line",
          type: "line",
          source: "area",
          paint: { "line-color": "#a7803d", "line-width": 2.5, "line-dasharray": [2, 1.5] },
        })
        // The block: its real boundary, stronger than the area around it.
        instance.addSource("block", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        instance.addLayer({
          id: "block-fill",
          type: "fill",
          source: "block",
          paint: { "fill-color": "#a7803d", "fill-opacity": 0.32 },
        })
        instance.addLayer({
          id: "block-line",
          type: "line",
          source: "block",
          paint: { "line-color": "#7a5a22", "line-width": 3 },
        })
        setLoaded(true)
      })

      placeMarker.current = (lng2: number, lat2: number) => {
        if (marker.current) {
          marker.current.setLngLat([lng2, lat2])
          return
        }
        marker.current = new maplibregl.Marker({ color: "#C0764A", draggable: !disabled })
          .setLngLat([lng2, lat2])
          .addTo(instance)
        marker.current.on("dragend", () => {
          const pos = marker.current!.getLngLat()
          onChangeRef.current(pos.lat.toFixed(6), pos.lng.toFixed(6))
        })
      }
      if (hasPoint) placeMarker.current(lng, lat)

      if (!disabled) {
        instance.on("click", (event) => {
          placeMarker.current?.(event.lngLat.lng, event.lngLat.lat)
          onChangeRef.current(event.lngLat.lat.toFixed(6), event.lngLat.lng.toFixed(6))
        })
      }
      map.current = instance
    })()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      marker.current = null
      placeMarker.current = null
      setLoaded(false)
    }
    // Initial coordinates only seed the map; live edits sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  // Manual edits in the coordinate inputs move the pin.
  useEffect(() => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (latitude === "" || longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    placeMarker.current?.(lng, lat)
  }, [latitude, longitude])

  useEffect(() => {
    if (!focusKey) return
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.current?.flyTo({ center: [lng, lat], zoom: 15 })
    // Only a new geocode should move the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // The area's shading follows the selected area.
  useEffect(() => {
    if (!loaded) return
    const source = map.current?.getSource("area") as GeoJSONSource | undefined
    source?.setData({
      type: "FeatureCollection",
      features: area
        ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circle(area)] } }]
        : [],
    })
  }, [loaded, area])

  // Picking an area flies the map to fit it.
  useEffect(() => {
    if (!loaded || !areaFitKey || !area) return
    map.current?.fitBounds(bounds(area), { padding: 40, duration: 900 })
    // Only a new pick should move the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, areaFitKey])

  // The block's outline follows the lookup.
  useEffect(() => {
    if (!loaded) return
    const source = map.current?.getSource("block") as GeoJSONSource | undefined
    source?.setData({
      type: "FeatureCollection",
      features: block ? [{ type: "Feature", properties: {}, geometry: block }] : [],
    })
  }, [loaded, block])

  // A newly found block: fit the map to it.
  useEffect(() => {
    if (!loaded || !blockFitKey || !block) return
    const points = (block.type === "Polygon" ? [block.coordinates] : block.coordinates).flat(2)
    if (points.length === 0) return
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    for (const [x, y] of points) {
      west = Math.min(west, x)
      east = Math.max(east, x)
      south = Math.min(south, y)
      north = Math.max(north, y)
    }
    map.current?.fitBounds([[west, south], [east, north]], { padding: 60, duration: 900, maxZoom: 17 })
    // Only a new lookup should move the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, blockFitKey])

  useEffect(() => {
    if (!loaded) return
    map.current?.setLayoutProperty("satellite", "visibility", satellite ? "visible" : "none")
  }, [loaded, satellite])

  return (
    <div className="relative" dir="ltr">
      <div
        ref={container}
        className="h-[500px] w-full overflow-hidden rounded-lg border border-border"
      />
      <div className="absolute start-2 top-2 z-10 flex overflow-hidden rounded-md border border-border bg-background text-xs font-medium shadow-sm">
        {([false, true] as const).map((value) => (
          <button
            key={String(value)}
            type="button"
            className={
              satellite === value
                ? "bg-foreground px-3 py-1.5 text-background"
                : "px-3 py-1.5 text-foreground hover:bg-muted"
            }
            onClick={() => setSatellite(value)}
          >
            {value ? t("satellite") : t("street")}
          </button>
        ))}
      </div>
    </div>
  )
}
