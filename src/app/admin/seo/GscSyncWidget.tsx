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
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <strong className="text-[13px] text-portal-text">Search Console sync</strong>
        {configured
          ? <span className="text-[11px] font-bold text-portal-green">● configured</span>
          : <span className="text-[11px] font-bold text-portal-amber">● not configured</span>
        }
      </div>
      <p className="text-[12px] text-portal-sub mb-3 leading-relaxed">
        Pulls per-page / per-query click + impression + position data from Google Search Console
        into <code className="text-portal-text">search_console_data</code>. The weekly audit reads this table to find page-2
        keywords ready to push to page 1.
      </p>

      {!configured && (
        <div className="bg-portal-amber-lt text-portal-text p-3 rounded-md text-[12px] mb-3 leading-relaxed">
          <strong>To activate:</strong>
          <ol className="pl-5 mt-1.5 space-y-1 list-decimal">
            <li>Google Cloud → create a service account → download the JSON key</li>
            <li>In each GSC property → Users → add the service account email as &quot;Restricted&quot;</li>
            <li>On Vercel set <code>GSC_SERVICE_ACCOUNT_JSON</code> (full JSON, one line) and <code>GSC_SITE_URLS</code> (comma-separated, e.g. <code>https://riverregionparents.com,sc-domain:mobilebayparents.com</code>)</li>
          </ol>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-[12px] text-portal-sub">Lookback (days)</label>
        <input
          type="number"
          min={1} max={90}
          value={daysBack}
          onChange={e => setDaysBack(Number(e.target.value))}
          className="w-[70px] px-2 py-1 border border-portal-border-2 rounded text-[12px] text-portal-text outline-none focus:border-portal-blue"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Syncing…' : 'Run sync now'}
        </button>
      </div>

      {error && (
        <div className="mt-3 p-2.5 bg-portal-red-lt text-portal-red rounded text-[12px] inline-flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {result && (
        <div className={`mt-3 p-2.5 rounded text-[12px] ${result.warning ? 'bg-portal-amber-lt text-portal-text' : 'bg-portal-green-lt text-portal-text'}`}>
          {result.warning ? (
            <>
              <AlertTriangle size={12} className="inline mr-1.5 text-portal-amber" />
              {result.warning}
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="inline mr-1.5 text-portal-green" />
              <strong>{result.rowsImported?.toLocaleString() ?? 0}</strong> rows imported across{' '}
              <strong>{result.sitesProcessed ?? 0}</strong> sites over the last {result.daysBack} days.
              {(result.errors && result.errors.length > 0) && (
                <ul className="mt-1.5 pl-5 text-portal-red space-y-0.5">
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
