'use client'

// Numbered-pin Leaflet map for the Route Order page. Each stop renders
// as a red circular badge with the delivery-order number inside. Matches
// the publisher's screenshot of the Route Order map. Auto-fits to the
// bounding box of the points; re-fits whenever the points change.

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface NumberedPoint {
  id:    string
  label: string   // "1", "2", "P", etc.
  name:  string
  lat:   number
  lng:   number
}

function numberedIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px; height: 28px; border-radius: 50%;
        background: #DC2626; color: white;
        display: flex; align-items: center; justify-content: center;
        font-family: ui-monospace, 'DM Mono', monospace;
        font-weight: 700; font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,.35);
      ">${label}</div>
    `,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  })
}

function FitToPoints({ points }: { points: NumberedPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const latlngs = points.map(p => L.latLng(p.lat, p.lng))
    const bounds  = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, points])
  return null
}

export default function NumberedRouteMap({ points }: { points: NumberedPoint[] }) {
  // Initial center — average of points so the map doesn't flicker before
  // FitToPoints runs.
  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return [32.3617, -86.2792] // Montgomery, AL fallback
    let lat = 0, lng = 0
    for (const p of points) { lat += p.lat; lng += p.lng }
    return [lat / points.length, lng / points.length]
  }, [points])

  return (
    <div style={{ height: 500 }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={numberedIcon(p.label)} title={p.name} />
        ))}
        <FitToPoints points={points} />
      </MapContainer>
    </div>
  )
}
