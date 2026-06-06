'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'

interface AdPlacement {
  id: string
  placement_type: string
  context_type: string | null
  context_slug: string | null
  ad_headline: string | null
  ad_eyebrow: string | null
  ad_cta_label: string | null
  is_active: boolean
  impression_count: number
  click_count: number
  starts_at: string
  ends_at: string | null
  rotation_group: string | null
  rotation_weight: number | null
  advertiser_accounts: { business_name: string } | null
}

export default function AdminAdsPage() {
  const [ads, setAds]               = useState<AdPlacement[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')

  // Service-role list endpoint — bypasses RLS on advertiser_accounts so
  // joined rows always come back (the old anon client returned 0 rows
  // here whenever the joined advertiser was RLS-hidden).
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

  const ctr = (imp: number, clk: number) =>
    imp > 0 ? ((clk / imp) * 100).toFixed(1) + '%' : '—'

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--ed-font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Ad Placements</h1>
          <p style={{ color: '#666', marginTop: 4, fontSize: 14 }}>{ads.length} placements</p>
        </div>
        <Link href="/admin/ads/new" style={{ padding: '8px 16px', backgroundColor: '#C4622D', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          + New Ad Placement
        </Link>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 240 }}>
          <option value="">All placement types</option>
          {placementGroups.map(group => (
            <optgroup key={group.surface} label={group.label}>
              {group.entries.map(p => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
          <strong>Load failed:</strong> {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                {['Placement', 'Context', 'Advertiser', 'Headline', 'Active', 'Impr.', 'Clicks', 'CTR', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const def = findPlacementType(ad.placement_type)
                      return def ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{def.label}</div>
                          <code style={{ fontSize: 10, color: '#888' }}>{ad.placement_type}</code>
                        </div>
                      ) : (
                        <code style={{ fontSize: 11, backgroundColor: '#fff0e7', color: '#a44', padding: '2px 6px', borderRadius: 4 }}>
                          {ad.placement_type} ⚠️
                        </code>
                      )
                    })()}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#666', fontSize: 12 }}>
                    {ad.context_slug ?? ad.context_type ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {(ad.advertiser_accounts as { business_name?: string } | null)?.business_name ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ad.ad_headline ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={() => toggleActive(ad.id, ad.is_active)}
                      style={{ padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: ad.is_active ? '#d4edda' : '#f8d7da', color: ad.is_active ? '#155724' : '#721c24' }}
                    >
                      {ad.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{ad.impression_count.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{ad.click_count.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{ctr(ad.impression_count, ad.click_count)}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    <Link href={`/admin/ads/${ad.id}/edit`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12, marginRight: 8 }}>Edit</Link>
                    <button onClick={() => deleteAd(ad.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </td>
                </tr>
              ))}
              {ads.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No ad placements yet. <Link href="/admin/ads/new">Create one →</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
