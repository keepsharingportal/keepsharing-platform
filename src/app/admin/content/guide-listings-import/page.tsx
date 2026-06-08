'use client'

// src/app/admin/content/guide-listings-import/page.tsx
// Generic guide CSV import UI — handles all 9 guide files from the handoff package:
//   RRP Newcomer's Guide.csv, private-school-guide.csv, childcare-guide.csv,
//   healthy-kids-guide.csv, birthday-party-guide.csv, afterschool-guide.csv,
//   special-needs-guide.csv, summer-fun-guide.csv, Summer Camp Guide 1.xlsx (export to CSV first)
//
// Flow: parse CSV → map columns → set guide type → import to advertiser_accounts + guide_listings

import { useState, useRef } from 'react'
import { Upload, AlertCircle, RefreshCw, X, ChevronDown, ExternalLink } from 'lucide-react'
import type { GuideListingImportRow, GuideListingImportResult } from '@/app/api/admin/guide-listings-import/route'

// ── Guide type options ────────────────────────────────────────────────────────

const GUIDE_TYPES = [
  { slug: 'newcomer',       label: 'Family Resource Guide (Newcomer)' },
  { slug: 'private-school', label: 'Private School Guide' },
  { slug: 'childcare',      label: 'Childcare Guide' },
  { slug: 'healthy-kids',   label: 'Healthy Kids Guide' },
  { slug: 'birthday-party', label: 'Birthday Party Guide' },
  { slug: 'afterschool',    label: 'After-School Guide' },
  { slug: 'special-needs',  label: 'Special Needs Guide' },
  { slug: 'summer-fun',     label: 'Summer Fun Guide' },
  { slug: 'summer-camp',    label: 'Summer Camp Guide' },
]

// ── Flexible column mapper ────────────────────────────────────────────────────
// Tries many naming conventions so any CSV format works.

const FIELD_PATTERNS: Array<{ field: keyof GuideListingImportRow; patterns: string[] }> = [
  { field: 'business_name', patterns: ['business name', 'name', 'business', 'organization', 'school name', 'camp name', 'practice name', 'provider name', 'venue name'] },
  { field: 'category',      patterns: ['category', 'type', 'subcategory', 'section', 'group', 'parent group'] },
  { field: 'description',   patterns: ['description', 'about', 'details', 'summary', 'overview', 'blurb'] },
  { field: 'phone',         patterns: ['phone', 'phone number', 'telephone', 'contact phone', 'office phone', 'main phone'] },
  { field: 'email',         patterns: ['email', 'email address', 'contact email', 'office email'] },
  { field: 'website_url',   patterns: ['website', 'url', 'web', 'site', 'website url', 'web address'] },
  { field: 'address',       patterns: ['address', 'street address', 'street', 'location', 'mailing address'] },
  { field: 'city_state_zip',patterns: ['city state zip', 'city/state/zip', 'city', 'location city', 'city state'] },
  { field: 'neighborhood',  patterns: ['neighborhood', 'area', 'zone', 'district', 'part of town'] },
  { field: 'hours',         patterns: ['hours', 'business hours', 'office hours', 'hours of operation', 'open hours'] },
  { field: 'listing_tier',  patterns: ['tier', 'listing tier', 'level', 'plan', 'package'] },
]

