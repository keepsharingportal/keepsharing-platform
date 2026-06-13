'use client'

// Public reader map. Replaces the old route-filter view (CirculationMap)
// with a reader-friendly layout:
//   - Left sidebar: search bar + tabs (All / ★ Featured / Resources)
//     + alphabetical jump list + scrolling stop list with featured items
//     pinned at the top.
//   - Right: Google Map with markers tiered by ad_level (Top → logo pin,
//     Middle → brand-color star, Bottom → ringed dot, Standard → plain dot).
//   - Click a stop in the list → map pans to it + InfoWindow opens.
//   - Click a marker → InfoWindow opens + list scrolls to that row.
//   - Search: types into search → live filter list + markers. If input
//     is a 5-digit ZIP, geocode it via Google → recenter to that area.
//
// Per design memory: routes filter is INTENTIONALLY removed from the
// reader view. Readers don't need to know which delivery route serves a
// stop — they just want to find a copy nearby.

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { MapPin, ExternalLink, Mail, Search } from 'lucide-react'

export interface ReaderStop {
  id:            string
  name:          string
  address:       string | null
  city:          string | null
  zip:           string | null
  lat:           number | null
  lng:           number | null
  /** is_advertiser is the editor's "this is a paying partner" flag.
   *  Always drives at least the bottom tier (small star/ring) so every
   *  advertiser is visually distinct from a community listing. ad_level
   *  upgrades the treatment further when they have a current active ad. */
  is_advertiser: boolean
  ad_level:      'top' | 'middle' | 'bottom' | 'platinum' | 'gold' | null
  website:       string | null
  instagram:     string | null
  facebook:      string | null
  tiktok:        string | null
  logo_path:     string | null
  /** One-line description / tagline pulled from the business profile.
   *  Only rendered in the InfoWindow when present — most distribution
   *  stops don't have one. */
  description?:  string | null
}
export interface ReaderResource {
  id:           string
  name:         string
  category:     string | null
  description:  string | null
  address:      string | null
  city:         string | null
  phone:        string | null
  email:        string | null
  website:      string | null
  logo_path:    string | null
  photo_path:   string | null
}

interface Props {
  brand:        string
  market:       string
  stops:        ReaderStop[]
  resources:    ReaderResource[]
  /** Brand primary color (hex). Drives CTA buttons + map markers. */
  brandColor?:  string
  /** Brand accent color (hex). Used for the "Featured Partner" highlight. */
  accentColor?: string
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const GOOGLE_MAPS_ID  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'

// Normalize ad_level so legacy values (gold/platinum) map to the new
// four-tier system. is_advertiser=true ALWAYS gives at least 'bottom'
// so checking the "Advertiser" box in the stop editor is enough to
// differentiate that location on the map. ad_level upgrades further
// when their current ad spend justifies it (set by the monthly
// recompute job).
function tierOf(stop: ReaderStop): 'top' | 'middle' | 'bottom' | null {
  const v = stop.ad_level
  if (v === 'top' || v === 'platinum') return 'top'
  if (v === 'middle' || v === 'gold')  return 'middle'
  if (v === 'bottom')                  return 'bottom'
  if (stop.is_advertiser)              return 'bottom'
  return null
}
function tierRank(t: 'top' | 'middle' | 'bottom' | null): number {
  if (t === 'top')    return 3
  if (t === 'middle') return 2
  if (t === 'bottom') return 1
  return 0
}

// ── Marker pin ────────────────────────────────────────────────────────────
// Sizes are tuned to be easily visible against Google's default POI icons
// (~26px). Standard tier is intentionally large enough to read at any
// zoom level — Google street labels and business icons grow with zoom,
// so small markers visually shrink in comparison.
function TierPin({ stop, brandColor }: { stop: ReaderStop; brandColor: string }) {
  const tier = tierOf(stop)
  if (tier === 'top') {
    // Top tier: logo pin (if a logo URL is set) OR a big brand-colored star pin.
    if (stop.logo_path) {
      return (
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'white',
          border: `3px solid ${brandColor}`,
          boxShadow: '0 3px 10px rgba(0,0,0,.3)',
          overflow: 'hidden',
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stop.logo_path} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>
      )
    }
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: brandColor, color: 'white',
        border: '3px solid white',
        boxShadow: '0 3px 10px rgba(0,0,0,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800,
        transform: 'translateY(-50%)',
      }}>★</div>
    )
  }
  if (tier === 'middle') {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: brandColor, color: 'white',
        border: '2.5px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800,
        transform: 'translateY(-50%)',
      }}>★</div>
    )
  }
  if (tier === 'bottom') {
    return (
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'white',
        border: `4px solid ${brandColor}`,
        boxShadow: '0 2px 5px rgba(0,0,0,.3)',
        transform: 'translateY(-50%)',
      }} />
    )
  }
  // Standard: solid navy dot, big enough to compete with Google's POI markers
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      background: '#1A5FA8',
      border: '2.5px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,.3)',
      transform: 'translateY(-50%)',
    }} />
  )
}

