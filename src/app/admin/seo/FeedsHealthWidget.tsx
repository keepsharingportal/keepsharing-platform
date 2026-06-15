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
    <div className="card" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color="var(--color-portal-blue)" />
          <strong className="text-portal-text" style={{ fontSize: 13 }}>Sitemap + feed health</strong>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Checking…' : 'Run check'}
        </button>
      </div>
      <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
        Hits this brand&apos;s own sitemap.xml, news-sitemap.xml, image-sitemap.xml, and feed.xml
        and confirms each one returns a 200 with entries. Catches the &quot;migration accidentally
        emptied the feed&quot; regression class instantly.
      </p>

      {error && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--color-portal-red-lt, #fee2e2)', borderRadius: 6, fontSize: 12, color: 'var(--color-portal-red)' }}>
          <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {results.map(r => (
            <div key={r.feed} style={{
              padding: 10,
              border: '1px solid var(--color-portal-border)',
              borderRadius: 6,
              background: r.ok ? 'var(--color-portal-green-lt, #ecfdf5)' : 'var(--color-portal-red-lt, #fee2e2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {r.ok
                  ? <CheckCircle2 size={12} color="var(--color-portal-green)" />
                  : <AlertTriangle size={12} color="var(--color-portal-red)" />
                }
                <strong className="text-portal-text" style={{ fontSize: 12 }}>/{r.feed}.xml</strong>
              </div>
              <div className="text-portal-sub" style={{ fontSize: 11, lineHeight: 1.5 }}>
                Status: <strong>{r.status || '—'}</strong> · Entries: <strong>{r.entryCount}</strong>
              </div>
              {r.error && (
                <div style={{ fontSize: 11, color: 'var(--color-portal-red)', marginTop: 4 }}>{r.error}</div>
              )}
              {!r.error && r.sample && (
                <div className="text-portal-sub" style={{ fontSize: 11, marginTop: 4, wordBreak: 'break-all' }}>
                  sample: {r.sample.length > 60 ? r.sample.slice(0, 60) + '…' : r.sample}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ranAt && (
        <div className="text-portal-sub" style={{ fontSize: 10, marginTop: 6 }}>
          Last checked: {new Date(ranAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
