'use client'

// Numbered-pin Google Maps for the Route Order page. Each stop renders
// as a red circular badge with the delivery-order number inside (Advanced
// Marker with a custom DOM element). Auto-fits to the bounding box of
// the points; re-fits whenever the points change.
//
// Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env. Degrades to a clear
// helper message when the key is missing rather than rendering a blank
// box (per the surface-decisions feedback rule).

import { useEffect, useMemo, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

export interface NumberedPoint {
  id:    string
  label: string   // "1", "2", "P", etc.
  name:  string
  lat:   number
  lng:   number
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
// A dedicated Map ID lets you customize the look in Google Cloud Console.
// Optional — defaults to Google's "DEMO_MAP_ID" which is fine for AdvancedMarker
// rendering without any extra setup. Override via env if you want custom
// styling per market.
const GOOGLE_MAPS_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'

function NumberPin({ label }: { label: string }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#DC2626', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "ui-monospace, 'DM Mono', monospace",
      fontWeight: 700, fontSize: 12,
      border: '2px solid white',
      boxShadow: '0 1px 4px rgba(0,0,0,.35)',
      transform: 'translateY(-50%)',
    }}>{label}</div>
  )
}

function FitToPoints({ points }: { points: NumberedPoint[] }) {
  const map = useMap()
  const lastSig = useRef<string>('')
  useEffect(() => {
    if (!map || points.length === 0) return
    const sig = points.map(p => `${p.id}:${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`).join('|')
    if (sig === lastSig.current) return
    lastSig.current = sig
    const bounds = new google.maps.LatLngBounds()
    for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng })
    map.fitBounds(bounds, 60)
  }, [map, points])
  return null
}

export default function NumberedRouteMap({ points }: { points: NumberedPoint[] }) {
  // Initial center — average of points so the map doesn't flicker before
  // FitToPoints runs.
  const center = useMemo(() => {
    if (points.length === 0) return { lat: 32.3617, lng: -86.2792 } // Montgomery, AL fallback
    let lat = 0, lng = 0
    for (const p of points) { lat += p.lat; lng += p.lng }
    return { lat: lat / points.length, lng: lng / points.length }
  }, [points])

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div style={{
        height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FEF3C7', color: '#92400E',
        fontSize: 13, padding: 20, textAlign: 'center',
      }}>
        Set <code style={{ fontFamily: 'ui-monospace, monospace' }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your deployment env to render the route map.
      </div>
    )
  }

  return (
    <div style={{ height: 500 }}>
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <Map
          mapId={GOOGLE_MAPS_ID}
          defaultCenter={center}
          defaultZoom={12}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          {points.map(p => (
            <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.name}>
              <NumberPin label={p.label} />
            </AdvancedMarker>
          ))}
          <FitToPoints points={points} />
        </Map>
      </APIProvider>
    </div>
  )
}
