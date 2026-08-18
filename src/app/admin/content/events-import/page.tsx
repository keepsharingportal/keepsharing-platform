'use client'

// src/app/admin/content/events-import/page.tsx
// Event CSV import admin UI.
// Accepts CSV from Excel/Google Sheets. Parses in browser. Sends chunks to API.
// Deduplication handled server-side by title + start_date.

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, RefreshCw, X, ChevronDown, ExternalLink } from 'lucide-react'
import type { EventImportRow, EventImportResult } from '@/app/api/admin/events-csv-import/route'

// ── CSV parser (same robust parser as summer guide import) ────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQ  = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1]
    if (inQ) {
      if (ch === '"' && nx === '"') { cell += '"'; i++ }
      else if (ch === '"') inQ = false
      else cell += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { row.push(cell.trim()); cell = '' }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        row.push(cell.trim()); cell = ''
        if (row.some(c => c)) rows.push(row)
        row = []; if (ch === '\r') i++
      } else cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some(c => c)) rows.push(row)
  return rows
}

// ── Column normalisation ──────────────────────────────────────────────────────

type ColKey = keyof EventImportRow | '_skip'

const COL_MAP: Record<string, ColKey> = {
  'title':           'title',
  'event title':     'title',
  'event name':      'title',
  'name':            'title',
  'start date':      'start_date',
  'date':            'start_date',
  'start':           'start_date',
  'end date':        'end_date',
  'end':             'end_date',
  'start time':      'start_time',
  'time':            'start_time',
  'end time':        'end_time',
  'description':     'description',
  'details':         'description',
  'about':           'description',
  'notes':           'description',
  'location':        'location_name',
  'location name':   'location_name',
  'venue':           'location_name',
  'address':         'address',
  'category':        'category',
  'type':            'category',
  'free':            'is_free',
  'is free':         'is_free',
  'admission free':  'is_free',
  'cost':            'cost_text',
  'price':           'cost_text',
  'admission':       'cost_text',
  'image':           'hero_image_url',
  'image url':       'hero_image_url',
  'photo':           'hero_image_url',
  'website':         'website_url',
  'url':             'website_url',
  'link':            'website_url',
  'organizer':       'organizer',
  'host':            'organizer',
  'contact':         'organizer',
}

function normalizeHeader(h: string): ColKey {
  return COL_MAP[h.toLowerCase().trim()] ?? '_skip'
}

function parseDate(raw: string): string | null {
  if (!raw?.trim()) return null
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
  // Try M/D/YYYY or M/D/YY
  const parts = raw.trim().split(/[\/\-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p, 10))
    // M/D/YYYY or M/D/YY
    if (c > 1000) {
      const m = String(a).padStart(2, '0'), d = String(b).padStart(2, '0')
      return `${c}-${m}-${d}`
    }
    // YYYY-M-D
    if (a > 1000) {
      const m = String(b).padStart(2, '0'), d = String(c).padStart(2, '0')
      return `${a}-${m}-${d}`
    }
  }
  // Fall back to Date.parse
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return null
}

function parseBool(v: string): boolean {
  return ['yes', 'true', '1', 'y', 'x', 'free'].includes(v.toLowerCase().trim())
}

function normalizeRow(headers: ColKey[], cells: string[]): EventImportRow {
  const r: Record<string, unknown> = {}
  headers.forEach((key, i) => {
    if (key === '_skip') return
    const val = cells[i]?.trim() ?? ''
    if (key === 'start_date' || key === 'end_date') r[key] = parseDate(val) || undefined
    else if (key === 'is_free') r[key] = val ? parseBool(val) : undefined
    else r[key] = val || undefined
  })
  return r as EventImportRow
}

// ── Chunk helper ──────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Component ─────────────────────────────────────────────────────────────────

type ParsedState = {
  headers:    ColKey[]
  rawHeaders: string[]
  rows:       EventImportRow[]
}

type RowResult = { title: string; status: 'ok' | 'skipped' | 'error'; message?: string }

