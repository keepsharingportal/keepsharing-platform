'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, RotateCw, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface BatchResult {
  processed: number
  saved:     number
  errors:    number
  results: Array<{
    articleId:        string
    seoTitle:         string
    seoDescription:   string
    seoFocusKeyword:  string
    error?:           string
  }>
}

export function BulkSeederClient({ brandSlug, initialQueueSize }: { brandSlug: string | null; initialQueueSize: number }) {
  const router = useRouter()
  const [queueSize, setQueueSize] = useState(initialQueueSize)
  const [batches,   setBatches]   = useState<BatchResult[]>([])
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [auto,      setAuto]      = useState(false)

  async function runBatch() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/bulk-seeder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand_slug: brandSlug, batch_size: 5 }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'batch failed'); return }
      setBatches(b => [j as BatchResult, ...b])
      setQueueSize(Math.max(0, queueSize - (j.saved ?? 0)))
      router.refresh()
      // Auto-continue if enabled and queue not empty.
      if (auto && queueSize - (j.saved ?? 0) > 0 && (j.saved ?? 0) > 0) {
        setTimeout(runBatch, 500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-portal-text">Run seeder</h2>
          <p className="text-[12px] text-portal-sub mt-0.5">Processes 5 articles per batch. ~30-60s each.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[12px] text-portal-sub cursor-pointer">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
            Auto-continue until empty
          </label>
          <button
            type="button" onClick={runBatch} disabled={busy || queueSize === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <RotateCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {busy ? 'Seeding…' : queueSize === 0 ? 'Queue empty' : `Run next batch (${Math.min(5, queueSize)} of ${queueSize})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-portal-red-lt text-portal-red border border-portal-red rounded p-2 text-[12px] inline-flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {batches.length > 0 && (
        <div className="border-t border-portal-border pt-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Batch log</div>
          {batches.map((b, i) => (
            <div key={i} className="bg-portal-bg rounded p-3 text-[12px]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={12} className="text-portal-green" />
                <strong className="text-portal-text">
                  Batch {batches.length - i}: {b.saved}/{b.processed} saved
                </strong>
                {b.errors > 0 && (
                  <span className="text-[10px] text-portal-red">{b.errors} errors</span>
                )}
              </div>
              <ul className="space-y-1">
                {b.results.map((r, j) => (
                  <li key={j} className="flex items-start gap-2 text-[11px]">
                    {r.error
                      ? <AlertTriangle size={10} className="text-portal-red shrink-0 mt-0.5" />
                      : <CheckCircle2 size={10} className="text-portal-green shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <a href={`/admin/articles/${r.articleId}/seo`} className="text-portal-blue font-bold hover:underline">
                        {r.seoTitle || r.articleId}
                      </a>
                      {r.seoDescription && <div className="text-portal-sub mt-0.5">{r.seoDescription}</div>}
                      {r.error && <div className="text-portal-red mt-0.5">⚠ {r.error}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
