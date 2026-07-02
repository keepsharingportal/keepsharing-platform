'use client'

// Verbatim port of v3 driver/map.php — one route, three marker styles
// with a legend. Google Maps replaces v3's Leaflet.
//
// Marker vocabulary (matches v3):
//   Pickup   → navy circle #1A5FA8, no number
//   Delivery → navy circle #0F2640 with sequential stop-number in white
//   Not-delivering → yellow #FCD34D with amber border
//
// Popup shows name, address, notes (📌), and "Not delivering this month"
// tag for paused stops.

import { useEffect, useMemo, useState } from 'react'

export interface DriverMapStop {
  id:             string
  route_id:       string
  name:           string
  address:        string | null
  city:           string | null
  zip?:           string | null
  lat:            number | null
  lng:            number | null
  is_pickup:      boolean
  not_delivering: boolean
  notes?:         string | null
  sort_order:     number
}

interface Props {
  stops:     DriverMapStop[]
  routeName: string
  market:    string
}

export function DriverMapClient({ stops, routeName, market }: Props) {
  const [Pkg, setPkg] = useState<null | typeof import('@vis.gl/react-google-maps')>(null)
  useEffect(() => { import('@vis.gl/react-google-maps').then(m => setPkg(m)) }, [])

  const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const GOOGLE_MAPS_ID  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'

  // Sort pickups first, then by sort_order — same as v3. Assign a running
  // stop number to non-pickup, non-paused stops only.
  const enriched = useMemo(() => {
    const sorted = [...stops].sort((a, b) => {
      const ap = a.is_pickup ? 1 : 0
      const bp = b.is_pickup ? 1 : 0
      if (ap !== bp) return bp - ap
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name)
    })
    let n = 0
    return sorted.map(s => {
      const withCoords = s.lat != null && s.lng != null
      if (!withCoords) return { stop: s, num: null as number | null }
      if (s.is_pickup || s.not_delivering) return { stop: s, num: null as number | null }
      n++
      return { stop: s, num: n }
    })
  }, [stops])

  const withCoords = enriched.filter(e => e.stop.lat != null && e.stop.lng != null)

  const center = useMemo(() => {
    if (withCoords.length === 0) return { lat: 32.3792, lng: -86.3077 }  // Montgomery fallback
    let latSum = 0, lngSum = 0
    for (const e of withCoords) { latSum += e.stop.lat!; lngSum += e.stop.lng! }
    return { lat: latSum / withCoords.length, lng: lngSum / withCoords.length }
  }, [withCoords])

  if (!GOOGLE_MAPS_KEY) {
    return (
      <FullScreen>
        <TopBar routeName={routeName} market={market} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF3C7', color: '#92400E', fontSize: 13, textAlign: 'center', padding: 20 }}>
          Google Maps key not configured — ask your distribution manager to set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </div>
      </FullScreen>
    )
  }

  if (!Pkg) {
    return (
      <FullScreen>
        <TopBar routeName={routeName} market={market} />
        <div style={{ flex: 1, background: '#F1F5F9' }} />
      </FullScreen>
    )
  }

  const { APIProvider, Map, AdvancedMarker, InfoWindow } = Pkg

  return (
    <FullScreen>
      <TopBar routeName={routeName} market={market} />
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <MapWithMarkers
            enriched={enriched}
            withCoords={withCoords}
            center={center}
            mapId={GOOGLE_MAPS_ID}
            APIProviderComponents={{ Map, AdvancedMarker, InfoWindow }}
          />
        </APIProvider>

        {/* Legend — bottom-left, above the map */}
        <div style={{ position: 'absolute', bottom: 20, left: 12, zIndex: 500, background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 12, fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif' }}>
          <LegendItem color="#1A5FA8" label="Pickup location" />
          <LegendItem color="#0F2640" label="Delivery stop" />
          <LegendItem color="#FCD34D" border="#D97706" label="Not delivering" />
        </div>
      </div>
    </FullScreen>
  )
}

type MapComponents = {
  Map:            typeof import('@vis.gl/react-google-maps').Map
  AdvancedMarker: typeof import('@vis.gl/react-google-maps').AdvancedMarker
  InfoWindow:     typeof import('@vis.gl/react-google-maps').InfoWindow
}

function MapWithMarkers({
  enriched, withCoords, center, mapId, APIProviderComponents,
}: {
  enriched: Array<{ stop: DriverMapStop; num: number | null }>
  withCoords: Array<{ stop: DriverMapStop; num: number | null }>
  center: { lat: number; lng: number }
  mapId: string
  APIProviderComponents: MapComponents
}) {
  const { Map, AdvancedMarker, InfoWindow } = APIProviderComponents
  const [openId, setOpenId] = useState<string | null>(null)

  // Compute a rough zoom based on the bounding box — if we've only got
  // 1-2 stops, keep zoomed in; a lot of stops → zoom out. Google Maps
  // can't fit-bounds declaratively so we set a reasonable defaultZoom.
  const zoom = useMemo(() => {
    if (withCoords.length < 2) return 13
    const lats = withCoords.map(e => e.stop.lat!)
    const lngs = withCoords.map(e => e.stop.lng!)
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs))
    if (span > 0.5) return 9
    if (span > 0.25) return 10
    if (span > 0.1) return 11
    if (span > 0.05) return 12
    return 13
  }, [withCoords])

  return (
    <Map
      mapId={mapId}
      defaultCenter={center}
      defaultZoom={zoom}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {enriched.map(({ stop: s, num }) => {
        if (s.lat == null || s.lng == null) return null
        return (
          <AdvancedMarker
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            onClick={() => setOpenId(s.id)}
          >
            {s.is_pickup ? (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1A5FA8', border: '2.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.35)' }} />
            ) : s.not_delivering ? (
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#FCD34D', border: '1.5px solid #D97706' }} />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0F2640', border: '2.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif', fontSize: 9, fontWeight: 700 }}>
                {num}
              </div>
            )}
          </AdvancedMarker>
        )
      })}

      {openId && (() => {
        const found = enriched.find(e => e.stop.id === openId)
        if (!found || found.stop.lat == null || found.stop.lng == null) return null
        const s = found.stop
        const lat = s.lat as number
        const lng = s.lng as number
        return (
          <InfoWindow
            position={{ lat, lng }}
            onCloseClick={() => setOpenId(null)}
          >
            <div style={{ fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif', minWidth: 160, maxWidth: 240 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                {s.is_pickup && '📦 '}{s.not_delivering && '⏸ '}{s.name}
              </div>
              {s.address && (
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {s.address}{s.city ? `, ${s.city}` : ''}
                </div>
              )}
              {s.notes && (
                <div style={{ fontSize: 11, color: '#1A5FA8', marginTop: 4 }}>
                  📌 {s.notes}
                </div>
              )}
              {s.not_delivering && (
                <div style={{ fontSize: 11, color: '#92400E', marginTop: 4, fontStyle: 'italic' }}>
                  Not delivering this month
                </div>
              )}
              {s.address && !s.is_pickup && !s.not_delivering && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.address, s.city, s.zip].filter(Boolean).join(', '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#1A5FA8', color: 'white', textDecoration: 'none' }}
                >
                  📍 View on Map
                </a>
              )}
            </div>
          </InfoWindow>
        )
      })()}
    </Map>
  )
}

// ── Chrome ─────────────────────────────────────────────────────────────
function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif' }}>
      {children}
    </div>
  )
}

function TopBar({ routeName, market }: { routeName: string; market: string }) {
  return (
    <div style={{ background: '#0F2640', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <a
        href={`/distribution/${market}/driver/dashboard`}
        style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 20, flexShrink: 0 }}
        title="Back to my routes"
      >
        ←
      </a>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {routeName}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Tap a pin to see stop details</div>
      </div>
    </div>
  )
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: border ? `1px solid ${border}` : 'none', flexShrink: 0 }} />
      {label}
    </div>
  )
}