function matchField(header: string): keyof GuideListingImportRow | '_extra' {
  const h = header.toLowerCase().trim()
  for (const { field, patterns } of FIELD_PATTERNS) {
    if (patterns.some(p => h === p || h.includes(p))) return field
  }
  return '_extra'
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQ = false
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedState = {
  headers:       string[]
  fieldMap:      Array<keyof GuideListingImportRow | '_extra'>
  extraHeaders:  string[]   // columns going into guide_data
  rows:          GuideListingImportRow[]
  unmapped:      string[]
}

type RowResult = { name: string; status: 'inserted' | 'matched' | 'skipped' | 'error'; message?: string }

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuideListingsImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging,   setDragging]   = useState(false)
  const [parsed,     setParsed]     = useState<ParsedState | null>(null)
  const [guideType,  setGuideType]  = useState('')
  const [fileName,   setFileName]   = useState('')
  const [importing,  setImporting]  = useState(false)
  const [progress,   setProgress]   = useState({ done: 0, total: 0 })
  const [results,    setResults]    = useState<RowResult[]>([])
  const [totals,     setTotals]     = useState({ inserted: 0, matched: 0, skipped: 0, errors: 0 })
  const [done,       setDone]       = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function processFile(file: File) {
    setError(null); setParsed(null); setDone(false); setFileName(file.name)

    // Auto-detect guide type from filename
    const lower = file.name.toLowerCase()
    const detected = GUIDE_TYPES.find(g => lower.includes(g.slug) || lower.includes(g.slug.replace('-', '')))
    if (detected && !guideType) setGuideType(detected.slug)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const allRows = parseCSV(text)
        if (allRows.length < 2) { setError('CSV appears empty.'); return }

        const rawHeaders = allRows[0]
        const fieldMap   = rawHeaders.map(matchField)
        const extraHeaders = rawHeaders
          .filter((_, i) => fieldMap[i] === '_extra')
          .map(h => h.trim())
        const unmapped   = rawHeaders
          .filter((_, i) => fieldMap[i] === '_extra')
          .map(h => h.trim())

        const rows: GuideListingImportRow[] = allRows.slice(1)
          .map(cells => {
            const row: Record<string, unknown> = { guide_type_slug: '' }
            rawHeaders.forEach((h, i) => {
              const val = (cells[i] ?? '').trim()
              if (!val) return
              const field = fieldMap[i]
              if (field === '_extra') {
                row[h.trim().toLowerCase().replace(/\s+/g, '_')] = val
              } else {
                row[field as string] = val
              }
            })
            return row as GuideListingImportRow
          })
          .filter(r => (r.business_name as string)?.trim())

        setParsed({ headers: rawHeaders, fieldMap, extraHeaders, rows, unmapped })
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
    else setError('Please drop a .csv file (export XLSX to CSV first)')
  }

  async function runImport() {
    if (!parsed || !guideType) return
    const rowsWithType: GuideListingImportRow[] = parsed.rows.map(r => ({ ...r, guide_type_slug: guideType }))
    const chunks = chunk(rowsWithType, 25)

    setImporting(true); setDone(false)
    setResults([]); setTotals({ inserted: 0, matched: 0, skipped: 0, errors: 0 })
    setProgress({ done: 0, total: rowsWithType.length })

    let ins = 0, upd = 0, skip = 0, errs = 0
    const all: RowResult[] = []

    for (const ch of chunks) {
      try {
        const res = await fetch('/api/admin/guide-listings-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: ch }),
        })
        if (!res.ok) {
          const txt = await res.text()
          for (const r of ch) {
            all.push({ name: (r.business_name as string) ?? '?', status: 'error', message: `${res.status}: ${txt}` })
            errs++
          }
        } else {
          const data: GuideListingImportResult = await res.json()
          ins  += data.inserted
          upd  += data.matched
          skip += data.skipped
          errs += data.errors.length
          all.push(...data.rowResults)
        }
      } catch (e: unknown) {
        for (const r of ch) {
          all.push({ name: (r.business_name as string) ?? '?', status: 'error', message: e instanceof Error ? e.message : 'Network' })
          errs++
        }
      }
      setProgress({ done: all.length, total: rowsWithType.length })
      setResults([...all])
      setTotals({ inserted: ins, matched: upd, skipped: skip, errors: errs })
    }

    setImporting(false); setDone(true)
  }

  function reset() {
    setParsed(null); setDone(false); setError(null)
    setResults([]); setTotals({ inserted: 0, matched: 0, skipped: 0, errors: 0 })
    setFileName(''); setShowAll(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const displayRows = parsed ? (showAll ? parsed.rows : parsed.rows.slice(0, 15)) : []
  const guideLabel  = GUIDE_TYPES.find(g => g.slug === guideType)?.label ?? 'Select a guide'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Guide Listings Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Import any guide CSV from the handoff package into the FRG directory ·
          Creates advertiser accounts + guide listings simultaneously
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* Guide type selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Which guide is this CSV for?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GUIDE_TYPES.map(g => (
              <button
                key={g.slug}
                onClick={() => setGuideType(g.slug)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  guideType === g.slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload zone */}
        {!parsed && (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">Drop guide CSV here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">
              For XLSX files: open in Excel/Sheets → File → Download as CSV · Then drop here
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Preview */}
        {parsed && !done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{parsed.rows.length}</span> listings from{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{fileName}</code>
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  Guide: <strong>{guideLabel}</strong>
                  {parsed.extraHeaders.length > 0 && (
                    <> · Extra columns → guide_data: {parsed.extraHeaders.slice(0, 4).join(', ')}{parsed.extraHeaders.length > 4 ? ` +${parsed.extraHeaders.length - 4} more` : ''}</>
                  )}
                </div>
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <X size={13} /> Reset
              </button>
            </div>

            {!guideType && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-semibold">
                Select which guide this is for before importing.
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
                <span className="text-xs text-gray-400">Showing {displayRows.length} of {parsed.rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">#</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Business Name</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Category</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Phone</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Website</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-300">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium truncate max-w-[200px]">
                          {row.business_name as string}
                        </td>
                        <td className="px-4 py-2 text-gray-500 truncate max-w-[120px]">
                          {row.category as string ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-400">{row.phone as string ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-400 truncate max-w-[120px]">
                          {row.website_url as string ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            row.listing_tier === 'featured' ? 'bg-amber-100 text-amber-700' :
                            row.listing_tier === 'enhanced' ? 'bg-blue-100 text-blue-700' :
                                                              'bg-gray-100 text-gray-500'
                          }`}>
                            {row.listing_tier as string ?? 'community'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 15 && (
                <button onClick={() => setShowAll(!showAll)}
                  className="w-full py-3 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 border-t border-gray-100">
                  <ChevronDown size={13} className={showAll ? 'rotate-180' : ''} />
                  {showAll ? 'Show less' : `Show all ${parsed.rows.length} rows`}
                </button>
              )}
            </div>

            {/* Progress bar during import */}
            {importing && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">{progress.done} / {progress.total} listings processed</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={runImport}
              disabled={importing || !guideType}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing
                ? 'Importing…'
                : !guideType
                ? 'Select a guide type first'
                : `Import ${parsed.rows.length} listings → ${guideLabel}`
              }
            </button>
          </div>
        )}

        {/* Results */}
        {done && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'New',           value: totals.inserted, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                { label: 'Auto-linked',   value: totals.matched,  color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'   },
                { label: 'Skipped',       value: totals.skipped,  color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200'   },
                { label: 'Errors',   value: totals.errors,   color: 'text-red-600',   bg: 'bg-red-50 border-red-200'     },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === 'inserted' ? 'bg-green-100 text-green-700' :
                      r.status === 'matched'  ? 'bg-blue-100 text-blue-700'  :
                      r.status === 'skipped'  ? 'bg-gray-100 text-gray-500'  :
                                                'bg-red-100 text-red-700'
                    }`}>{r.status}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{r.name}</span>
                    {r.message && <span className="text-[10px] text-gray-400 truncate max-w-xs">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">
                Import another guide CSV
              </button>
              <a href="/family-resource-guide" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50">
                <ExternalLink size={14} />
                View {guideLabel}
              </a>
            </div>

            {(totals.inserted + totals.matched) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                <strong>{totals.inserted + totals.matched} listings</strong> are now live in the{' '}
                <strong>{guideLabel}</strong>. Import the next guide CSV or go populate FRG categories.
              </div>
            )}
          </div>
        )}

        {/* Column mapping reference */}
        {!parsed && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 select-none">
              Supported column names
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
              {FIELD_PATTERNS.map(({ field, patterns }) => (
                <div key={field as string} className="flex gap-2">
                  <span className="font-mono text-blue-500 shrink-0">{field as string}</span>
                  <span className="text-gray-300">←</span>
                  <span>{patterns.slice(0, 3).join(', ')}</span>
                </div>
              ))}
              <div className="col-span-2 text-gray-300 mt-1">
                All other columns are stored in guide_data (JSON) for guide-specific fields.
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