// ── Fit map to visible markers when filter changes ──────────────────────
function FitTo({ stops, focusId }: { stops: ReaderStop[]; focusId: string | null }) {
  const map = useMap()
  const lastSig = useRef('')
  const lastFocus = useRef<string | null>(null)
  useEffect(() => {
    if (!map) return
    // Single-stop focus: pan + zoom
    if (focusId && focusId !== lastFocus.current) {
      const s = stops.find(x => x.id === focusId && x.lat != null && x.lng != null)
      if (s) {
        map.panTo({ lat: s.lat!, lng: s.lng! })
        map.setZoom(Math.max(14, map.getZoom() ?? 14))
      }
      lastFocus.current = focusId
      return
    }
    const valid = stops.filter(s => s.lat != null && s.lng != null)
    if (valid.length === 0) return
    const sig = valid.map(s => `${s.id}:${s.lat!.toFixed(3)}:${s.lng!.toFixed(3)}`).join('|')
    if (sig === lastSig.current) return
    lastSig.current = sig
    const bounds = new google.maps.LatLngBounds()
    for (const s of valid) bounds.extend({ lat: s.lat!, lng: s.lng! })
    map.fitBounds(bounds, 60)
  }, [map, stops, focusId])
  return null
}

// ── Recenter when ZIP-search geocodes ──────────────────────────────────
function RecenterTo({ center }: { center: { lat: number; lng: number; radius: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !center) return
    map.panTo({ lat: center.lat, lng: center.lng })
    map.setZoom(12)
  }, [map, center])
  return null
}

