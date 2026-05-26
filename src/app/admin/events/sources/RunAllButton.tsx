'use client'

// Pulls every active iCal source in one shot. Shows the aggregate result.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, CheckCircle2 } from 'lucide-react'

interface SingleResult {
  source_name:       string
  total_in_feed:     number
  inserted:          number
  skipped_duplicate: number
  errors:            string[]
}

export function RunAllButton({ activeIcalCount }: { activeIcalCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy]   = useState(false)
  const [out, setOut]     = useState<{ total_inserted: number; results: SingleResult[] } | null>(null)

  async function run() {
    setBusy(true); setOut(null)
    try {
      const res = await fetch('/api/admin/events/ingest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source_id: 'all' }),
      })
      const json = await res.json().catch(() => ({}))
      setOut(json)
      startTransition(() => router.refresh())
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || pending || activeIcalCount === 0}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
        title={activeIcalCount === 0 ? 'No active iCal sources to run' : `Run ${activeIcalCount} iCal source(s) now`}
      >
        {busy ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
        Run all iCal sources ({activeIcalCount})
      </button>

      {out && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <p className="font-semibold flex items-center gap-1 mb-1">
            <CheckCircle2 size={12} /> Pulled from {out.results.length} source(s) · {out.total_inserted} new pending event(s)
          </p>
          <details>
            <summary className="cursor-pointer opacity-80">Per-source breakdown</summary>
            <ul className="mt-1 ml-3 list-disc space-y-0.5">
              {out.results.map((r, i) => (
                <li key={i}>
                  <strong>{r.source_name || '(unknown)'}:</strong> {r.inserted} new
                  {r.skipped_duplicate > 0 && <span className="opacity-70"> · {r.skipped_duplicate} dup</span>}
                  {r.errors?.length > 0 && <span className="text-rose-700"> · {r.errors.length} error(s)</span>}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}
