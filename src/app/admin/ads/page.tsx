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
import { Star, RefreshCw, Plus, AlertTriangle, Search, LayoutGrid, ChevronDown, ChevronRight, MapPin } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType, PLACEMENT_TYPES, SURFACE_LABELS, type SurfaceKey } from '@/lib/ads/placement-types'
import { AdsTabs } from '@/components/admin/AdsTabs'
import { PageLayoutPreview } from '@/components/admin/PageLayoutPreview'

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
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterPage, setFilterPage] = useState<'all' | SurfaceKey>('all')
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off'>('all')
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
    return ads.filter(a => {
      if (filterPage !== 'all' && surfaceForSlug[a.placement_type] !== filterPage) return false
      if (filterType && a.placement_type !== filterType) return false
      if (statusFilter === 'on'  && !a.is_active) return false
      if (statusFilter === 'off' &&  a.is_active) return false
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

        {/* ── Summary stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total bookings" value={ads.length}      tone="#0f172a" />
          <Stat label="Active"          value={activeCount}     tone="#16a34a" />
          <Stat label="Paused"          value={ads.length - activeCount} tone="#6b7280" />
          <Stat label="In rotation"     value={rotationCount}   tone="#7c3aed" />
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
                      const c       = countsBySlug[p.slug] ?? { total: 0, active: 0 }
                      const sellable = c.total === 0
                      const live    = c.active > 0
                      return (
                        <div
                          key={p.slug}
                          className={`rounded-xl border p-3 transition-colors ${
                            filterType === p.slug
                              ? 'border-primary bg-primary/5'
                              : sellable
                                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
                                : live
                                  ? 'border-green-200 bg-green-50/40 hover:bg-green-50'
                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900 leading-tight">{p.label}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{p.slug}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              sellable
                                ? 'bg-amber-100 text-amber-800'
                                : live
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-300 text-gray-700'
                            }`}>
                              {sellable ? 'Sellable' : `${c.active}/${c.total} on`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              onClick={() => setFilterType(p.slug)}
                              className="font-semibold text-gray-600 hover:text-gray-900"
                            >
                              Filter list
                            </button>
                            <span className="text-gray-300">·</span>
                            <Link
                              href={`/admin/ads/new?placement_type=${encodeURIComponent(p.slug)}`}
                              className="font-bold text-primary hover:underline"
                            >
                              + Sell this slot
                            </Link>
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
          {/* Page filter — pill row by surface. Picking a page constrains
              the placement dropdown below to that page's slots and renders
              the labeled page-layout diagram in the next section. */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Page</label>
            {([
              { key: 'all'         as const, label: 'All pages'  },
              { key: 'homepage'    as const, label: 'Homepage'   },
              { key: 'articles'    as const, label: 'Articles'   },
              { key: 'guides'      as const, label: 'Guides'     },
              { key: 'school-bits' as const, label: 'School Bits'},
              { key: 'verticals'   as const, label: 'Verticals'  },
              { key: 'calendar'    as const, label: 'Calendar'   },
              { key: 'newsletter'  as const, label: 'Newsletter' },
              { key: 'site'        as const, label: 'Site-wide'  },
            ]).map(p => {
              const on = filterPage === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setFilterPage(p.key)
                    // Clear placement filter when changing page so the
                    // dropdown doesn't show stale slots from a previous page.
                    if (p.key !== 'all' && filterType && surfaceForSlug[filterType] !== p.key) {
                      setFilterType('')
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
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

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Placement</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[260px] flex-1"
            >
              <option value="">
                {filterPage === 'all' ? 'All placement types' : `All ${SURFACE_LABELS[filterPage as SurfaceKey]} placements`}
              </option>
              {placementGroups
                .filter(g => filterPage === 'all' || g.surface === filterPage)
                .map(group => (
                  <optgroup key={group.surface} label={group.label}>
                    {group.entries.map(p => (
                      <option key={p.slug} value={p.slug}>{p.label}</option>
                    ))}
                  </optgroup>
                ))}
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
        {filterPage !== 'all' && (
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-primary" />
                {SURFACE_LABELS[filterPage as SurfaceKey]} — slot map
              </h2>
            </div>
            <div className="p-5 grid md:grid-cols-[1fr_minmax(340px,_auto)] gap-5 items-start">
              <div className="text-xs text-gray-600 space-y-2">
                <p>
                  Every ad slot registered for the <strong>{SURFACE_LABELS[filterPage as SurfaceKey]}</strong> page.
                  Color = booking status: <span className="font-semibold text-green-700">live</span> has at least one
                  active ad rendering, <span className="font-semibold text-gray-700">paused</span> has bookings but
                  nothing currently on, <span className="font-semibold text-amber-700">sellable</span> is empty (no
                  bookings yet — pitch this slot).
                </p>
                <p>
                  Click any slot in the diagram to filter the booking list to that placement. Click <strong>+ Sell
                  this slot</strong> in the Slot Catalog above to open a new-booking form pre-filled with that
                  placement.
                </p>
                <p className="text-gray-400 italic">
                  Note: layout diagrams for Articles and Guides are mapped; School Bits / Calendar / Newsletter /
                  Site-wide will render the slot list inline until I draw their layouts too — say the word.
                </p>
              </div>
              <PageLayoutPreview
                surface={filterPage}
                slotStatuses={Object.fromEntries(
                  PLACEMENT_TYPES.filter(p => p.surface === filterPage).map(p => {
                    const c = countsBySlug[p.slug]
                    const status: 'live' | 'paused' | 'sellable' =
                      !c || c.total === 0 ? 'sellable' :
                      c.active > 0        ? 'live'     :
                                            'paused'
                    return [p.slug, status]
                  })
                ) as Record<string, 'live' | 'paused' | 'sellable'>}
                onSlotClick={(slug) => setFilterType(slug)}
              />
            </div>
          </section>
        )}

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
                      <tr key={ad.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {def ? (
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{def.label}</div>
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

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tone }} />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
