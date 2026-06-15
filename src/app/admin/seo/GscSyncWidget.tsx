'use client'

import { useState } from 'react'
import { RotateCw, CheckCircle2, AlertTriangle } from 'lucide-react'

interface SyncResult {
  ok:              boolean
  warning?:        string
  daysBack?:       number
  rowsImported?:   number
  sitesProcessed?: number
  errors?:         Array<{ site: string; error: string }>
}

export function GscSyncWidget({ configured }: { configured: boolean }) {
  const [daysBack, setDaysBack] = useState(28)
  const [busy,     setBusy]     = useState(false)
  const [result,   setResult]   = useState<SyncResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function run() {
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/seo/gsc-sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ daysBack }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Sync failed')
      setResult(j as SyncResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <strong className="text-portal-text" style={{ fontSize: 13 }}>Search Console sync</strong>
        {configured
          ? <span style={{ fontSize: 11, color: 'var(--color-portal-green)', fontWeight: 700 }}>● configured</span>
          : <span style={{ fontSize: 11, color: 'var(--color-portal-amber)', fontWeight: 700 }}>● not configured</span>
        }
      </div>
      <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
        Pulls per-page / per-query click + impression + position data from Google Search Console
        into <code>search_console_data</code>. The weekly audit reads this table to find page-2
        keywords ready to push to page 1.
      </p>

      {!configured && (
        <div style={{
          background: 'var(--color-portal-amber-lt, #fef3c7)',
          padding: 10, borderRadius: 6, fontSize: 12, lineHeight: 1.5, marginBottom: 10,
        }}>
          <strong>To activate:</strong>
          <ol style={{ paddingLeft: 18, marginTop: 6 }}>
            <li>Google Cloud → create a service account → download the JSON key</li>
            <li>In each GSC property → Users → add the service account email as &quot;Restricted&quot;</li>
            <li>On Vercel set <code>GSC_SERVICE_ACCOUNT_JSON</code> (full JSON, one line) and
              <code>GSC_SITE_URLS</code> (comma-separated, e.g. <code>https://riverregionparents.com,sc-domain:mobilebayparents.com</code>)</li>
          </ol>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label className="text-portal-sub" style={{ fontSize: 12 }}>Lookback (days)</label>
        <input
          type="number"
          min={1} max={90}
          value={daysBack}
          onChange={e => setDaysBack(Number(e.target.value))}
          style={{
            width: 70, padding: '4px 8px', border: '1px solid var(--color-portal-border)',
            borderRadius: 4, fontSize: 12,
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Syncing…' : 'Run sync now'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--color-portal-red-lt, #fee2e2)', borderRadius: 6, fontSize: 12, color: 'var(--color-portal-red)' }}>
          <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 10, padding: 10, background: result.warning ? 'var(--color-portal-amber-lt, #fef3c7)' : 'var(--color-portal-green-lt, #ecfdf5)', borderRadius: 6, fontSize: 12 }}>
          {result.warning ? (
            <>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--color-portal-amber)' }} />
              {result.warning}
            </>
          ) : (
            <>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--color-portal-green)' }} />
              <strong>{result.rowsImported?.toLocaleString() ?? 0}</strong> rows imported across{' '}
              <strong>{result.sitesProcessed ?? 0}</strong> sites over the last {result.daysBack} days.
              {(result.errors && result.errors.length > 0) && (
                <ul style={{ marginTop: 6, paddingLeft: 18, color: 'var(--color-portal-red)' }}>
                  {result.errors.map((e, i) => (
                    <li key={i}><code>{e.site}</code>: {e.error}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
