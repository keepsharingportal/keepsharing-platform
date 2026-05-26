// ── /admin/events/extract ─────────────────────────────────────────────────────
// Paste a URL or block of text, run Claude extraction, review the structured
// events it found, deselect any garbage, then save the keepers as pending.
//
// Designed for sources without iCal feeds (MPAC, WSFA, funinmontgomery,
// Facebook events). The Claude call is server-side; this page is the operator UI.

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, Link as LinkIcon, FileText, ArrowLeft, CheckCircle2, AlertTriangle,
  RefreshCw, Save, Inbox,
} from 'lucide-react'

interface ExtractedEvent {
  title:            string
  description:      string | null
  start_date:       string
  end_date:         string | null
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  address:          string | null
  city:             string | null
  is_free:          boolean | null
  cost_text:        string | null
  age_range:        string | null
  registration_url: string | null
  organizer_name:   string | null
  source_url:       string | null
  confidence_notes: string | null
}

interface ExtractionResult {
  events:              ExtractedEvent[]
  source_url:          string | null
  source_text_excerpt: string | null
  model_notes:         string | null
  errors:              string[]
}

interface SaveResult {
  success:  boolean
  inserted: number
  skipped:  number
  errors:   string[]
}

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-primary/60 bg-white'
const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5'

export default function ExtractPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading…</div>}>
      <ExtractPage />
    </Suspense>
  )
}

