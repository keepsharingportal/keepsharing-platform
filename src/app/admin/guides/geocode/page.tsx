'use client'

import { useState, useEffect } from 'react'
import { MapPin, RefreshCw, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Listing = {
  id: string
  slug: string
  business_name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
}

type GeocodeResult = {
  id: string
  status: 'pending' | 'running' | 'ok' | 'error'
  lat?: number
  lng?: number
  error?: string
}

export default function GeocodePage() {
  const [listings, setListings]   = useState<Listing[]>([])
  const [loading, setLoading]     = useState(true)
  const [results, setResults]     = useState<Record<string, GeocodeResult>>({})
  const [running, setRunning]     = useState(false)
  const [progress, setProgress]   = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/guides/geocode')
      if (res.ok) setListings(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const geocodeSingle = async (listing: Listing): Promise<GeocodeResult> => {
    setResults(prev => ({ ...prev, [listing.id]: { id: listing.id, status: 'running' } }))
    try {
      const res = await fetch('/api/guides/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:      listing.id,
          address: listing.address ?? undefined,
          city:    listing.city ?? undefined,
          state:   listing.state ?? undefined,
          zip:     listing.zip ?? undefined,
        }),
      })
      const data = await res.json() as { id: string; lat?: number; lng?: number; error?: string }
      const result: GeocodeResult = res.ok
        ? { id: listing.id, status: 'ok', lat: data.lat, lng: data.lng }
        : { id: listing.id, status: 'error', error: data.error }
      setResults(prev => ({ ...prev, [listing.id]: result }))
      return result
    } catch (e) {
      const result: GeocodeResult = { id: listing.id, status: 'error', error: String(e) }
      setResults(prev => ({ ...prev, [listing.id]: result }))
      return result
    }
  }

  const runAll = async () => {
    setRunning(true)
    setProgress(0)
    const pending = listings.filter(l => !results[l.id] || results[l.id].status === 'error')

    for (let i = 0; i < pending.length; i++) {
      await geocodeSingle(pending[i])
      setProgress(Math.round(((i + 1) / pending.length) * 100))
      // Rate limit: 10 requests/second → 100ms delay
      await new Promise(r => setTimeout(r, 120))
    }

    setRunning(false)
    // Reload to show remaining ungeocoded
    await load()
  }

  const ok     = Object.values(results).filter(r => r.status === 'ok').length
  const errors = Object.values(results).filter(r => r.status === 'error').length

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text">Summer Guide Geocoding</h1>
          </div>
          <p className="text-xs text-portal-sub mt-0.5">
            Batch geocode listings missing latitude/longitude via Google Maps API
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-xs text-portal-sub border border-portal-border rounded-lg hover:bg-portal-bg">
            <RefreshCw size={12} /> Reload
          </button>
          <button
            onClick={runAll}
            disabled={running || listings.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? `Geocoding… ${progress}%` : `Geocode All (${listings.length})`}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-portal-border p-4 text-center">
            <div className="text-2xl font-bold text-portal-text">{listings.length}</div>
            <div className="text-xs text-portal-sub mt-0.5">Need Geocoding</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{ok}</div>
            <div className="text-xs text-green-600 mt-0.5">Geocoded This Session</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <div className="text-2xl font-bold text-portal-red">{errors}</div>
            <div className="text-xs text-red-500 mt-0.5">Failed</div>
          </div>
        </div>

        {/* Progress bar */}
        {running && (
          <div className="bg-white rounded-xl border border-portal-border p-4">
            <div className="flex items-center justify-between text-xs text-portal-sub mb-2">
              <span>Processing listings…</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-portal-navy rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-portal-muted mt-2">
              Sending 1 request per 120ms to stay within Google&apos;s rate limits.
            </p>
          </div>
        )}

        {/* API key warning */}
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <div className="bg-portal-amber-lt border border-amber-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-portal-amber mb-1">Google Maps API key not configured</div>
            <p className="text-xs text-portal-amber">
              Add <code className="bg-portal-amber-lt px-1 rounded">GOOGLE_MAPS_API_KEY</code> (server-side) or{' '}
              <code className="bg-portal-amber-lt px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to .env.local.
              The geocoding API uses the server-side key for security.
            </p>
          </div>
        )}

        {/* Listing table */}
        <div className="bg-white rounded-xl border border-portal-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-portal-muted flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading listings…
            </div>
          ) : listings.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-400 mb-3" />
              <div className="text-sm font-semibold text-portal-text">All listings are geocoded!</div>
              <p className="text-xs text-portal-muted mt-1">Every listing in the Summer Fun Guide has latitude/longitude data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-portal-bg border-b border-portal-border">
                  <tr>
                    {['Business Name', 'Address', 'City', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-portal-sub uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {listings.map(l => {
                    const r = results[l.id]
                    return (
                      <tr key={l.id} className="hover:bg-portal-bg">
                        <td className="px-4 py-2.5 font-medium text-portal-text">{l.business_name}</td>
                        <td className="px-4 py-2.5 text-portal-sub">{l.address ?? '—'}</td>
                        <td className="px-4 py-2.5 text-portal-sub">{l.city ?? '—'}, {l.state ?? 'AL'} {l.zip ?? ''}</td>
                        <td className="px-4 py-2.5">
                          {!r && <span className="text-portal-muted">Pending</span>}
                          {r?.status === 'running' && (
                            <span className="flex items-center gap-1 text-portal-blue">
                              <Loader2 size={11} className="animate-spin" /> Geocoding…
                            </span>
                          )}
                          {r?.status === 'ok' && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 size={11} /> {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                            </span>
                          )}
                          {r?.status === 'error' && (
                            <span className="flex items-center gap-1 text-portal-red" title={r.error}>
                              <AlertCircle size={11} /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => geocodeSingle(l)}
                            disabled={running || r?.status === 'running'}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-40',
                              r?.status === 'error'
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-white text-portal-sub border-portal-border hover:bg-portal-bg'
                            )}
                          >
                            {r?.status === 'error' ? 'Retry' : 'Geocode'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
