'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

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
  advertiser_accounts: { business_name: string } | null
}

export default function AdminAdsPage() {
  const [ads, setAds]               = useState<AdPlacement[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterType, setFilterType] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function load() {
    setLoading(true)
    let q = supabase
      .from('ad_placements')
      .select('*, advertiser_accounts(business_name)')
      .order('is_active', { ascending: false })
      .order('display_priority', { ascending: false })

    if (filterType) q = q.eq('placement_type', filterType)
    const { data } = await q
    setAds((data ?? []) as AdPlacement[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterType])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('ad_placements').update({ is_active: !current }).eq('id', id)
    load()
  }

  async function deleteAd(id: string) {
    if (!confirm('Delete this ad placement?')) return
    await supabase.from('ad_placements').delete().eq('id', id)
    load()
  }

  const PLACEMENT_TYPES = [
    'guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 'guide_featured_strip',
    'article_header_sponsor', 'article_inline_recommendation', 'article_footer_listings',
    'calendar_featured_event', 'calendar_inline_promotion',
    'newsletter_sponsor', 'homepage_hero_rotator', 'site_footer_partners',
  ]

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
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="">All placement types</option>
          {PLACEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

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
                    <code style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{ad.placement_type}</code>
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