function ExtractPage() {
  const params      = useSearchParams()
  const initialUrl  = params.get('url') ?? ''
  const sourceId    = params.get('source_id') ?? ''
  const sourceName  = params.get('source_name') ?? ''

  const [mode, setMode]       = useState<'url' | 'text'>(initialUrl ? 'url' : 'url')
  const [url, setUrl]         = useState(initialUrl)
  const [text, setText]       = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState<ExtractionResult | null>(null)
  const [events, setEvents]   = useState<ExtractedEvent[]>([])
  const [keep, setKeep]       = useState<Record<number, boolean>>({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState<SaveResult | null>(null)
  const [err, setErr]         = useState<string | null>(null)

  async function runExtract() {
    setRunning(true)
    setErr(null)
    setResult(null)
    setEvents([])
    setKeep({})
    setSaved(null)
    try {
      const body = mode === 'url' ? { url: url.trim() } : { text: text.trim() }
      const res  = await fetch('/api/admin/events/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      const r = json as ExtractionResult
      setResult(r)
      setEvents(r.events)
      // Default: keep every event Claude returned. Operator unchecks the bad ones.
      setKeep(Object.fromEntries(r.events.map((_, i) => [i, true])))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  function updateField<K extends keyof ExtractedEvent>(idx: number, key: K, value: ExtractedEvent[K]) {
    setEvents(es => es.map((e, i) => i === idx ? { ...e, [key]: value } : e))
  }

  async function saveKept() {
    const toSave = events.filter((_, i) => keep[i])
    if (toSave.length === 0) {
      setErr('No events selected to save.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/events/extract/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          events:      toSave,
          source_id:   sourceId || undefined,
          source_name: sourceName || undefined,
          source_url:  mode === 'url' ? url : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setSaved(json as SaveResult)
      // Remove saved events from the working set
      setEvents(es => es.filter((_, i) => !keep[i]))
      setKeep({})
    } finally {
      setSaving(false)
    }
  }

  const keptCount = Object.values(keep).filter(Boolean).length

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* HEADER */}
      <div>
        <Link href="/admin/events/sources" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 mb-2">
          <ArrowLeft size={12} /> Back to Sources
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Extract</h1>
        </div>
        <p className="text-sm text-gray-500">
          Paste an events URL or block of text. Claude reads it and returns structured events.
          Nothing is saved until you review the results and click Save Selected.
          {sourceName && <> Attribution will be set to <strong className="text-gray-700">{sourceName}</strong>.</>}
        </p>
      </div>

      {/* INPUT FORM */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-700">Source</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1.5">
            <button onClick={() => setMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                mode === 'url' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <LinkIcon size={11} /> Paste URL
            </button>
            <button onClick={() => setMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                mode === 'text' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <FileText size={11} /> Paste text
            </button>
          </div>

          {mode === 'url' ? (
            <div>
              <label className={labelCls}>Events page URL</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://www.mpaconline.org/events"
                className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1">
                Best for: org event pages, news community calendars, single event detail pages.
                Won&apos;t work for Facebook events (gated) — for those use Paste text and paste the visible event body.
              </p>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Paste event text (any format)</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                rows={10}
                placeholder="Paste any free-form event listing here — a Facebook event body, a press release, a newsletter blurb, etc."
                className={`${inputCls} resize-y font-mono text-xs`} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={runExtract}
              disabled={running || (mode === 'url' ? !url.trim() : !text.trim())}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40">
              {running ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {running ? 'Extracting…' : 'Extract events'}
            </button>
            <span className="text-[11px] text-gray-400">
              Powered by Claude. Extraction usually takes 5–20 seconds.
            </span>
          </div>
        </div>
      </section>

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-bold text-rose-900 mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Error
          </p>
          <p className="text-sm text-rose-800 leading-relaxed">{err}</p>
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-bold text-green-900 mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Saved {saved.inserted} pending event(s)
          </p>
          {saved.skipped > 0 && <p className="text-xs text-green-700">{saved.skipped} skipped</p>}
          {saved.errors.length > 0 && (
            <details className="mt-1">
              <summary className="text-xs cursor-pointer font-semibold">{saved.errors.length} insert error(s)</summary>
              <ul className="text-xs mt-1 ml-3 list-disc">
                {saved.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <Link href="/admin/events/pending" className="text-xs font-semibold text-green-800 underline mt-2 inline-flex items-center gap-1">
            <Inbox size={11} /> Review in pending queue →
          </Link>
        </div>
      )}

      {/* RESULTS */}
      {result && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-700">
              {events.length === 0 ? 'No events found' : `${events.length} event(s) extracted — keeping ${keptCount}`}
            </h2>
            {events.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setKeep(Object.fromEntries(events.map((_, i) => [i, true])))}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-2 py-1">Select all</button>
                <button onClick={() => setKeep({})}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-2 py-1">Select none</button>
                <button onClick={saveKept} disabled={saving || keptCount === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40">
                  {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                  Save {keptCount} as pending
                </button>
              </div>
            )}
          </div>

          {result.model_notes && (
            <p className="px-5 py-3 text-xs text-gray-500 italic bg-gray-50/50 border-b border-gray-100">
              Model notes: {result.model_notes}
            </p>
          )}

          {events.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              No events extracted. Try Paste text mode with the visible event body, or check the source.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {events.map((ev, idx) => (
                <li key={idx} className={`p-5 ${!keep[idx] ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <input type="checkbox" checked={!!keep[idx]} onChange={e => setKeep(k => ({ ...k, [idx]: e.target.checked }))}
                      className="mt-1 w-4 h-4 rounded text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <input type="text" value={ev.title} onChange={e => updateField(idx, 'title', e.target.value)}
                        className="w-full text-base font-semibold text-gray-900 bg-transparent outline-none focus:bg-gray-50 rounded px-1 -mx-1" />
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.start_date}{ev.start_time ? ` · ${ev.start_time}` : ''}
                        {ev.location_name && ` · ${ev.location_name}`}
                      </p>
                    </div>
                  </div>

                  {keep[idx] && (
                    <div className="ml-7 space-y-3">
                      {ev.confidence_notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-900 italic">
                          ⚠️ {ev.confidence_notes}
                        </div>
                      )}

                      <div className="grid md:grid-cols-4 gap-3">
                        <div>
                          <label className={labelCls}>Start date</label>
                          <input type="date" value={ev.start_date} onChange={e => updateField(idx, 'start_date', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>End date</label>
                          <input type="date" value={ev.end_date ?? ''} onChange={e => updateField(idx, 'end_date', e.target.value || null)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Start time</label>
                          <input type="text" value={ev.start_time ?? ''} onChange={e => updateField(idx, 'start_time', e.target.value || null)} placeholder="4:00 PM" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>End time</label>
                          <input type="text" value={ev.end_time ?? ''} onChange={e => updateField(idx, 'end_time', e.target.value || null)} placeholder="6:30 PM" className={inputCls} />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className={labelCls}>Venue / location name</label>
                          <input type="text" value={ev.location_name ?? ''} onChange={e => updateField(idx, 'location_name', e.target.value || null)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>City</label>
                          <input type="text" value={ev.city ?? ''} onChange={e => updateField(idx, 'city', e.target.value || null)} className={inputCls} />
                        </div>
                        <div className="md:col-span-3">
                          <label className={labelCls}>Address</label>
                          <input type="text" value={ev.address ?? ''} onChange={e => updateField(idx, 'address', e.target.value || null)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Organizer</label>
                          <input type="text" value={ev.organizer_name ?? ''} onChange={e => updateField(idx, 'organizer_name', e.target.value || null)} className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Registration URL</label>
                          <input type="url" value={ev.registration_url ?? ''} onChange={e => updateField(idx, 'registration_url', e.target.value || null)} className={inputCls} />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <input type="checkbox" checked={!!ev.is_free} onChange={e => updateField(idx, 'is_free', e.target.checked)} className="w-4 h-4 rounded text-primary" />
                            Free event
                          </label>
                        </div>
                        <div>
                          <label className={labelCls}>Cost</label>
                          <input type="text" value={ev.cost_text ?? ''} onChange={e => updateField(idx, 'cost_text', e.target.value || null)} disabled={!!ev.is_free} className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Age range</label>
                          <input type="text" value={ev.age_range ?? ''} onChange={e => updateField(idx, 'age_range', e.target.value || null)} className={inputCls} />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Description</label>
                        <textarea value={ev.description ?? ''} onChange={e => updateField(idx, 'description', e.target.value || null)} rows={3} className={`${inputCls} resize-y`} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
