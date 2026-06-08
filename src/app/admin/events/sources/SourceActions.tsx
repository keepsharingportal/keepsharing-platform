'use client'

// Per-row action buttons for the trusted event sources page.
// - Probe: try to auto-detect an iCal feed for the source.
// - Run ingestion: pull from the saved iCal feed and insert as pending events.
// Renders inline feedback below the buttons.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Radar, Download, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'

interface ProbeResult {
  found:         boolean
  ical_url:      string | null
  candidates:    string[]
  platform_hint: string | null
  notes:         string[]
}

interface IngestResult {
  source_name:       string
  total_in_feed:     number
  inserted:          number
  skipped_duplicate: number
  skipped_past:      number
  errors:            string[]
}

interface Props {
  sourceId:         string
  sourceName:       string
  eventsUrl:        string
  ingestionMethod:  string
  hasIcalUrl:       boolean
}

export function SourceActions({ sourceId, sourceName, eventsUrl, ingestionMethod, hasIcalUrl }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'probe' | 'ingest' | null>(null)
  const [probe, setProbe]   = useState<ProbeResult | null>(null)
  const [ingest, setIngest] = useState<IngestResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function runProbe() {
    setBusy('probe'); setErr(null); setProbe(null); setIngest(null)
    try {
      const res = await fetch('/api/admin/events/probe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source_id: sourceId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setProbe(json as ProbeResult)
      startTransition(() => router.refresh())
    } finally { setBusy(null) }
  }

  async function runIngest() {
    setBusy('ingest'); setErr(null); setProbe(null); setIngest(null)
    try {
      const res = await fetch('/api/admin/events/ingest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source_id: sourceId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      // Endpoint returns { results: [...] } for one or many sources
      const first = json?.results?.[0] as IngestResult | undefined
      if (first) setIngest(first)
      startTransition(() => router.refresh())
    } finally { setBusy(null) }
  }

  const showProbe   = !hasIcalUrl || ingestionMethod !== 'ical'
  const showIngest  = hasIcalUrl  && ingestionMethod === 'ical'
  const showExtract = ingestionMethod === 'ai-extract' || ingestionMethod === 'manual' || ingestionMethod === 'scrape'

  const extractHref = `/admin/events/extract?url=${encodeURIComponent(eventsUrl)}&source_id=${encodeURIComponent(sourceId)}&source_name=${encodeURIComponent(sourceName)}`

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {showProbe && (
          <button
            type="button"
            onClick={runProbe}
            disabled={busy !== null || pending}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-purple-200 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-40"
            title="Auto-detect an iCal feed by scanning the events page + trying common URL patterns"
          >
            {busy === 'probe' ? <RefreshCw size={11} className="animate-spin" /> : <Radar size={11} />}
            Probe for iCal
          </button>
        )}
        {showIngest && (
          <button
            type="button"
            onClick={runIngest}
            disabled={busy !== null || pending}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-blue-200 bg-portal-blue-lt text-portal-blue rounded-lg hover:bg-portal-blue-lt disabled:opacity-40"
            title="Pull events from the saved iCal feed and add them to the pending queue"
          >
            {busy === 'ingest' ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
            Run ingestion now
          </button>
        )}
        {showExtract && (
          <Link
            href={extractHref}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-purple-300 bg-white text-purple-700 rounded-lg hover:bg-purple-50"
            title="Open the AI extractor with this source's events URL pre-filled"
          >
            <Sparkles size={11} /> Extract with AI
          </Link>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-portal-red/30 bg-portal-red-lt px-3 py-2 text-xs text-portal-red flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {probe && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${
          probe.found ? 'border-green-200 bg-portal-green-lt text-green-800' : 'border-amber-200 bg-portal-amber-lt text-amber-900'
        }`}>
          <p className="font-semibold flex items-center gap-1 mb-1">
            {probe.found
              ? <><CheckCircle2 size={12} /> Found iCal feed</>
              : <><AlertTriangle size={12} /> No iCal feed detected</>}
            {probe.platform_hint && <span className="font-normal opacity-70">(platform: {probe.platform_hint})</span>}
          </p>
          {probe.ical_url && (
            <p className="font-mono break-all mb-1">{probe.ical_url}</p>
          )}
          {probe.notes.map((n, i) => <p key={i} className="opacity-80">{n}</p>)}
          {!probe.found && probe.candidates.length > 0 && (
            <details className="mt-1 opacity-70">
              <summary className="cursor-pointer">Tried {probe.candidates.length} candidate URL(s)</summary>
              <ul className="font-mono text-[10px] mt-1 ml-3 list-disc">
                {probe.candidates.slice(0, 8).map((c, i) => <li key={i} className="break-all">{c}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {ingest && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${
          ingest.errors.length === 0 ? 'border-green-200 bg-portal-green-lt text-green-800' : 'border-amber-200 bg-portal-amber-lt text-amber-900'
        }`}>
          <p className="font-semibold flex items-center gap-1 mb-1">
            <CheckCircle2 size={12} /> Ingestion complete
          </p>
          <p>
            <strong>{ingest.inserted}</strong> new pending event(s) ·{' '}
            <span className="opacity-80">{ingest.skipped_duplicate} duplicate · {ingest.skipped_past} past · {ingest.total_in_feed} total in feed</span>
          </p>
          {ingest.errors.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer font-semibold">{ingest.errors.length} error(s)</summary>
              <ul className="text-[10px] mt-1 ml-3 list-disc">
                {ingest.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
