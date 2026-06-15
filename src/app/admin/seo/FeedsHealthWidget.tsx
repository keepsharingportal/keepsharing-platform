'use client'

import { useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, RotateCw } from 'lucide-react'

interface FeedCheck {
  feed:       'sitemap' | 'news-sitemap' | 'image-sitemap' | 'feed'
  url:        string
  status:     number
  entryCount: number
  ok:         boolean
  sample?:    string
  error?:     string
}

export function FeedsHealthWidget() {
  const [busy,    setBusy]    = useState(false)
  const [results, setResults] = useState<FeedCheck[] | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [ranAt,   setRanAt]   = useState<string | null>(null)

  async function run() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/feeds-healthcheck', { cache: 'no-store' })
      const j   = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Check failed')
      setResults(j.results as FeedCheck[])
      setRanAt(j.ranAt as string)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity size={14} className="text-portal-blue" />
          <strong className="text-[13px] text-portal-text">Sitemap + feed health</strong>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50"
        >
          <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Checking…' : 'Run check'}
        </button>
      </div>
      <p className="text-[12px] text-portal-sub leading-relaxed mb-0">
        Hits this brand&apos;s own sitemap.xml, news-sitemap.xml, image-sitemap.xml, and feed.xml
        and confirms each one returns a 200 with entries. Catches the &quot;migration accidentally
        emptied the feed&quot; regression class instantly.
      </p>

      {error && (
        <div className="mt-3 p-2.5 bg-portal-red-lt text-portal-red rounded text-[12px] inline-flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {results && (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {results.map(r => (
            <div key={r.feed}
              className={`p-2.5 rounded border ${r.ok ? 'border-portal-green bg-portal-green-lt' : 'border-portal-red bg-portal-red-lt'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {r.ok
                  ? <CheckCircle2 size={12} className="text-portal-green" />
                  : <AlertTriangle size={12} className="text-portal-red" />
                }
                <strong className="text-[12px] text-portal-text">/{r.feed}.xml</strong>
              </div>
              <div className="text-[11px] text-portal-sub">
                Status: <strong>{r.status || '—'}</strong> · Entries: <strong>{r.entryCount}</strong>
              </div>
              {r.error && (
                <div className="text-[11px] text-portal-red mt-1">{r.error}</div>
              )}
              {!r.error && r.sample && (
                <div className="text-[11px] text-portal-sub mt-1 break-all">
                  sample: {r.sample.length > 60 ? r.sample.slice(0, 60) + '…' : r.sample}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ranAt && (
        <div className="text-[10px] text-portal-sub mt-1.5">
          Last checked: {new Date(ranAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