export function PublicReaderMap({ brand, market, stops, resources, brandColor: brandColorProp, accentColor: accentColorProp }: Props) {
  const [tab,      setTab]      = useState<'all' | 'featured' | 'resources'>('all')
  const [search,   setSearch]   = useState('')
  const [focusId,  setFocusId]  = useState<string | null>(null)
  const [openId,   setOpenId]   = useState<string | null>(null)
  const [zipCenter, setZipCenter] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const listRef  = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Brand colors flow in from the server (chromeForBrand). Fall back to RRP
  // blue if unset so the map still renders for un-themed markets.
  const brandColor  = brandColorProp  ?? '#1A5FA8'
  const accentColor = accentColorProp ?? brandColor

  // Geocode the search input when it's a 5-digit ZIP. Result fits the map
  // around that area + filters stops to within ~10mi.
  useEffect(() => {
    const q = search.trim()
    if (!/^\d{5}$/.test(q)) {
      setZipCenter(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/distribution/geocode-zip?zip=${q}`)
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j.ok && typeof j.lat === 'number') {
          setZipCenter({ lat: j.lat, lng: j.lng, radius: 16 }) // ~10mi
        }
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [search])

  // Visible stops after tab + search filtering
  const visibleStops = useMemo(() => {
    const q = search.trim().toLowerCase()
    let pool = stops
    if (tab === 'featured') pool = pool.filter(s => tierOf(s) !== null)
    if (q && !/^\d{5}$/.test(q)) {
      pool = pool.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q) ||
        (s.city    ?? '').toLowerCase().includes(q)
      )
    }
    if (zipCenter) {
      pool = pool
        .filter(s => s.lat != null && s.lng != null)
        .filter(s => haversineMi(s.lat!, s.lng!, zipCenter.lat, zipCenter.lng) <= zipCenter.radius)
    }
    return pool
  }, [stops, tab, search, zipCenter])

  // Sort: featured first (by tier rank desc), then alphabetical
  const sortedStops = useMemo(() => {
    return visibleStops.slice().sort((a, b) => {
      const ta = tierRank(tierOf(a))
      const tb = tierRank(tierOf(b))
      if (ta !== tb) return tb - ta
      return a.name.localeCompare(b.name)
    })
  }, [visibleStops])

  // Resources for the third tab
  const visibleResources = useMemo(() => {
    if (tab !== 'resources') return []
    const q = search.trim().toLowerCase()
    if (!q || /^\d{5}$/.test(q)) return resources
    return resources.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.address ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q)
    )
  }, [resources, tab, search])

  // A-Z jump letters present in the sorted list
  const letters = useMemo(() => {
    const set = new Set<string>()
    for (const s of sortedStops) {
      const ch = (s.name[0] || '').toUpperCase()
      if (/[A-Z]/.test(ch)) set.add(ch)
    }
    return Array.from(set).sort()
  }, [sortedStops])

  function scrollToLetter(ch: string) {
    const first = sortedStops.find(s => (s.name[0] || '').toUpperCase() === ch)
    if (!first) return
    const node = itemRefs.current[first.id]
    if (node && listRef.current) {
      listRef.current.scrollTo({ top: node.offsetTop - 8, behavior: 'smooth' })
    }
  }

  function pickStop(id: string) {
    setFocusId(id)
    setOpenId(id)
    // Scroll list to it on mobile
    const node = itemRefs.current[id]
    if (node && listRef.current) {
      listRef.current.scrollTo({ top: node.offsetTop - 8, behavior: 'smooth' })
    }
  }

  const mappable = sortedStops.filter(s => s.lat != null && s.lng != null)
  const featuredCount = stops.filter(s => tierOf(s) !== null).length
  const totalCount    = stops.length

  return (
    <div className="min-h-screen bg-background public-page" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header strip */}
      <header className="border-b border-border bg-card">
        <div className="container py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-black tracking-tight">{brand}</span>
          </Link>
          <Link
            href={`/distribution/${market}/request`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Request a pickup location
          </Link>
        </div>
      </header>

      <main className="container py-4 reader-map-main">
        <div style={{ marginBottom: 10 }}>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Pick up locations</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            <strong>{totalCount.toLocaleString()}</strong> places to grab a free copy of {brand}, including <strong>{featuredCount.toLocaleString()}</strong> featured partners. Search by name or ZIP.
          </p>
        </div>

        {/* Desktop: side-by-side, map sticky on the right.
            Mobile: stacked — map sticks to the top, list below scrolls under it.
            Heights are constrained so the map doesn't grow tall and push
            the list off-screen on desktop. */}
        <div className="reader-map-grid">

          {/* ── Left column: search + tabs + list + A-Z ── */}
          <div className="reader-map-list-pane" style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 12, border: '1px solid var(--color-border, #e5e5e5)', overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
                <input
                  type="search"
                  placeholder="Search by name or ZIP"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <TabButton active={tab === 'all'} onClick={() => setTab('all')} brandColor={brandColor}>All</TabButton>
                <TabButton active={tab === 'featured'} onClick={() => setTab('featured')} brandColor={brandColor}>
                  ★ Featured {featuredCount > 0 && <span style={{ opacity: 0.7 }}>({featuredCount})</span>}
                </TabButton>
                {resources.length > 0 && (
                  <TabButton active={tab === 'resources'} onClick={() => setTab('resources')} brandColor={brandColor}>
                    Resources
                  </TabButton>
                )}
              </div>
            </div>

            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
              {tab === 'resources' ? (
                <ResourcesList resources={visibleResources} />
              ) : (
                <>
                  <div ref={listRef} style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
                    {sortedStops.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                        No locations match.
                      </div>
                    ) : (
                      <FeaturedAndList
                        stops={sortedStops}
                        itemRefs={itemRefs}
                        onPick={pickStop}
                        focusId={focusId}
                        brandColor={brandColor}
                      />
                    )}
                  </div>
                  {/* A-Z jump strip */}
                  {letters.length > 5 && (
                    <div style={{
                      position: 'absolute',
                      right: 2, top: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column',
                      padding: '4px 1px',
                      background: 'rgba(255,255,255,.7)',
                      borderRadius: 8,
                      pointerEvents: 'auto',
                    }}>
                      {letters.map(ch => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => scrollToLetter(ch)}
                          style={{
                            fontSize: 9, fontWeight: 700,
                            color: brandColor,
                            padding: '1px 4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            lineHeight: 1,
                          }}
                        >{ch}</button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right column: map ── */}
          <div className="reader-map-map-pane" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            {!GOOGLE_MAPS_KEY ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#FEF3C7', color: '#92400E', fontSize: 13, padding: 20, textAlign: 'center' }}>
                Map is loading… (set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
              </div>
            ) : (
              <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                <Map
                  mapId={GOOGLE_MAPS_ID}
                  defaultCenter={{ lat: 32.3668, lng: -86.3000 }}
                  defaultZoom={11}
                  gestureHandling="cooperative"
                  disableDefaultUI={false}
                  mapTypeControl={false}
                  streetViewControl={false}
                  style={{ width: '100%', height: '100%', minHeight: 520 }}
                >
                  {mappable.map(s => (
                    <AdvancedMarker
                      key={s.id}
                      position={{ lat: s.lat!, lng: s.lng! }}
                      title={s.name}
                      onClick={() => { setOpenId(s.id); setFocusId(s.id) }}
                    >
                      <TierPin stop={s} brandColor={brandColor} />
                    </AdvancedMarker>
                  ))}
                  {openId && (() => {
                    const s = mappable.find(x => x.id === openId)
                    if (!s) return null
                    return (
                      <InfoWindow
                        position={{ lat: s.lat!, lng: s.lng! }}
                        onCloseClick={() => setOpenId(null)}
                      >
                        <StopInfoCard stop={s} brandColor={brandColor} />
                      </InfoWindow>
                    )
                  })()}
                  <FitTo stops={mappable} focusId={focusId} />
                  <RecenterTo center={zipCenter} />
                </Map>
              </APIProvider>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground" style={{ marginTop: 12 }}>
          Don&apos;t see your favorite spot?{' '}
          <Link href={`/distribution/${market}/request`} className="text-primary hover:underline inline-flex items-center gap-1">
            Suggest a location <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </main>

      <style jsx global>{`
        .reader-map-main {
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 900px) {
          .reader-map-main {
            min-height: calc(100vh - 70px);
          }
          .reader-map-grid {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 16px;
            flex: 1;
            min-height: 0;
          }
          .reader-map-list-pane {
            max-height: calc(100vh - 200px);
          }
          .reader-map-map-pane {
            position: sticky;
            top: 16px;
            height: calc(100vh - 200px);
          }
        }
        @media (max-width: 899px) {
          /* Mobile: map up top (sticky), list below */
          .reader-map-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .reader-map-map-pane {
            position: sticky;
            top: 0;
            z-index: 5;
            height: 50vh;
            min-height: 320px;
          }
          .reader-map-list-pane {
            min-height: 50vh;
          }
        }
      `}</style>
    </div>
  )
}

// ── Featured + alphabetical list ───────────────────────────────────────
function FeaturedAndList({
  stops, itemRefs, onPick, focusId, brandColor,
}: {
  stops: ReaderStop[]
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  onPick: (id: string) => void
  focusId: string | null
  brandColor: string
}) {
  const featured = stops.filter(s => tierOf(s) !== null)
  const standard = stops.filter(s => tierOf(s) === null)
  return (
    <div>
      {featured.length > 0 && (
        <div style={{
          padding: '14px 14px 8px',
          background: `linear-gradient(180deg, ${hexToRgba(brandColor, 0.06)} 0%, transparent 100%)`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '.8px',
            color: brandColor,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 12 }}>★</span> Featured partners
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            These businesses partner with us — make sure to visit them!
          </div>
        </div>
      )}
      {featured.map(s => (
        <ListRow key={s.id} stop={s} brandColor={brandColor} onPick={onPick} focusId={focusId} setRef={el => { itemRefs.current[s.id] = el }} />
      ))}
      {featured.length > 0 && standard.length > 0 && (
        <div style={{
          padding: '14px 14px 8px',
          fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '.6px',
          color: '#64748B',
          borderTop: '1px solid #F1F5F9',
          background: '#F8FAFC',
        }}>
          All locations
        </div>
      )}
      {standard.map(s => (
        <ListRow key={s.id} stop={s} brandColor={brandColor} onPick={onPick} focusId={focusId} setRef={el => { itemRefs.current[s.id] = el }} />
      ))}
    </div>
  )
}

// Convert hex (#RRGGBB) to rgba(r, g, b, a) for translucent backgrounds
function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function ListRow({
  stop, brandColor, onPick, focusId, setRef,
}: {
  stop: ReaderStop
  brandColor: string
  onPick: (id: string) => void
  focusId: string | null
  setRef: (el: HTMLDivElement | null) => void
}) {
  const tier = tierOf(stop)
  const isActive = focusId === stop.id
  // Featured stops get a brand-tinted background, brand-color left rail,
  // hover-lift, and the top-tier ones get a "Partner" tag for a final
  // touch of polish. Standard stops stay quiet.
  const featuredBg = tier
    ? `linear-gradient(90deg, ${hexToRgba(brandColor, tier === 'top' ? 0.10 : tier === 'middle' ? 0.07 : 0.04)} 0%, white 65%)`
    : 'transparent'
  const railWidth = tier === 'top' ? 4 : tier === 'middle' ? 3 : tier === 'bottom' ? 2 : 0
  return (
    <div
      ref={setRef}
      onClick={() => onPick(stop.id)}
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        background: isActive ? hexToRgba(brandColor, 0.15) : featuredBg,
        borderLeft: railWidth ? `${railWidth}px solid ${brandColor}` : 'none',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        transition: 'background 120ms ease, transform 120ms ease, box-shadow 120ms ease',
      }}
      onMouseEnter={e => {
        if (tier) {
          e.currentTarget.style.background = hexToRgba(brandColor, 0.18)
          e.currentTarget.style.boxShadow  = 'inset 0 0 0 1px ' + hexToRgba(brandColor, 0.25)
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = featuredBg
          e.currentTarget.style.boxShadow  = 'none'
        }
      }}
    >
      {stop.logo_path && tier ? (
        <div style={{
          width: tier === 'top' ? 48 : 40,
          height: tier === 'top' ? 48 : 40,
          borderRadius: 10,
          background: 'white',
          border: `1.5px solid ${tier === 'top' ? brandColor : '#E2E8F0'}`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: tier === 'top' ? `0 2px 6px ${hexToRgba(brandColor, 0.2)}` : 'none',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stop.logo_path} alt="" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
        </div>
      ) : tier ? (
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: hexToRgba(brandColor, 0.12),
          color: brandColor,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800,
        }}>★</div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: tier ? 800 : 500, color: '#0F1F37' }}>
            {stop.name}
          </span>
          {tier === 'top' && (
            <span style={{
              fontSize: 9, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '.5px',
              padding: '1px 6px', borderRadius: 4,
              background: brandColor, color: 'white',
            }}>Partner</span>
          )}
        </div>
        {stop.address && (
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {stop.address}{stop.city ? `, ${stop.city}` : ''}
          </div>
        )}
        {tier === 'top' && (stop.website || stop.instagram || stop.facebook || stop.tiktok) && (
          <div style={{ marginTop: 5, display: 'flex', gap: 10, fontSize: 11, fontWeight: 700 }}>
            {stop.website   && <a href={stop.website}   target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: brandColor }}>Website</a>}
            {stop.instagram && <a href={stop.instagram} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: brandColor }}>Instagram</a>}
            {stop.facebook  && <a href={stop.facebook}  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: brandColor }}>Facebook</a>}
            {stop.tiktok    && <a href={stop.tiktok}    target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: brandColor }}>TikTok</a>}
          </div>
        )}
      </div>
    </div>
  )
}

function ResourcesList({ resources }: { resources: ReaderResource[] }) {
  if (resources.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
        No community resources listed for this region yet.
      </div>
    )
  }
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {resources.map(r => (
        <div key={r.id} style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {r.logo_path && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={r.logo_path} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {r.category && <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>{r.category}</div>}
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              {r.description && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{r.description}</div>}
              {r.website && (
                <a href={r.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1A5FA8' }}>
                  {r.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── InfoWindow rich card ──────────────────────────────────────────────
function StopInfoCard({ stop, brandColor }: { stop: ReaderStop; brandColor: string }) {
  const tier = tierOf(stop)
  const fullAddress = [stop.address, stop.city, stop.zip].filter(Boolean).join(', ')
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress || stop.name)}`
  return (
    <div style={{ minWidth: 220, maxWidth: 280 }}>
      {tier === 'top' && stop.logo_path && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={stop.logo_path} alt="" style={{ width: '100%', maxHeight: 80, objectFit: 'contain', marginBottom: 6 }} />
      )}
      <div style={{ fontWeight: 800, fontSize: 14, color: '#0F1F37', display: 'flex', alignItems: 'center', gap: 4 }}>
        {tier && <span style={{ color: brandColor }}>★</span>}
        {stop.name}
      </div>
      {fullAddress && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{fullAddress}</div>}
      {stop.description && tier && (
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic', lineHeight: 1.3 }}>
          {stop.description}
        </div>
      )}

      {tier === 'top' && (stop.website || stop.instagram || stop.facebook || stop.tiktok) && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
          {stop.website   && <a href={stop.website}   target="_blank" rel="noopener noreferrer" style={{ color: brandColor }}>Website</a>}
          {stop.instagram && <a href={stop.instagram} target="_blank" rel="noopener noreferrer" style={{ color: brandColor }}>Instagram</a>}
          {stop.facebook  && <a href={stop.facebook}  target="_blank" rel="noopener noreferrer" style={{ color: brandColor }}>Facebook</a>}
          {stop.tiktok    && <a href={stop.tiktok}    target="_blank" rel="noopener noreferrer" style={{ color: brandColor }}>TikTok</a>}
        </div>
      )}
      {tier === 'middle' && stop.website && (
        <div style={{ marginTop: 8, fontSize: 11 }}>
          <a href={stop.website} target="_blank" rel="noopener noreferrer" style={{ color: brandColor }}>
            {stop.website.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: 10,
          padding: '7px 10px',
          background: brandColor,
          color: 'white',
          textAlign: 'center',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Get directions →
      </a>
    </div>
  )
}

function TabButton({ active, onClick, children, brandColor }: { active: boolean; onClick: () => void; children: React.ReactNode; brandColor: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: 11, fontWeight: 700,
        background: active ? brandColor : 'transparent',
        color: active ? 'white' : '#64748B',
        border: '1px solid ' + (active ? brandColor : '#E2E8F0'),
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// Haversine distance in miles
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R   = 3958.8 // earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}
