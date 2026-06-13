'use client'

// Shared Google Maps for the public pickup-location map AND the admin
// "see all stops" map. Renders route-colored circle markers, a popup
// info card with featured-advertiser social links on click, plus a
// search box + per-route filter chip strip.
//
// Why a single component for both surfaces: 95% of the rendering is the
// same — route-colored markers, advertiser badges, search by name. The
// admin adds checked-state coloring (delivered vs not) which we expose
// via the `colorFor` prop. Public renders without it.
//
// Provider switched from Leaflet → Google Maps. Needs
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env. Degrades to a clear helper
// message when the key is missing rather than rendering blank.

import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'

export interface CirculationStop {
  id:            string
  route_id:      string
  name:          string
  address?:      string | null
  city?:         string | null
  zip?:          string | null
  lat:           number | null
  lng:           number | null
  is_advertiser?: boolean
  is_featured?:  boolean
  ad_level?:     string
  website?:      string | null
  instagram?:    string | null
  facebook?:     string | null
  tiktok?:       string | null
  logo_path?:    string | null
  quantities?:   Record<string, number> | null
}

export interface CirculationRoute {
  id:    string
  name:  string
}

type MarkerColorFn = (stop: CirculationStop) => string

interface Props {
  stops:       CirculationStop[]
  routes:      CirculationRoute[]
  /** Optional override for marker color (e.g. checked-state on driver view). */
  colorFor?:   MarkerColorFn
  /** Show the search box. Default true. */
  showSearch?: boolean
  /** Show route filter chips. Default true. */
  showFilter?: boolean
  /** Map height in CSS (e.g. '500px' or 'calc(100vh - 200px)'). */
  height?:     string
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const GOOGLE_MAPS_ID  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'

// Route colors — palette cycles through routes so each gets a distinct hue.
const PALETTE = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea',
  '#0891b2', '#dc2626', '#ca8a04', '#db2777',
]
function routeColor(routeId: string, routes: CirculationRoute[]): string {
  const idx = routes.findIndex(r => r.id === routeId)
  if (idx < 0) return '#6b7280'
  return PALETTE[idx % PALETTE.length]
}

function ColoredDot({ color, size }: { color: string; size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, border: '2px solid white',
      boxShadow: '0 1px 4px rgba(0,0,0,.3)',
      transform: 'translateY(-50%)',
    }} />
  )
}

function FitBounds({ stops }: { stops: CirculationStop[] }) {
  const map = useMap()
  const lastSig = useRef('')
  useEffect(() => {
    if (!map) return
    const valid = stops.filter(s => s.lat != null && s.lng != null)
    if (valid.length === 0) return
    const sig = valid.map(s => `${s.id}:${s.lat!.toFixed(3)}:${s.lng!.toFixed(3)}`).join('|')
    if (sig === lastSig.current) return
    lastSig.current = sig
    const bounds = new google.maps.LatLngBounds()
    for (const s of valid) bounds.extend({ lat: s.lat!, lng: s.lng! })
    map.fitBounds(bounds, 50)
  }, [stops, map])
  return null
}

