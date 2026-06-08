'use client'

// ⚠️  DEMO DATA PAGE — Numbers below are fabricated for UI development.
// Real ad tracking lives in the ad_placements table (migration 035).
// Visit /admin/ads for live impression_count + click_count data.
// This page will be migrated to real ad_placements queries in Phase 3.

import { useState, useRef } from 'react'
import { Monitor, Plus, Filter, BarChart2, ExternalLink, Upload, X, Check, Eye, EyeOff, Trash2, ChevronDown } from 'lucide-react'
import { MOCK_ADS, AD_ZONES, getMockClicksByZone, type AdRecord } from '@/lib/mock-ads'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PUBLICATIONS = ['RRP', 'MBP', 'AOP', 'ESP', 'GPP', 'RRB']

const ZONE_COLORS: Record<string, string> = {
  'header-leaderboard':   'bg-portal-blue-lt text-portal-blue ring-portal-blue/30',
  'article-inline-top':   'bg-portal-green-lt text-portal-green ring-portal-green/30',
  'article-inline-mid':   'bg-portal-green-lt text-portal-green ring-portal-green/30',
  'article-inline-bottom':'bg-portal-blue-lt text-portal-blue ring-portal-blue/30',
  'guide-sidebar':        'bg-portal-amber-lt text-portal-amber ring-portal-amber/30',
  'email-banner':         'bg-portal-red-lt text-portal-red border-portal-red/30',
  'event-sponsor':        'bg-portal-amber-lt text-portal-amber border-portal-amber/30',
}

const TABS = ['Active Ads', 'Upload New', 'Analytics', 'Zones']

