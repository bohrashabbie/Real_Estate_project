"use client"

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"
const KUWAIT_CENTER: [number, number] = [47.96, 29.28]

/**
 * Click-to-pin coordinate picker for the property form. Clicking the map (or
 * dragging the pin) writes latitude/longitude back through `onChange`; typing
 * in the coordinate inputs moves the pin. Read-only when `disabled`.
 */
export function LocationPicker({
  latitude,
  longitude,
  disabled,
  onChange,
}: {
  latitude: string
  longitude: string
  disabled?: boolean
  onChange: (latitude: string, longitude: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const placeMarker = useRef<((lng: number, lat: number) => void) | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

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

  return (
    <div
      ref={container}
      className="h-72 w-full overflow-hidden rounded-lg border border-border"
      dir="ltr"
    />
  )
}