export default function EventsImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging,   setDragging]   = useState(false)
  const [parsed,     setParsed]     = useState<ParsedState | null>(null)
  const [importing,  setImporting]  = useState(false)
  const [progress,   setProgress]   = useState({ done: 0, total: 0 })
  const [results,    setResults]    = useState<RowResult[]>([])
  const [totals,     setTotals]     = useState({ inserted: 0, skipped: 0, errors: 0 })
  const [done,       setDone]       = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function processFile(file: File) {
    setError(null); setParsed(null); setDone(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const allRows = parseCSV(text)
        if (allRows.length < 2) { setError('CSV appears empty or has only a header row.'); return }
        const rawHeaders = allRows[0]
        const headers    = rawHeaders.map(normalizeHeader)
        const dataRows   = allRows.slice(1)
          .map(cells => normalizeRow(headers, cells))
          .filter(r => r.title?.trim() && r.start_date)
        setParsed({ headers, rawHeaders, rows: dataRows })
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Parse error')
      }
    }
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processFile(file)
    else setError('Please drop a .csv file')
  }

  async function runImport() {
    if (!parsed || parsed.rows.length === 0) return
    setImporting(true); setDone(false)
    setResults([]); setTotals({ inserted: 0, skipped: 0, errors: 0 })
    setProgress({ done: 0, total: parsed.rows.length })

    const chunks = chunk(parsed.rows, 25)
    let ins = 0, skip = 0, errs = 0
    const all: RowResult[] = []

    for (const ch of chunks) {
      try {
        const res = await fetch('/api/admin/events-csv-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: ch }),
        })
        if (!res.ok) {
          for (const r of ch) {
            all.push({ title: r.title, status: 'error', message: `Server ${res.status}` })
            errs++
          }
        } else {
          const data: EventImportResult = await res.json()
          ins  += data.inserted
          skip += data.skipped
          errs += data.errors.length
          all.push(...data.rowResults)
        }
      } catch (e: unknown) {
        for (const r of ch) {
          all.push({ title: r.title, status: 'error', message: e instanceof Error ? e.message : 'Network error' })
          errs++
        }
      }
      setProgress({ done: all.length, total: parsed.rows.length })
      setResults([...all])
      setTotals({ inserted: ins, skipped: skip, errors: errs })
    }

    setImporting(false); setDone(true)
  }

  function reset() {
    setParsed(null); setDone(false); setError(null)
    setResults([]); setTotals({ inserted: 0, skipped: 0, errors: 0 })
    setShowAll(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const displayRows = parsed ? (showAll ? parsed.rows : parsed.rows.slice(0, 15)) : []
  const unmapped    = parsed ? parsed.rawHeaders.filter((_, i) => parsed.headers[i] === '_skip') : []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="text-xl font-semibold text-portal-text">Event Import</h1>
        <p className="text-sm text-portal-sub mt-0.5">
          Upload a CSV of events · Deduplication by title + date · Published immediately
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* Upload zone */}
        {!parsed && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-portal-blue/50 bg-portal-blue-lt' : 'border-portal-border-2 hover:border-portal-border-2 hover:bg-portal-bg bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-portal-border-2" />
            <p className="text-sm font-semibold text-portal-sub">Drop CSV file here or click to browse</p>
            <p className="text-xs text-portal-muted mt-1">Exported from Excel or Google Sheets</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-portal-red-lt border border-portal-red/30 rounded-lg flex items-start gap-2 text-sm text-portal-red">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Preview */}
        {parsed && !done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-portal-sub">
                <span className="font-bold text-portal-text">{parsed.rows.length}</span> events ready to import
              </span>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-portal-muted hover:text-portal-sub">
                <X size={13} /> Reset
              </button>
            </div>

            {unmapped.length > 0 && (
              <div className="p-3 bg-portal-amber-lt border border-portal-amber/30 rounded-lg text-xs text-portal-amber">
                <span className="font-semibold">Columns not recognised (will be skipped):</span> {unmapped.join(', ')}
              </div>
            )}

            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
                <span className="text-xs font-semibold text-portal-sub uppercase tracking-wide">Preview</span>
                <span className="text-xs text-portal-muted">Showing {displayRows.length} of {parsed.rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-portal-border bg-portal-bg">
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">#</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Title</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Date</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Location</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Category</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Free?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-portal-bg">
                        <td className="px-4 py-2 text-portal-border-2">{i + 1}</td>
                        <td className="px-4 py-2 text-portal-text font-medium truncate max-w-[220px]">{row.title}</td>
                        <td className="px-4 py-2 text-portal-sub whitespace-nowrap">{row.start_date ?? '—'}</td>
                        <td className="px-4 py-2 text-portal-sub truncate max-w-[140px]">{row.location_name ?? '—'}</td>
                        <td className="px-4 py-2 text-portal-sub">{row.category ?? 'Family'}</td>
                        <td className="px-4 py-2">
                          {row.is_free
                            ? <span className="text-[10px] bg-portal-green-lt text-portal-green px-1.5 py-0.5 rounded-full font-semibold">Free</span>
                            : <span className="text-portal-border-2">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 15 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-3 text-xs text-portal-muted hover:text-portal-sub flex items-center justify-center gap-1 border-t border-portal-border"
                >
                  <ChevronDown size={13} className={showAll ? 'rotate-180' : ''} />
                  {showAll ? 'Show less' : `Show all ${parsed.rows.length} events`}
                </button>
              )}
            </div>

            {/* Import progress bar (shown during import) */}
            {importing && (
              <div className="bg-white rounded-lg border border-portal-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-portal-blue animate-spin" />
                  <span className="text-sm text-portal-sub">{progress.done} / {progress.total} events processed</span>
                </div>
                <div className="w-full bg-portal-row-hover rounded-full h-2">
                  <div
                    className="bg-portal-blue h-2 rounded-full transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={runImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 bg-portal-navy hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? 'Importing…' : `Import ${parsed.rows.length} events`}
            </button>
          </div>
        )}

        {/* Results */}
        {done && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inserted', value: totals.inserted, color: 'text-portal-green', bg: 'bg-portal-green-lt border-portal-green/30' },
                { label: 'Skipped',  value: totals.skipped,  color: 'text-portal-sub',  bg: 'bg-portal-bg border-portal-border'  },
                { label: 'Errors',   value: totals.errors,   color: 'text-portal-red',   bg: 'bg-portal-red-lt border-portal-red/30'    },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-lg border p-5 text-center ${bg}`}>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-portal-sub mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
              <div className="divide-y divide-portal-border max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === 'ok'      ? 'bg-portal-green-lt text-portal-green' :
                      r.status === 'skipped' ? 'bg-portal-row-hover text-portal-sub'  :
                                               'bg-portal-red-lt text-portal-red'
                    }`}>{r.status === 'ok' ? 'added' : r.status}</span>
                    <span className="text-xs text-portal-text flex-1 truncate">{r.title}</span>
                    {r.message && <span className="text-[10px] text-portal-muted truncate max-w-xs">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2 text-sm text-portal-sub border border-portal-border-2 rounded-lg hover:bg-portal-bg">
                Import another file
              </button>
              <a href="/admin/go/calendar" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-portal-blue border border-portal-border-2 rounded-lg hover:bg-portal-blue-lt">
                <ExternalLink size={14} />
                View event calendar
              </a>
            </div>

            {totals.inserted > 0 && (
              <div className="flex items-center gap-2 text-sm text-portal-green bg-portal-green-lt border border-portal-green/30 rounded-lg px-4 py-3">
                <CheckCircle size={16} />
                <strong>{totals.inserted} events</strong> are live and visible on the public calendar.
              </div>
            )}
          </div>
        )}

        {/* Column mapping reference */}
        {!parsed && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-portal-muted hover:text-portal-sub transition-colors select-none">
              Expected column headers
            </summary>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(COL_MAP).map(([header, field]) => field !== '_skip' && (
                <div key={header} className="flex items-center gap-2 text-portal-muted">
                  <span className="font-mono bg-portal-row-hover px-1.5 py-0.5 rounded">{header}</span>
                  <span className="text-portal-border-2">→</span>
                  <span className="text-portal-sub">{field as string}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-portal-muted">
              Required: <code className="bg-portal-row-hover px-1 rounded">title</code> and <code className="bg-portal-row-hover px-1 rounded">start date</code>.
              Date format: YYYY-MM-DD or M/D/YYYY.
            </p>
          </details>
        )}
      </div>
    </div>
  )
}