export default function AdServerPage() {
  const [activeTab, setActiveTab]     = useState('Active Ads')
  const [ads, setAds]                 = useState<AdRecord[]>(MOCK_ADS)
  const [filterZone, setFilterZone]   = useState<string>('all')
  const [filterPub, setFilterPub]     = useState<string>('all')
  const [selectedAd, setSelectedAd]   = useState<AdRecord | null>(null)
  const fileRef                       = useRef<HTMLInputElement>(null)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    businessName: '', zone: 'header-leaderboard', publication: 'RRP',
    destinationUrl: '', startDate: '', endDate: '', imageFile: null as File | null,
  })
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const filtered = ads.filter((ad) => {
    if (filterZone !== 'all' && ad.zone !== filterZone) return false
    if (filterPub !== 'all' && ad.publication !== filterPub) return false
    return true
  })

  const totalClicks      = filtered.reduce((s, a) => s + a.totalClicks, 0)
  const totalImpressions = filtered.reduce((s, a) => s + a.totalImpressions, 0)
  const zoneStats        = getMockClicksByZone('RRP')

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    // Simulate upload delay
    await new Promise((r) => setTimeout(r, 1200))
    const newAd: AdRecord = {
      id:               `ad${Date.now()}`,
      businessName:     uploadForm.businessName,
      publication:      uploadForm.publication,
      zone:             uploadForm.zone,
      imageUrl:         uploadPreview,
      destinationUrl:   uploadForm.destinationUrl,
      startDate:        uploadForm.startDate,
      endDate:          uploadForm.endDate,
      active:           true,
      totalClicks:      0,
      totalImpressions: 0,
      createdAt:        new Date().toISOString().slice(0,10),
    }
    setAds((prev) => [newAd, ...prev])
    setUploading(false)
    setUploadSuccess(true)
    setTimeout(() => { setUploadSuccess(false); setActiveTab('Active Ads') }, 2000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Demo Data Warning Banner */}
      <div className="bg-portal-amber-lt border-b border-portal-amber/30 px-6 py-2 flex items-center justify-between shrink-0">
        <p className="text-xs font-semibold text-portal-amber">
          ⚠️ Demo Data — Numbers on this page are fabricated for UI development, not real tracking.
        </p>
        <a href="/admin/ads" className="text-xs font-bold text-portal-amber hover:underline shrink-0">
          View real ad data at /admin/ads →
        </a>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-portal-text">Ad Server</h1>
          <span className="text-sm font-semibold text-portal-blue bg-portal-blue-lt px-2.5 py-0.5 rounded-full ring-1 ring-portal-blue/30">
            {ads.filter((a) => a.active).length} active
          </span>
          <span className="text-xs font-semibold text-portal-amber bg-portal-amber-lt px-2 py-0.5 rounded border border-portal-amber/30">Demo Data</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-portal-sub">{totalImpressions.toLocaleString()} impressions</span>
          <span className="text-portal-border-2">·</span>
          <span className="font-semibold text-portal-text">{totalClicks.toLocaleString()} clicks</span>
          <span className="text-portal-border-2">·</span>
          <span className="text-portal-sub">{totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'}% CTR</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-portal-border px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? 'text-portal-blue border-portal-blue' : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
              }`}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* ── Active Ads Tab ───────────────────────────────── */}
      {activeTab === 'Active Ads' && (
        <>
          {/* Toolbar */}
          <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center gap-3 shrink-0">
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
              className="text-sm text-portal-text border border-portal-border-2 rounded-lg px-3 py-1.5 outline-none focus:border-portal-blue">
              <option value="all">All Zones</option>
              {AD_ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <select value={filterPub} onChange={(e) => setFilterPub(e.target.value)}
              className="text-sm text-portal-text border border-portal-border-2 rounded-lg px-3 py-1.5 outline-none focus:border-portal-blue">
              <option value="all">All Publications</option>
              {PUBLICATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="ml-auto">
              <button onClick={() => setActiveTab('Upload New')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors">
                <Plus size={14} /> Upload Ad
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-portal-bg border-b border-portal-border z-10">
                <tr>
                  {['Ad', 'Zone', 'Publication', 'Active Dates', 'Clicks', 'Impr.', 'CTR', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-portal-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {filtered.map((ad) => {
                  const zone = AD_ZONES.find((z) => z.id === ad.zone)
                  const ctr  = ad.totalImpressions > 0 ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2) : '0.00'
                  const isExpired = ad.endDate && new Date(ad.endDate) < new Date()

                  return (
                    <tr key={ad.id} className="hover:bg-portal-bg cursor-pointer transition-colors group" onClick={() => setSelectedAd(ad)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Ad thumbnail placeholder */}
                          <div
                            className="rounded border border-portal-border bg-portal-bg flex items-center justify-center text-portal-border-2 shrink-0"
                            style={{ width: zone ? Math.min(zone.width / 6, 72) : 48, height: zone ? Math.min(zone.height / 6, 36) : 24 }}
                          >
                            <Monitor size={12} />
                          </div>
                          <div>
                            <div className="font-medium text-portal-text group-hover:text-portal-blue transition-colors">{ad.businessName}</div>
                            <div className="text-xs text-portal-muted mt-0.5 truncate max-w-[160px]">{ad.destinationUrl}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${ZONE_COLORS[ad.zone] ?? 'bg-portal-bg text-portal-sub border-portal-border'}`}>
                          {zone?.name ?? ad.zone}
                        </span>
                        {zone && <div className="text-[10px] text-portal-muted mt-0.5">{zone.width}×{zone.height}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-portal-text">{ad.publication}</td>
                      <td className="px-4 py-3 text-xs text-portal-sub whitespace-nowrap">
                        <div>{ad.startDate}</div>
                        <div className="text-portal-border-2">→ {ad.endDate}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-portal-text">{ad.totalClicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-portal-sub">{ad.totalImpressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-portal-sub">{ctr}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${
                          isExpired ? 'bg-portal-red-lt text-portal-red ring-portal-red/30' :
                          ad.active ? 'bg-portal-green-lt text-portal-green ring-portal-green/30' :
                          'bg-portal-bg text-portal-sub border-portal-border'
                        }`}>
                          {isExpired ? 'Expired' : ad.active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/api/ads/click/${ad.id}?dest=${encodeURIComponent(ad.destinationUrl)}`}
                          target="_blank" onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded text-portal-muted hover:text-portal-sub hover:bg-portal-row-hover transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Upload Tab ──────────────────────────────────── */}
      {activeTab === 'Upload New' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            {uploadSuccess ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-lg bg-portal-green-lt border border-portal-green/30 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-portal-green" />
                </div>
                <h2 className="text-lg font-semibold text-portal-text">Ad Uploaded!</h2>
                <p className="text-sm text-portal-sub mt-1">Returning to Active Ads…</p>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-5">
                <h2 className="text-lg font-semibold text-portal-text">Upload New Ad</h2>

                {/* Drop zone */}
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-portal-border rounded-lg p-8 text-center cursor-pointer hover:border-portal-border-2 hover:bg-portal-blue-lt transition-colors">
                  {uploadPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={uploadPreview} alt="Preview" className="max-h-32 object-contain rounded" />
                      <p className="text-xs text-portal-blue font-medium">{uploadForm.imageFile?.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} className="text-portal-muted mx-auto mb-2" />
                      <p className="text-sm font-medium text-portal-text">Click to upload ad graphic</p>
                      <p className="text-xs text-portal-muted mt-1">WebP preferred · JPG/PNG accepted · Max 100KB</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/webp,image/jpeg,image/png" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setUploadForm((p) => ({ ...p, imageFile: f }))
                      const reader = new FileReader()
                      reader.onload = (ev) => setUploadPreview(ev.target?.result as string)
                      reader.readAsDataURL(f)
                    }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">Advertiser / Business Name</label>
                    <input type="text" required value={uploadForm.businessName}
                      onChange={(e) => setUploadForm((p) => ({ ...p, businessName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue focus:ring-2 focus:ring-portal-blue/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">Ad Zone</label>
                    <select value={uploadForm.zone} onChange={(e) => setUploadForm((p) => ({ ...p, zone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue">
                      {AD_ZONES.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.width}×{z.height})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">Publication</label>
                    <select value={uploadForm.publication} onChange={(e) => setUploadForm((p) => ({ ...p, publication: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue">
                      {PUBLICATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">Destination URL</label>
                    <input type="url" required value={uploadForm.destinationUrl}
                      onChange={(e) => setUploadForm((p) => ({ ...p, destinationUrl: e.target.value }))}
                      placeholder="https://advertiserwebsite.com"
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue focus:ring-2 focus:ring-portal-blue/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">Start Date</label>
                    <input type="date" required value={uploadForm.startDate}
                      onChange={(e) => setUploadForm((p) => ({ ...p, startDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-portal-text mb-1.5">End Date</label>
                    <input type="date" required value={uploadForm.endDate}
                      onChange={(e) => setUploadForm((p) => ({ ...p, endDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue" />
                  </div>
                </div>

                <button type="submit" disabled={uploading}
                  className="w-full py-3 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors disabled:opacity-60">
                  {uploading ? 'Uploading…' : 'Upload Ad'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics Tab ────────────────────────────────── */}
      {activeTab === 'Analytics' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-portal-text mb-3">Clicks by Zone — RRP All Time</h2>
            <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-portal-bg border-b border-portal-border">
                  <tr>
                    {['Zone', '# Ads', 'Total Clicks', 'Impressions', 'Avg CTR'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-portal-sub uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {zoneStats.map((row) => (
                    <tr key={row.zone} className="hover:bg-portal-bg">
                      <td className="px-4 py-3 font-medium text-portal-text">{row.zone}</td>
                      <td className="px-4 py-3 text-portal-sub">{row.ads}</td>
                      <td className="px-4 py-3 font-semibold text-portal-text">{row.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-portal-sub">{row.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-portal-sub">{row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-portal-text mb-3">Per-Advertiser Performance</h2>
            <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-portal-bg border-b border-portal-border">
                  <tr>
                    {['Advertiser', 'Zone', 'Pub', 'Clicks', 'Impressions', 'CTR', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-portal-sub uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {ads.sort((a, b) => b.totalClicks - a.totalClicks).map((ad) => {
                    const ctr = ad.totalImpressions > 0 ? ((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2) : '0.00'
                    return (
                      <tr key={ad.id} className="hover:bg-portal-bg">
                        <td className="px-4 py-3 font-medium text-portal-text">{ad.businessName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${ZONE_COLORS[ad.zone] ?? 'bg-portal-bg text-portal-sub border-portal-border'}`}>
                            {AD_ZONES.find((z) => z.id === ad.zone)?.name ?? ad.zone}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-portal-sub">{ad.publication}</td>
                        <td className="px-4 py-3 font-semibold text-portal-text">{ad.totalClicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-portal-sub">{ad.totalImpressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-portal-sub">{ctr}%</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium ring-1 bg-portal-green-lt text-portal-green ring-portal-green/30">Active</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Zones Tab ────────────────────────────────────── */}
      {activeTab === 'Zones' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AD_ZONES.map((zone) => {
              const zoneAds = ads.filter((a) => a.zone === zone.id)
              return (
                <div key={zone.id} className="bg-white rounded-lg border border-portal-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-portal-text">{zone.name}</h3>
                      <p className="text-xs text-portal-sub mt-0.5">{zone.position}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ring-1 ${ZONE_COLORS[zone.id] ?? 'bg-portal-bg text-portal-sub border-portal-border'}`}>
                      {zoneAds.length} ads
                    </span>
                  </div>
                  {zone.width > 0 && (
                    <div
                      className="rounded border border-portal-border bg-portal-bg flex items-center justify-center text-xs text-portal-muted font-mono mb-3"
                      style={{ width: '100%', height: Math.min(zone.height / 4, 60) }}
                    >
                      {zone.width} × {zone.height} · max {zone.maxKb}KB
                    </div>
                  )}
                  <div className="text-xs text-portal-sub">
                    {zoneAds.map((a) => (
                      <div key={a.id} className="py-1 border-b border-gray-50 last:border-0 truncate">{a.businessName}</div>
                    ))}
                    {zoneAds.length === 0 && <div className="text-portal-border-2">No ads in this zone</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
