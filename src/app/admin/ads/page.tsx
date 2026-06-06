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
import { Star, RefreshCw, Plus, AlertTriangle, Search, Bookmark } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'

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
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off'>('all')

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

  const visibleAds = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ads.filter(a => {
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
  }, [ads, filterType, statusFilter, search])

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1200px] mx-auto space-y-6">

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

        {/* ── Section Sponsors quick-link ──────────────────────── */}
        <Link
          href="/admin/section-sponsors"
          className="block bg-gradient-to-r from-violet-50 via-white to-white border border-violet-200 rounded-2xl p-4 hover:border-violet-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 shrink-0">
              <Bookmark size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Section Sponsors</p>
              <p className="text-xs text-gray-500">
                Per-column &quot;presented by&quot; sponsors (Play Ball, Teacher of the Month, etc.) — separate from ad placements. Manage them here →
              </p>
            </div>
            <span className="text-xs font-semibold text-violet-700 shrink-0">Open →</span>
          </div>
        </Link>

        {/* ── Filter + search ──────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">Placement</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[260px] flex-1"
            >
              <option value="">All placement types</option>
              {placementGroups.map(group => (
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
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                    <th className="px-4 py-2 font-semibold whitespace-nowrap">Placement</th>
                    <th className="px-4 py-2 font-semibold">Context</th>
                    <th className="px-4 py-2 font-semibold">Advertiser</th>
                    <th className="px-4 py-2 font-semibold">Headline</th>
                    <th className="px-4 py-2 font-semibold text-center">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Impr.</th>
                    <th className="px-4 py-2 font-semibold text-right">Clicks</th>
                    <th className="px-4 py-2 font-semibold text-right">CTR</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAds.map(ad => {
                    const def = findPlacementType(ad.placement_type)
                    return (
                      <tr key={ad.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
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
                        <td className="px-4 py-3 text-right whitespace-nowrap">
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
