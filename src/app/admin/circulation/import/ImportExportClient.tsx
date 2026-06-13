'use client'

// Client component for /admin/circulation/import.
// Mirrors admin/import.php: Export card (route picker + CSV/JSON buttons)
// + Import card (CSV upload OR JSON paste) + per-route summary table at
// the bottom. POST goes to existing /api/admin/circulation/import which
// upserts by (market, route_id, sort_order, name).

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDownToLine, MapPin } from 'lucide-react'

interface PubRow      { id: string; short_name: string; abbrev: string; color_hex: string; sort_order: number }
interface RouteLite   { id: string; name: string }
interface RouteSummary {
  id: string
  name: string
  stopCount: number
  geocoded:  number
  perPub:    Record<string, number>
}

interface Props {
  market:         string
  pubs:           PubRow[]
  routes:         RouteLite[]
  routesSummary:  RouteSummary[]
  totalStops:     number
  totalGeocoded:  number
}

export function ImportExportClient({ market, pubs, routes, routesSummary, totalStops, totalGeocoded }: Props) {
  const router = useRouter()
  const [exportRoute, setExportRoute] = useState<string>('')
  const [csvFile,     setCsvFile]     = useState<File | null>(null)
  const [jsonText,    setJsonText]    = useState('')
  const [busy,        setBusy]        = useState(false)
  const [result,      setResult]      = useState<{ ok: boolean; message: string } | null>(null)

  function exportLink(format: 'csv' | 'json'): string {
    const params = new URLSearchParams({ market, format })
    if (exportRoute) params.set('route_id', exportRoute)
    return `/api/admin/circulation/export?${params.toString()}`
  }

  async function submitImport() {
    setBusy(true)
    setResult(null)
    try {
      let res: Response
      if (csvFile) {
        const form = new FormData()
        form.append('file',   csvFile)
        form.append('market', market)
        res = await fetch('/api/admin/circulation/import', { method: 'POST', body: form })
      } else if (jsonText.trim()) {
        // Validate JSON client-side first so we give a friendlier error
        // than whatever Supabase returns.
        let parsed: unknown
        try { parsed = JSON.parse(jsonText) }
        catch { setResult({ ok: false, message: 'Invalid JSON.' }); setBusy(false); return }
        const stops = Array.isArray(parsed) ? parsed : (parsed as { stops?: unknown }).stops
        if (!Array.isArray(stops)) {
          setResult({ ok: false, message: 'JSON must be an array of stops (or { stops: [...] }).' })
          setBusy(false); return
        }
        res = await fetch('/api/admin/circulation/import', {
          method:  'POST',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ stops, market }),
        })
      } else {
        setResult({ ok: false, message: 'Pick a CSV file or paste JSON first.' })
        setBusy(false); return
      }
      const j = await res.json().catch(() => ({})) as {
        routesUpserted?: number; stopsUpserted?: number; geocoded?: number; skipped?: number; error?: string
      }
      if (!res.ok || j.error) {
        setResult({ ok: false, message: j.error ?? 'Import failed.' })
        return
      }
      const parts: string[] = []
      if (typeof j.stopsUpserted === 'number')  parts.push(`${j.stopsUpserted.toLocaleString()} stop${j.stopsUpserted === 1 ? '' : 's'} added/updated`)
      if (typeof j.routesUpserted === 'number') parts.push(`${j.routesUpserted} route${j.routesUpserted === 1 ? '' : 's'} matched`)
      if (typeof j.skipped === 'number' && j.skipped > 0) parts.push(`${j.skipped} skipped`)
      setResult({ ok: true, message: `Import complete — ${parts.join(', ')}.` })
      setCsvFile(null)
      setJsonText('')
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Import &amp; Export Stops</h1>
        </div>
        <div className="ph-actions">
          <Link href="/admin/circulation/geocode" className="btn btn-ghost btn-sm">
            <MapPin size={14} /> Geocode stops
          </Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {result && (
          <div className={`alert ${result.ok ? 'alert-success' : 'alert-error'}`}>
            {result.message}
          </div>
        )}

        <div className="grid-2 mb-4">

          {/* ── Export card ── */}
          <div className="card">
            <div className="card-title mb-3">Export stops</div>
            <p className="text-sub text-sm" style={{ marginBottom: 12 }}>
              <strong>{totalStops.toLocaleString()}</strong> stops &middot;{' '}
              <strong>{totalGeocoded.toLocaleString()}</strong> geocoded. Download includes all fields —
              quantities, GPS coordinates, social links, contact info.
            </p>
            <div className="fg">
              <label>Route (optional)</label>
              <select value={exportRoute} onChange={e => setExportRoute(e.target.value)}>
                <option value="">All routes</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <a href={exportLink('csv')}  className="btn btn-primary">
                <ArrowDownToLine size={14} /> Download CSV (Excel)
              </a>
              <a href={exportLink('json')} className="btn btn-ghost">
                <ArrowDownToLine size={14} /> Download JSON
              </a>
            </div>
            <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 12 }}>
              Export &rarr; edit in Excel &rarr; re-import. GPS coordinates preserved so geocoding is never lost.
            </p>
          </div>

          {/* ── Import card ── */}
          <div className="card">
            <div className="card-title mb-3">Import stops</div>
            <p className="text-sub text-sm" style={{ marginBottom: 12 }}>
              Upload CSV or paste JSON. Existing stops are <strong>updated</strong> (matched by route + name),
              new ones added. Nothing deleted.
            </p>
            <div className="fg">
              <label>Upload CSV file</label>
              <input
                type="file"
                accept=".csv,application/json,.json"
                onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                style={{ padding: 6 }}
              />
              <div className="hint">Export first, edit in Excel, save as CSV, upload here.</div>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--color-portal-muted)', fontSize: 12, margin: '8px 0' }}>
              — or paste JSON below —
            </div>
            <div className="fg">
              <textarea
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                style={{
                  height: 160, fontFamily: 'ui-monospace, monospace', fontSize: 12,
                  width: '100%', padding: 10,
                  border: '1.5px solid var(--color-portal-border-2)', borderRadius: 8,
                }}
                placeholder='[{"route":"Prattville","name":"Chappys","rrp":25,"boom":25}]'
              />
            </div>
            <button
              type="button"
              onClick={submitImport}
              disabled={busy || (!csvFile && !jsonText.trim())}
              className="btn btn-primary"
            >
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>

        {/* ── Routes summary ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-portal-border)' }}>
            <span className="card-title">Routes summary</span>
            <Link href="/admin/circulation/geocode" className="btn btn-ghost btn-sm">
              <MapPin size={14} /> Geocode stops
            </Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th style={{ textAlign: 'center' }}>Stops</th>
                {pubs.map(p => <th key={p.id} style={{ textAlign: 'center' }}>{p.abbrev}</th>)}
                <th style={{ textAlign: 'center' }}>Geocoded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {routesSummary.length === 0 && (
                <tr><td colSpan={3 + pubs.length + 1} style={{ textAlign: 'center', padding: 24, color: 'var(--color-portal-sub)' }}>
                  No active routes in this region yet.
                </td></tr>
              )}
              {routesSummary.map(r => {
                const allGeo = r.stopCount > 0 && r.geocoded >= r.stopCount
                const cls    = allGeo ? 'badge-green' : (r.geocoded > 0 ? 'badge-amber' : 'badge-gray')
                return (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td className="mono" style={{ textAlign: 'center' }}>{r.stopCount}</td>
                    {pubs.map(p => (
                      <td key={p.id} className="mono" style={{ textAlign: 'center', color: p.color_hex }}>
                        {r.perPub[p.short_name] ?? 0}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${cls}`}>{r.geocoded}/{r.stopCount}</span>
                    </td>
                    <td>
                      <a href={`/api/admin/circulation/export?market=${market}&format=csv&route_id=${r.id}`}  className="btn btn-ghost btn-xs">
                        <ArrowDownToLine size={10} /> CSV
                      </a>{' '}
                      <a href={`/api/admin/circulation/export?market=${market}&format=json&route_id=${r.id}`} className="btn btn-ghost btn-xs">
                        <ArrowDownToLine size={10} /> JSON
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
