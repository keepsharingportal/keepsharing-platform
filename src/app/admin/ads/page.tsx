'use client'

// ── /admin/ads — All Bookings ─────────────────────────────────────────────────
// Flat list of every ad_placements row across every surface. Use Slot Map
// for the visual-grid version; this is the power-edit/triage view.
//
// Wrapper matches the /admin/trending pattern: flex-1 + min-h-0 +
// overflow-y-auto so the page scrolls under the fixed admin chrome.
// Inline-style version was hardcoding padding outside this wrapper which
// is why the list ran off-screen.

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Star, RefreshCw, Plus, AlertTriangle, Search, LayoutGrid, ChevronDown, ChevronRight, MapPin, EyeOff, Eye } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType, PLACEMENT_TYPES, SURFACE_LABELS, type SurfaceKey } from '@/lib/ads/placement-types'
import { AdsTabs } from '@/components/admin/AdsTabs'
import { PageLayoutPreview } from '@/components/admin/PageLayoutPreview'

// Every page on the site that can carry an ad — verticals + specific
// guides flattened so the editor sees the whole universe at once
// without nesting. Each entry encodes the surface(s) AND the optional
// context_slug that scopes a placement to that specific page.
type PageOption = {
  key:      string
  label:    string
  surfaces: SurfaceKey[]                 // placement-type surfaces that count
  /** ad_placements.context_slug filter:
   *  - undefined → no context filter (match all contexts on this surface)
   *  - null      → require context_slug IS NULL / empty (bare index page)
   *  - string    → require context_slug === string (specific guide/vertical) */
  context?: string | null
}
const PAGE_OPTIONS: PageOption[] = [
  { key: 'all',                   label: 'All pages',                surfaces: [] },
  { key: 'homepage',              label: 'Homepage',                 surfaces: ['homepage'] },

  // Verticals — top-level themed pages with dedicated designs
  { key: 'school-zone',           label: 'School Zone (vertical)',   surfaces: ['verticals'], context: 'school-zone' },
  { key: 'school-bits',           label: 'School Bits',              surfaces: ['school-bits'] },
  { key: 'mom-knows-best',        label: 'Mom Knows Best (vertical)', surfaces: ['verticals'], context: 'mom-knows-best' },
  { key: 'games',                 label: 'Brain Games',              surfaces: ['verticals'], context: 'games' },
  { key: 'family-resource-guide', label: 'Family Resource Guide (vertical landing)', surfaces: ['verticals'], context: 'family-resource-guide' },

  // Specific guides under the FRG vertical — each its own page design
  { key: 'private-school-guide',  label: 'Private School Guide',  surfaces: ['guides'], context: 'private-school-guide' },
  { key: 'special-needs-guide',   label: 'Special Needs Guide',   surfaces: ['guides'], context: 'special-needs-guide' },
  { key: 'afterschool-guide',     label: 'Afterschool Guide',     surfaces: ['guides'], context: 'afterschool-guide' },
  { key: 'healthy-kids-guide',    label: 'Healthy Kids Guide',    surfaces: ['guides'], context: 'healthy-kids-guide' },
  { key: 'summer-camp-guide',     label: 'Summer Camp Guide',     surfaces: ['guides'], context: 'summer-camp-guide' },
  { key: 'childcare-guide',       label: 'Childcare Guide',       surfaces: ['guides'], context: 'childcare-guide' },
  { key: 'birthday-party-guide',  label: 'Birthday Party Guide',  surfaces: ['guides'], context: 'birthday-party-guide' },
  { key: 'summer-fun-guide',      label: 'Summer Fun Guide',      surfaces: ['guides'], context: 'summer-fun-guide' },
  { key: 'newcomer-guide',        label: 'Newcomer Guide',        surfaces: ['guides'], context: 'newcomer-guide' },
  { key: 'best-of-guide',         label: 'Best of the Region',    surfaces: ['guides'], context: 'best-of' },
  { key: 'local-guides-index',    label: 'Local Guides — index',  surfaces: ['guides'], context: null },

  // Cross-page surfaces — apply globally
  { key: 'articles',              label: 'Articles (any column)',  surfaces: ['articles'] },
  { key: 'calendar',              label: 'Calendar',               surfaces: ['calendar'] },
  { key: 'newsletter',            label: 'Newsletter',             surfaces: ['newsletter'] },
  { key: 'site',                  label: 'Site-wide / footer',     surfaces: ['site'] },
]