export function CirculationMap({
  stops,
  routes,
  colorFor,
  showSearch = true,
  showFilter = true,
  height     = '600px',
}: Props) {
  const [query,         setQuery]         = useState('')
  const [enabledRoutes, setEnabledRoutes] = useState<Set<string> | null>(null)
  const [openId,        setOpenId]        = useState<string | null>(null)

  const visible = useMemo(() => {
    return stops.filter(s => {
      if (s.lat == null || s.lng == null) return false
      if (enabledRoutes && !enabledRoutes.has(s.route_id)) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!s.name.toLowerCase().includes(q) && !(s.address ?? '').toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [stops, query, enabledRoutes])

  const initialCenter = useMemo(() => {
    const valid = stops.filter(s => s.lat != null && s.lng != null)
    if (valid.length === 0) return { lat: 32.3668, lng: -86.3000 } // Montgomery fallback
    const lat = valid.reduce((a, s) => a + s.lat!, 0) / valid.length
    const lng = valid.reduce((a, s) => a + s.lng!, 0) / valid.length
    return { lat, lng }
  }, [stops])

  function toggleRoute(id: string) {
    setEnabledRoutes(prev => {
      const cur = prev ? new Set(prev) : new Set(routes.map(r => r.id))
      if (cur.has(id)) cur.delete(id); else cur.add(id)
      return cur.size === routes.length ? null : cur
    })
  }

  return (
    <div className="space-y-3">
      {(showSearch || showFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          {showSearch && (
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by stop name or address…"
              className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}
          {showFilter && routes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {routes.map(r => {
                const on = enabledRoutes ? enabledRoutes.has(r.id) : true
                const c  = routeColor(r.id, routes)
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRoute(r.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${on ? 'text-white' : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'}`}
                    style={on ? { backgroundColor: c, borderColor: c } : {}}
                  >
                    {r.name}
                  </button>
                )
              })}
            </div>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {visible.length} of {stops.filter(s => s.lat != null && s.lng != null).length} shown
          </span>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ height }}>
        {!GOOGLE_MAPS_KEY ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', background: '#FEF3C7', color: '#92400E',
            fontSize: 13, padding: 20, textAlign: 'center',
          }}>
            Set <code style={{ fontFamily: 'ui-monospace, monospace' }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your deployment env to render the stop map.
          </div>
        ) : (
          <APIProvider apiKey={GOOGLE_MAPS_KEY}>
            <Map
              mapId={GOOGLE_MAPS_ID}
              defaultCenter={initialCenter}
              defaultZoom={12}
              gestureHandling="cooperative"
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <FitBounds stops={visible} />
              {visible.map(s => {
                const color = colorFor?.(s) ?? routeColor(s.route_id, routes)
                const isPlatinum = s.ad_level === 'platinum'
                const isGold     = s.ad_level === 'gold'
                const size = isPlatinum ? 24 : isGold ? 18 : 14
                const open = openId === s.id
                return (
                  <AdvancedMarker
                    key={s.id}
                    position={{ lat: s.lat!, lng: s.lng! }}
                    title={s.name}
                    onClick={() => setOpenId(open ? null : s.id)}
                  >
                    <ColoredDot color={color} size={size} />
                    {open && (
                      <InfoWindow position={{ lat: s.lat!, lng: s.lng! }} onCloseClick={() => setOpenId(null)}>
                        <StopPopup stop={s} routes={routes} />
                      </InfoWindow>
                    )}
                  </AdvancedMarker>
                )
              })}
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  )
}

function StopPopup({ stop, routes }: { stop: CirculationStop; routes: CirculationRoute[] }) {
  const route = routes.find(r => r.id === stop.route_id)
  return (
    <div className="text-[13px]" style={{ minWidth: 200 }}>
      <p className="font-bold text-gray-900 m-0">{stop.name}</p>
      {route && <p className="text-[11px] text-gray-500 m-0 mt-0.5">{route.name}</p>}
      {stop.address && (
        <p className="text-xs text-gray-600 mt-1 m-0">
          {stop.address}{stop.city ? `, ${stop.city}` : ''}{stop.zip ? ` ${stop.zip}` : ''}
        </p>
      )}
      {stop.ad_level === 'platinum' && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mt-1 m-0">⭐ Platinum Partner</p>
      )}
      {stop.ad_level === 'gold' && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 mt-1 m-0">Gold Partner</p>
      )}
      {(stop.website || stop.instagram || stop.facebook || stop.tiktok) && (
        <div className="flex gap-2 mt-1.5">
          {stop.website   && <a href={stop.website}   target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline">Website</a>}
          {stop.instagram && <a href={stop.instagram} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline">Instagram</a>}
          {stop.facebook  && <a href={stop.facebook}  target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline">Facebook</a>}
          {stop.tiktok    && <a href={stop.tiktok}    target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline">TikTok</a>}
        </div>
      )}
    </div>
  )
}
