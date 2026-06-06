'use client'

// ── /admin/ads — All Bookings ─────────────────────────────────────────────────
// Flat list of every ad_placements row across every surface. Use Slot Map
// for the visual-grid version; this is the power-edit/triage view.
//
// Wrapper matches the /admin/trending pattern: flex-1 + min-h-0 +
// overflow-y-auto so the page scrolls under the fixed admin chrome.
// Inline-style version was hardcoding padding outside this wrapper which
// is why the list ran off-screen.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Star, RefreshCw, Plus, AlertTriangle } from 'lucide-react'
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

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/admin/ads/list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); setAds([]); return }
      const filtered = filterType
        ? (json.ads as AdPlacement[]).filter(a => a.placement_type === filterType)
        : (json.ads as AdPlacement[])
      setAds(filtered)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => { load() }, [load])

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

        {/* ── Filter ───────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white min-w-[260px]"
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
              {ads.length} {ads.length === 1 ? 'placement' : 'placements'}
            </h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : ads.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              No ad placements yet. <Link href="/admin/ads/new" className="text-primary font-semibold hover:underline">Create one →</Link>
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
                  {ads.map(ad => {
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
                          <button
                            onClick={() => toggleActive(ad.id, ad.is_active)}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                              ad.is_active
                                ? 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {ad.is_active ? 'Active' : 'Paused'}
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