interface AdPlacement {
  id:                string
  placement_type:    string
  context_type:      string | null
  context_slug:      string | null
  ad_headline:       string | null
  ad_eyebrow:        string | null
  ad_cta_label:      string | null
  is_active:         boolean
  impression_count:  number
  click_count:       number
  starts_at:         string
  ends_at:           string | null
  rotation_group:    string | null
  rotation_weight:   number | null
  advertiser_accounts: { business_name: string } | null
}

const ctr = (imp: number, clk: number) =>
  imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—'

export default function AdminAdsPage() {
  const [ads,        setAds]        = useState<AdPlacement[]>([])
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  // filterPage is now a key into PAGE_OPTIONS — verticals + each specific
  // guide live as their own pages, so the editor can filter to "show me
  // everything on Private School Guide" in one click.
  const [filterPage, setFilterPage] = useState<string>('all')
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off' | 'rotation'>('all')
  const [catalogOpen,  setCatalogOpen]  = useState(false)

  // Server returns the full set; filtering happens client-side so the
  // editor can flip placement / status / search without a round-trip.
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/admin/ads/list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); setAds([]); return }
      setAds(json.ads as AdPlacement[])
      setHiddenSlots(new Set((json.hiddenSlots ?? []) as string[]))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Map of placement_type → its surface, so the page filter can also
  // constrain by registered placement (a booking whose placement isn't
  // in the registry still shows under "All Pages").
  const surfaceForSlug = useMemo(() => {
    const m: Record<string, SurfaceKey> = {}
    for (const p of PLACEMENT_TYPES) m[p.slug] = p.surface
    return m
  }, [])

  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase()
    const page = PAGE_OPTIONS.find(p => p.key === filterPage)
    return ads.filter(a => {
      // Page filter: (surface matches) AND (context matches, if scoped).
      // Bookings with an unregistered placement_type fall through to "all
      // pages" only — they never match a specific page filter.
      if (page && page.surfaces.length > 0) {
        const surface = surfaceForSlug[a.placement_type]
        if (!surface || !page.surfaces.includes(surface)) return false
        if (page.context !== undefined) {
          if (page.context === null) {
            // Page scoped to "no context_slug" — i.e. the bare index page.
            if (a.context_slug != null && a.context_slug !== '') return false
          } else {
            if (a.context_slug !== page.context) return false
          }
        }
      }
      if (filterType && a.placement_type !== filterType) return false
      if (statusFilter === 'on'        && !a.is_active) return false
      if (statusFilter === 'off'       &&  a.is_active) return false
      if (statusFilter === 'rotation'  && !a.rotation_group) return false
      if (q) {
        const haystack = [
          a.advertiser_accounts?.business_name ?? '',
          a.ad_headline ?? '',
          a.ad_eyebrow  ?? '',
          a.placement_type,
          a.context_slug ?? '',
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [ads, filterType, filterPage, statusFilter, search, surfaceForSlug])

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/ads/toggle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, is_active: !current }),
    })
    load()
  }

  async function deleteAd(id: string) {
    if (!confirm('Delete this ad placement?')) return
    await fetch('/api/admin/ads/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    load()
  }

  // Site-wide Hide/Show for an empty slot. When hidden, the slot won't
  // even render its sales placeholder ("Claim This Spot") — useful for
  // article-body inline ads where you don't want a pitch in the middle
  // of the copy.
  async function toggleSlotHidden(placementType: string) {
    const isHidden = hiddenSlots.has(placementType)
    await fetch('/api/admin/ads/slot-toggle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ placementType, contextSlug: null, disabled: !isHidden }),
    })
    load()
  }

  const placementGroups = groupedPlacementTypes()
  const activeCount     = ads.filter(a => a.is_active).length
  const rotationCount   = ads.filter(a => a.rotation_group).length

  // Per-placement-type booking counts. Lets the catalog show "X bookings"
  // next to every registered slot so the editor can see which spots are
  // empty (sellable) vs occupied. Also feeds the "unused" badge.
  const countsBySlug = useMemo(() => {
    const m: Record<string, { total: number; active: number }> = {}
    for (const a of ads) {
      const k = a.placement_type
      if (!m[k]) m[k] = { total: 0, active: 0 }
      m[k].total++
      if (a.is_active) m[k].active++
    }
    return m
  }, [ads])

  const catalogBySurface = useMemo(() => {
    const out: Array<{ surface: SurfaceKey; label: string; entries: typeof PLACEMENT_TYPES }> = []
    const order: SurfaceKey[] = ['homepage', 'school-bits', 'articles', 'guides', 'verticals', 'calendar', 'newsletter', 'site']
    for (const s of order) {
      const entries = PLACEMENT_TYPES.filter(p => p.surface === s)
      if (entries.length > 0) out.push({ surface: s, label: SURFACE_LABELS[s], entries })
    }
    return out
  }, [])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* ── Section tabs ──────────────────────────────────────── */}
        <AdsTabs />

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} className="text-primary" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Ad Bookings</h1>
            </div>
            <p className="text-sm text-gray-500">
              Every active and paused placement across the site. For the visual map of where each slot lives,{' '}
              <Link href="/admin/ads/map" className="text-primary font-semibold hover:underline">use Slot Map →</Link>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              href="/admin/ads/new"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90"
            >
              <Plus size={14} /> New placement
            </Link>
          </div>
        </header>

        {/* ── Summary stats — click any tile to filter the list to it ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total bookings" value={ads.length}                 tone="#0f172a"
                active={statusFilter === 'all' && filterPage === 'all' && !filterType}
                onClick={() => { setStatusFilter('all'); setFilterPage('all'); setFilterType('') }} />
          <Stat label="Active"          value={activeCount}                tone="#16a34a"
                active={statusFilter === 'on'}
                onClick={() => setStatusFilter('on')} />
          <Stat label="Paused"          value={ads.length - activeCount}   tone="#dc2626"
                active={statusFilter === 'off'}
                onClick={() => setStatusFilter('off')} />
          <Stat label="In rotation"     value={rotationCount}              tone="#7c3aed"
                active={statusFilter === 'rotation'}
                onClick={() => setStatusFilter('rotation')} />
        </div>

        {/* ── Slot catalog ─────────────────────────────────────── */}
        {/* Every registered placement_type across every page. Shows which
            slots are SELLABLE (zero bookings) vs LIVE (≥1 active) vs
            BOOKED-BUT-PAUSED. Lets the editor see the universe of 24
            slots, not just the 17 they've already booked. Click a card
            to filter the list below to just that slot. */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setCatalogOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-700">
                Slot Catalog · {PLACEMENT_TYPES.length} registered slots
              </h2>
              <span className="text-xs text-gray-500 ml-2">
                ({PLACEMENT_TYPES.filter(p => (countsBySlug[p.slug]?.total ?? 0) === 0).length} sellable · click any slot to filter the list)
              </span>
            </div>
            {catalogOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </button>
          {catalogOpen && (
            <div className="p-5 space-y-5">
              {catalogBySurface.map(group => (
                <div key={group.surface}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">{group.label}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.entries.map(p => {
                      const c        = countsBySlug[p.slug] ?? { total: 0, active: 0 }
                      const isHidden = hiddenSlots.has(p.slug)
                      // 3-state status: HIDDEN > LIVE > SELLABLE > BOOKED-BUT-OFF
                      const state: 'hidden' | 'live' | 'sellable' | 'paused' =
                        isHidden       ? 'hidden'   :
                        c.active > 0   ? 'live'     :
                        c.total === 0  ? 'sellable' :
                                         'paused'
                      const cardClasses = {
                        hidden:   'border-gray-300 bg-gray-100/60 hover:bg-gray-100',
                        live:     'border-green-200 bg-green-50/40 hover:bg-green-50',
                        sellable: 'border-amber-200 bg-amber-50/40 hover:bg-amber-50',
                        paused:   'border-gray-200 bg-gray-50 hover:bg-gray-100',
                      }[state]
                      const badgeClasses = {
                        hidden:   'bg-gray-700  text-white',
                        live:     'bg-green-600 text-white',
                        sellable: 'bg-amber-100 text-amber-800',
                        paused:   'bg-gray-300  text-gray-700',
                      }[state]
                      const badgeLabel = {
                        hidden:   'Hidden',
                        live:     `${c.active}/${c.total} ON`,
                        sellable: 'Empty',
                        paused:   `0/${c.total} ON`,
                      }[state]
                      return (
                        <div
                          key={p.slug}
                          className={`rounded-xl border p-3 transition-colors ${
                            filterType === p.slug ? 'border-primary bg-primary/5' : cardClasses
                          } ${isHidden ? 'opacity-70' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-semibold leading-tight ${isHidden ? 'text-gray-600 line-through decoration-gray-400' : 'text-gray-900'}`}>{p.label}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{p.slug}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClasses}`}>
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] flex-wrap">
                            <button
                              onClick={() => setFilterType(p.slug)}
                              className="font-semibold text-gray-600 hover:text-gray-900"
                            >
                              Filter list
                            </button>
                            <span className="text-gray-300">·</span>
                            {!isHidden && (
                              <>
                                <Link
                                  href={`/admin/ads/new?placement_type=${encodeURIComponent(p.slug)}`}
                                  className="font-bold text-primary hover:underline"
                                >
                                  + Sell
                                </Link>
                                <span className="text-gray-300">·</span>
                              </>
                            )}
                            <button
                              onClick={() => toggleSlotHidden(p.slug)}
                              className={`inline-flex items-center gap-1 font-bold ${isHidden ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-600 hover:text-gray-900'}`}
                              title={isHidden ? 'Show this slot again (re-render bookings + placeholders)' : 'Hide this slot site-wide (no ad, no placeholder)'}
                            >
                              {isHidden
                                ? <><Eye size={11} /> Show</>
                                : <><EyeOff size={11} /> Hide</>}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Filter + search ──────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          {/* Page filter — every page on the site, flat. Verticals
              (themed top-level pages like School Zone, Mom Knows Best)
              and specific guides (Private School, Special Needs, etc.)
              each get their own pill so the editor can drill straight
              to "show me everything on Private School Guide" in one
              click. Wraps to multiple rows on narrow viewports. */}
          <div className="flex items-start gap-2 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0 pt-1.5">Page</label>
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {PAGE_OPTIONS.map(p => {
                const on = filterPage === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      setFilterPage(p.key)
                      // Clear placement filter when changing page so the
                      // dropdown doesn't show stale slots from a previous page.
                      if (p.key !== 'all' && filterType) {
                        const slotSurface = surfaceForSlug[filterType]
                        if (!slotSurface || !p.surfaces.includes(slotSurface)) {
                          setFilterType('')
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      on
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Placement</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[260px] flex-1"
            >
              <option value="">
                {(() => {
                  const page = PAGE_OPTIONS.find(p => p.key === filterPage)
                  if (!page || page.key === 'all') return 'All placement types'
                  return `All ${page.label} placements`
                })()}
              </option>
              {(() => {
                const page = PAGE_OPTIONS.find(p => p.key === filterPage)
                const allowedSurfaces = page && page.surfaces.length > 0 ? page.surfaces : null
                return placementGroups
                  .filter(g => !allowedSurfaces || allowedSurfaces.includes(g.surface))
                  .map(group => (
                    <optgroup key={group.surface} label={group.label}>
                      {group.entries.map(p => (
                        <option key={p.slug} value={p.slug}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))
              })()}
            </select>
            {filterType && (
              <button
                onClick={() => setFilterType('')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Search</label>
            <div className="relative flex-1 min-w-[260px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Business name, headline, context…"
                className="w-full text-sm pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0 ml-2">Status</label>
            <div className="flex items-center gap-1">
              {(['all', 'on', 'off'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border transition-colors ${
                    statusFilter === s
                      ? s === 'on'  ? 'bg-green-600 text-white border-green-700' :
                        s === 'off' ? 'bg-red-600   text-white border-red-700'   :
                                      'bg-gray-900  text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Page layout preview ──────────────────────────────── */}
        {/* When a Page filter is set, render the labeled page-layout
            diagram with every slot color-coded by booking status. Click
            any slot to filter the booking list to that placement. */}
        {(() => {
          const page = PAGE_OPTIONS.find(p => p.key === filterPage)
          if (!page || page.key === 'all' || page.surfaces.length === 0) return null
          const primarySurface = page.surfaces[0]
          // Slot statuses per placement_type for this page. Bookings filtered
          // to the page's surface AND context_slug — so Private School Guide's
          // status uses ONLY bookings on Private School Guide.
          const slotStatuses: Record<string, 'live' | 'paused' | 'sellable' | 'hidden'> = {}
          for (const pt of PLACEMENT_TYPES.filter(p => page.surfaces.includes(p.surface))) {
            if (hiddenSlots.has(pt.slug)) { slotStatuses[pt.slug] = 'hidden'; continue }
            const scoped = ads.filter(a => a.placement_type === pt.slug && (
              page.context === undefined ? true :
              page.context === null      ? (a.context_slug == null || a.context_slug === '') :
                                           a.context_slug === page.context
            ))
            if (scoped.length === 0)              slotStatuses[pt.slug] = 'sellable'
            else if (scoped.some(a => a.is_active)) slotStatuses[pt.slug] = 'live'
            else                                    slotStatuses[pt.slug] = 'paused'
          }
          return (
            <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  {page.label} — slot map
                </h2>
              </div>
              <div className="p-5 grid md:grid-cols-[1fr_minmax(340px,_auto)] gap-5 items-start">
                <div className="text-xs text-gray-600 space-y-2">
                  <p>
                    Every ad slot that can run on <strong>{page.label}</strong>. Color = booking status on THIS page:{' '}
                    <span className="font-semibold text-green-700">live</span> · {' '}
                    <span className="font-semibold text-gray-700">paused</span> (booked, nothing on) · {' '}
                    <span className="font-semibold text-amber-700">empty</span> (sellable) · {' '}
                    <span className="font-semibold text-gray-500">hidden</span> (site-wide off).
                  </p>
                  <p>
                    Click any slot to filter the booking list to that placement. Click <strong>+ Sell this slot</strong>{' '}
                    in the Slot Catalog above to open a new-booking form pre-filled.
                  </p>
                  <p className="text-gray-400 italic">
                    Layouts mapped: Homepage, Articles, Guides. School Bits / Calendar / Newsletter / Site-wide / Verticals
                    render the slot list inline until I draw their layouts too.
                  </p>
                </div>
                <PageLayoutPreview
                  surface={primarySurface}
                  slotStatuses={slotStatuses}
                  onSlotClick={(slug) => setFilterType(slug)}
                />
              </div>
            </section>
          )
        })()}

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Load failed</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── List ─────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">
              {visibleAds.length} of {ads.length} {ads.length === 1 ? 'placement' : 'placements'}
            </h2>
            {(filterType || search || statusFilter !== 'all') && (
              <button
                onClick={() => { setFilterType(''); setSearch(''); setStatusFilter('all') }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all filters
              </button>
            )}
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : visibleAds.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              {ads.length === 0
                ? <>No ad placements yet. <Link href="/admin/ads/new" className="text-primary font-semibold hover:underline">Create one →</Link></>
                : 'No placements match those filters.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Column widths set in a colgroup so the table can't dilate
                  the right-side metric columns out of view. Actions
                  sticks to the right edge so Edit/Delete stay reachable
                  even when the editor scrolls horizontally on a narrow
                  screen. */}
              <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 1100 }}>
                <colgroup>
                  <col style={{ width: 260 }} />  {/* Placement */}
                  <col style={{ width: 110 }} />  {/* Context */}
                  <col style={{ width: 180 }} />  {/* Advertiser */}
                  <col style={{ width: 220 }} />  {/* Headline */}
                  <col style={{ width: 90  }} />  {/* Status */}
                  <col style={{ width: 70  }} />  {/* Impr. */}
                  <col style={{ width: 70  }} />  {/* Clicks */}
                  <col style={{ width: 60  }} />  {/* CTR */}
                  <col style={{ width: 130 }} />  {/* Actions */}
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                    <th className="px-4 py-2 font-semibold">Placement</th>
                    <th className="px-4 py-2 font-semibold">Context</th>
                    <th className="px-4 py-2 font-semibold">Advertiser</th>
                    <th className="px-4 py-2 font-semibold">Headline</th>
                    <th className="px-4 py-2 font-semibold text-center">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Impr.</th>
                    <th className="px-4 py-2 font-semibold text-right">Clicks</th>
                    <th className="px-4 py-2 font-semibold text-right">CTR</th>
                    <th className="px-4 py-2 font-semibold text-right sticky right-0 bg-gray-50 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAds.map(ad => {
                    const def = findPlacementType(ad.placement_type)
                    return (
                      <tr key={ad.id} className={`group border-b border-gray-100 last:border-0 hover:bg-gray-50 ${ad.placement_type === 'section_sponsor' ? 'bg-violet-50/30' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {def ? (
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {ad.placement_type === 'section_sponsor' && (
                                  <span className="inline-block mr-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-600 text-white align-middle">SECTION SPONSOR</span>
                                )}
                                {ad.placement_type === 'section_sponsor' && ad.context_slug ? `${ad.context_slug} — presented by` : def.label}
                              </div>
                              <code className="text-[10px] text-gray-400">{ad.placement_type}</code>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded">
                              <AlertTriangle size={11} />
                              {ad.placement_type}
                            </span>
                          )}
                          {ad.rotation_group && (
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-50 text-violet-700">
                              In rotation
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {ad.context_slug ?? ad.context_type ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {ad.advertiser_accounts?.business_name ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[260px] truncate">
                          {ad.ad_headline ?? <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {/* Hard ON/OFF toggle styled like a switch — green
                              filled = live on the site, red filled = off.
                              Clicking flips the state via the toggle API. */}
                          <button
                            onClick={() => toggleActive(ad.id, ad.is_active)}
                            title={`Click to turn ${ad.is_active ? 'OFF' : 'ON'}`}
                            className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors min-w-[68px] justify-center ${
                              ad.is_active
                                ? 'bg-green-600 text-white hover:bg-green-700 ring-1 ring-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700 ring-1 ring-red-700'
                            }`}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white" />
                            {ad.is_active ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
                          {ad.impression_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
                          {ad.click_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
                          {ctr(ad.impression_count, ad.click_count)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]">
                          {/* Section sponsors are now real ad_placements
                              rows since migration 122 — same Edit/Delete
                              UX as any other booking, with the section-
                              sponsor-specific fields (logo, tagline,
                              accent color) appearing on the edit form
                              when placement_type='section_sponsor'. */}
                          <Link
                            href={`/admin/ads/${ad.id}/edit`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Link>
                          <span className="text-gray-300 mx-2">·</span>
                          <button
                            onClick={() => deleteAd(ad.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, tone, active, onClick }: {
  label:   string
  value:   number
  tone:    string
  active?: boolean
  onClick?: () => void
}) {
  const className = `text-left bg-white border rounded-2xl p-4 transition-all ${
    active
      ? 'border-2 ring-2 ring-offset-1'
      : 'border-gray-200 hover:border-gray-300'
  } ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}`
  const style: React.CSSProperties = active ? { borderColor: tone, boxShadow: `0 0 0 1px ${tone}33` } : {}
  const content = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tone }} />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className={className} style={style} type="button">
        {content}
      </button>
    )
  }
  return <div className={className} style={style}>{content}</div>
}
