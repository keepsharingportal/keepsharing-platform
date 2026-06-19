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
// Tries many naming conventions so any CSV format works. The auto-mapper
// runs at parse time; the editor can override any column in the
// "Map columns" step before running the import.

// '_skip' — drop the column entirely (e.g. an internal CSV note column)
// '_extra' — pipe through to guide_data JSONB under the original header
// Any other value = explicit target column on guide_listings.
export type FieldTarget =
  | '_skip' | '_extra'
  | 'business_name' | 'category' | 'description' | 'card_hook'
  | 'phone' | 'email' | 'website_url'
  | 'address' | 'city_state_zip' | 'neighborhood' | 'hours'
  | 'hero_photo_url' | 'listing_tier' | 'listing_year'

// Editor-facing dropdown options. Order = order shown in the picker.
// Visible columns get the bold label; the descriptive line under the
// option hint at where the field lands.
const TARGET_OPTIONS: Array<{ value: FieldTarget; label: string; hint?: string }> = [
  { value: '_skip',         label: '— skip this column —',  hint: 'Do not import this column.' },
  { value: 'business_name', label: 'Business name *',        hint: 'Required.' },
  { value: 'category',      label: 'Category',               hint: 'Drives the Guide-by-Category grouping.' },
  { value: 'description',   label: 'Description',            hint: 'Long-form text — falls into guide_data + cards.' },
  { value: 'card_hook',     label: 'Card hook (short blurb)',hint: 'One-line teaser used on directory cards.' },
  { value: 'phone',         label: 'Phone',                  hint: 'Office phone, click-to-call on cards.' },
  { value: 'email',         label: 'Email' },
  { value: 'website_url',   label: 'Website URL' },
  { value: 'address',       label: 'Street address' },
  { value: 'city_state_zip',label: 'City / state / zip' },
  { value: 'neighborhood',  label: 'Neighborhood',           hint: 'Shows above the blurb on cards.' },
  { value: 'hours',         label: 'Hours',                  hint: 'Stored in guide_data.' },
  { value: 'hero_photo_url',label: 'Hero photo URL' },
  { value: 'listing_tier',  label: 'Listing tier',           hint: 'community / enhanced / featured.' },
  { value: 'listing_year',  label: 'Listing year' },
  { value: '_extra',        label: '→ extra (guide_data JSONB)', hint: 'Anything else lands here keyed by the CSV header.' },
]

const FIELD_PATTERNS: Array<{ field: FieldTarget; patterns: string[] }> = [
  { field: 'business_name', patterns: ['business name', 'name', 'business', 'organization', 'school name', 'camp name', 'practice name', 'provider name', 'venue name'] },
  { field: 'category',      patterns: ['category', 'type', 'subcategory', 'section', 'group', 'parent group'] },
  { field: 'description',   patterns: ['description', 'about', 'details', 'summary', 'overview', 'blurb'] },
  { field: 'card_hook',     patterns: ['card hook', 'hook', 'tagline', 'short blurb'] },
  { field: 'phone',         patterns: ['phone', 'phone number', 'telephone', 'contact phone', 'office phone', 'main phone'] },
  { field: 'email',         patterns: ['email', 'email address', 'contact email', 'office email'] },
  { field: 'website_url',   patterns: ['website', 'url', 'web', 'site', 'website url', 'web address'] },
  { field: 'address',       patterns: ['address', 'street address', 'street', 'location', 'mailing address'] },
  { field: 'city_state_zip',patterns: ['city state zip', 'city/state/zip', 'city', 'location city', 'city state'] },
  { field: 'neighborhood',  patterns: ['neighborhood', 'area', 'zone', 'district', 'part of town'] },
  { field: 'hours',         patterns: ['hours', 'business hours', 'office hours', 'hours of operation', 'open hours'] },
  { field: 'hero_photo_url',patterns: ['hero photo', 'hero image', 'photo url', 'image url', 'logo url'] },
  { field: 'listing_tier',  patterns: ['tier', 'listing tier', 'level', 'plan', 'package'] },
  { field: 'listing_year',  patterns: ['year', 'listing year', 'guide year'] },
]

function matchField(header: string): FieldTarget {
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
  fieldMap:      FieldTarget[]                    // one entry per header; editable in the UI
  rawRows:       string[][]                       // raw cell values, indexed by header position
}

// Apply the current fieldMap to the raw cells → importable row payload.
// Re-runs on every mapping change so the preview and the final import
// always reflect what the editor sees.
function buildRows(state: ParsedState, guideTypeSlug: string): GuideListingImportRow[] {
  return state.rawRows.map(cells => {
    const row: Record<string, unknown> = { guide_type_slug: guideTypeSlug }
    state.headers.forEach((h, i) => {
      const val = (cells[i] ?? '').trim()
      if (!val) return
      const target = state.fieldMap[i]
      if (target === '_skip') return
      if (target === '_extra') {
        row[h.trim().toLowerCase().replace(/\s+/g, '_')] = val
      } else {
        row[target] = val
      }
    })
    return row as GuideListingImportRow
  }).filter(r => (r.business_name as string)?.trim())
}

type RowResult = {
  name: string
  status: 'inserted' | 'merged' | 'matched' | 'unchanged' | 'skipped' | 'error'
  message?: string
  filledFields?: string[]
}
type ImportMode = 'insert' | 'merge'

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
  const [totals,     setTotals]     = useState({ inserted: 0, merged: 0, matched: 0, unchanged: 0, skipped: 0, errors: 0 })
  const [mode,       setMode]       = useState<ImportMode>('insert')
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
        const rawRows    = allRows.slice(1)
        setParsed({ headers: rawHeaders, fieldMap, rawRows })
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Parse error')
      }
    }
    reader.readAsText(file)
  }

  function updateMapping(idx: number, target: FieldTarget) {
    setParsed(p => p ? { ...p, fieldMap: p.fieldMap.map((t, i) => i === idx ? target : t) } : p)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processFile(file)
    else setError('Please drop a .csv file (export XLSX to CSV first)')
  }

  async function runImport() {
    if (!parsed || !guideType) return
    // Re-derive payload from the current mapping at run time so any
    // mid-flight dropdown change is honored.
    const rowsWithType = buildRows(parsed, guideType)
    if (rowsWithType.length === 0) {
      setError('No rows with a business_name after mapping. Map the name column first.')
      return
    }
    const chunks = chunk(rowsWithType, 25)

    setImporting(true); setDone(false)
    setResults([]); setTotals({ inserted: 0, merged: 0, matched: 0, unchanged: 0, skipped: 0, errors: 0 })
    setProgress({ done: 0, total: rowsWithType.length })

    let ins = 0, mer = 0, upd = 0, unc = 0, skip = 0, errs = 0
    const all: RowResult[] = []

    for (const ch of chunks) {
      try {
        const res = await fetch('/api/admin/guide-listings-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: ch, mode }),
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
          mer  += data.merged
          upd  += data.matched
          unc  += data.unchanged
          skip += data.skipped
          errs += data.errors.length
          all.push(...data.rowResults as RowResult[])
        }
      } catch (e: unknown) {
        for (const r of ch) {
          all.push({ name: (r.business_name as string) ?? '?', status: 'error', message: e instanceof Error ? e.message : 'Network' })
          errs++
        }
      }
      setProgress({ done: all.length, total: rowsWithType.length })
      setResults([...all])
      setTotals({ inserted: ins, merged: mer, matched: upd, unchanged: unc, skipped: skip, errors: errs })
    }

    setImporting(false); setDone(true)
  }

  function reset() {
    setParsed(null); setDone(false); setError(null)
    setResults([]); setTotals({ inserted: 0, merged: 0, matched: 0, unchanged: 0, skipped: 0, errors: 0 })
    setFileName(''); setShowAll(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Derived from raw + current mapping → reflects mapping edits live.
  const derivedRows = parsed ? buildRows(parsed, guideType || 'TEMP') : []
  const displayRows = showAll ? derivedRows : derivedRows.slice(0, 15)
  const guideLabel  = GUIDE_TYPES.find(g => g.slug === guideType)?.label ?? 'Select a guide'

  // Surface mapping summary so the editor sees what each column does.
  const mappingSummary = parsed ? parsed.fieldMap.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {}) : {}
  const extraColumns = parsed
    ? parsed.headers.filter((_, i) => parsed.fieldMap[i] === '_extra').map(h => h.trim())
    : []
  const skippedColumns = parsed
    ? parsed.headers.filter((_, i) => parsed.fieldMap[i] === '_skip').map(h => h.trim())
    : []
  const businessNameMapped = parsed ? parsed.fieldMap.includes('business_name') : false

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="text-xl font-semibold text-portal-text">Guide Listings Import</h1>
        <p className="text-sm text-portal-sub mt-0.5">
          Import any guide CSV from the handoff package into the FRG directory ·
          Creates advertiser accounts + guide listings simultaneously
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* Import mode — insert vs merge */}
        <div className="bg-white rounded-lg border border-portal-border p-4">
          <label className="block text-xs font-semibold text-portal-sub mb-2 uppercase tracking-wide">
            How should this CSV land?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button" onClick={() => setMode('insert')}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                mode === 'insert'
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-text border-portal-border-2 hover:bg-portal-bg'
              }`}
            >
              <div className="text-[12px] font-bold">Insert (new guide year)</div>
              <div className={`text-[10px] mt-0.5 ${mode === 'insert' ? 'text-white/80' : 'text-portal-sub'}`}>
                Every row creates a new listing. Use for the first import of a fresh year.
              </div>
            </button>
            <button
              type="button" onClick={() => setMode('merge')}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                mode === 'merge'
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-text border-portal-border-2 hover:bg-portal-bg'
              }`}
            >
              <div className="text-[12px] font-bold">Merge (refresh existing)</div>
              <div className={`text-[10px] mt-0.5 ${mode === 'merge' ? 'text-white/80' : 'text-portal-sub'}`}>
                Match on business + category + year. Only fill empty fields — never overwrite logos, photos, or edits.
              </div>
            </button>
          </div>
        </div>

        {/* Guide type selector */}
        <div className="bg-white rounded-lg border border-portal-border p-4">
          <label className="block text-xs font-semibold text-portal-sub mb-2 uppercase tracking-wide">
            Which guide is this CSV for?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GUIDE_TYPES.map(g => (
              <button
                key={g.slug}
                onClick={() => setGuideType(g.slug)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  guideType === g.slug
                    ? 'bg-portal-navy text-white'
                    : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'
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
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-portal-blue/50 bg-portal-blue-lt' : 'border-portal-border-2 hover:border-portal-border-2 hover:bg-portal-bg bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-portal-border-2" />
            <p className="text-sm font-semibold text-portal-sub">Drop guide CSV here or click to browse</p>
            <p className="text-xs text-portal-muted mt-1">
              For XLSX files: open in Excel/Sheets → File → Download as CSV · Then drop here
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </div>
        )}

        {error && (
          <div className="p-4 bg-portal-red-lt border border-portal-red/30 rounded-lg flex items-start gap-2 text-sm text-portal-red">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Preview + mapping */}
        {parsed && !done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-portal-sub">
                  <span className="font-bold text-portal-text">{derivedRows.length}</span> listings from{' '}
                  <code className="bg-portal-row-hover px-1.5 py-0.5 rounded text-xs">{fileName}</code>
                </span>
                <div className="text-xs text-portal-sub mt-1">
                  Guide: <strong>{guideLabel}</strong>
                  {extraColumns.length > 0 && (
                    <> · Extra → guide_data: {extraColumns.slice(0, 4).join(', ')}{extraColumns.length > 4 ? ` +${extraColumns.length - 4} more` : ''}</>
                  )}
                  {skippedColumns.length > 0 && (
                    <> · Skipping: {skippedColumns.join(', ')}</>
                  )}
                </div>
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-portal-muted hover:text-portal-sub">
                <X size={13} /> Reset
              </button>
            </div>

            {!guideType && (
              <div className="p-3 bg-portal-amber-lt border border-portal-amber/30 rounded-lg text-sm text-portal-amber font-semibold">
                Select which guide this is for before importing.
              </div>
            )}

            {!businessNameMapped && (
              <div className="p-3 bg-portal-amber-lt border border-portal-amber/30 rounded-lg text-sm text-portal-amber font-semibold">
                No column is mapped to <code>Business name</code> — every row will be skipped.
                Pick a CSV column → <strong>Business name *</strong> in the mapping table below.
              </div>
            )}

            {/* Column mapping table — editable */}
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-portal-sub uppercase tracking-wide">Map columns</div>
                  <div className="text-[11px] text-portal-muted mt-0.5">
                    Auto-detected from the headers — change any dropdown to remap. Sample value shown to help confirm.
                  </div>
                </div>
                <div className="text-[11px] text-portal-sub">
                  {Object.entries(mappingSummary)
                    .filter(([k]) => k !== '_skip' && k !== '_extra')
                    .reduce((sum, [, n]) => sum + n, 0)} mapped · {(mappingSummary._extra ?? 0)} extra · {(mappingSummary._skip ?? 0)} skipped
                </div>
              </div>
              <div className="divide-y divide-portal-border">
                {parsed.headers.map((h, i) => {
                  const target = parsed.fieldMap[i]
                  const sample = parsed.rawRows.find(r => (r[i] ?? '').trim())?.[i]?.trim() ?? ''
                  return (
                    <div key={`${h}-${i}`} className="grid grid-cols-[1fr,auto,2fr] sm:grid-cols-[1fr,auto,1fr,2fr] gap-2 items-center px-4 py-2">
                      <div className="text-[12px] font-semibold text-portal-text truncate" title={h}>{h || <span className="text-portal-muted italic">(no header)</span>}</div>
                      <div className="text-[10px] text-portal-muted hidden sm:block">→</div>
                      <select
                        value={target}
                        onChange={e => updateMapping(i, e.target.value as FieldTarget)}
                        className={`px-2 py-1.5 text-[11px] border rounded bg-white outline-none focus:border-portal-blue ${
                          target === '_skip'  ? 'border-portal-border text-portal-muted' :
                          target === '_extra' ? 'border-portal-border-2 text-portal-sub' :
                                                'border-portal-blue/40 text-portal-text'
                        }`}
                      >
                        {TARGET_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <div className="text-[11px] text-portal-muted truncate" title={sample}>
                        {sample ? <><span className="text-portal-muted/70 mr-1">sample:</span>{sample}</> : <span className="italic">(empty)</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
                <span className="text-xs font-semibold text-portal-sub uppercase tracking-wide">Preview</span>
                <span className="text-xs text-portal-muted">Showing {displayRows.length} of {derivedRows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-portal-border bg-portal-bg">
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">#</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Business Name</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Category</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Phone</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Website</th>
                      <th className="text-left px-4 py-2 text-portal-muted font-semibold">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-portal-bg">
                        <td className="px-4 py-2 text-portal-border-2">{i + 1}</td>
                        <td className="px-4 py-2 text-portal-text font-medium truncate max-w-[200px]">
                          {row.business_name as string}
                        </td>
                        <td className="px-4 py-2 text-portal-sub truncate max-w-[120px]">
                          {row.category as string ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-portal-muted">{row.phone as string ?? '—'}</td>
                        <td className="px-4 py-2 text-portal-muted truncate max-w-[120px]">
                          {row.website_url as string ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            row.listing_tier === 'featured' ? 'bg-portal-amber-lt text-portal-amber' :
                            row.listing_tier === 'enhanced' ? 'bg-portal-blue-lt text-portal-blue' :
                                                              'bg-portal-row-hover text-portal-sub'
                          }`}>
                            {row.listing_tier as string ?? 'community'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {derivedRows.length > 15 && (
                <button onClick={() => setShowAll(!showAll)}
                  className="w-full py-3 text-xs text-portal-muted hover:text-portal-sub flex items-center justify-center gap-1 border-t border-portal-border">
                  <ChevronDown size={13} className={showAll ? 'rotate-180' : ''} />
                  {showAll ? 'Show less' : `Show all ${derivedRows.length} rows`}
                </button>
              )}
            </div>

            {/* Progress bar during import */}
            {importing && (
              <div className="bg-white rounded-lg border border-portal-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-portal-blue animate-spin" />
                  <span className="text-sm text-portal-sub">{progress.done} / {progress.total} listings processed</span>
                </div>
                <div className="w-full bg-portal-row-hover rounded-full h-2">
                  <div className="bg-portal-blue h-2 rounded-full transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={runImport}
              disabled={importing || !guideType || !businessNameMapped || derivedRows.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-portal-navy hover:opacity-90 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing
                ? 'Importing…'
                : !guideType
                ? 'Select a guide type first'
                : !businessNameMapped
                ? 'Map a Business Name column first'
                : `${mode === 'merge' ? 'Merge' : 'Import'} ${derivedRows.length} listings → ${guideLabel}`
              }
            </button>
          </div>
        )}

        {/* Results */}
        {done && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { label: 'New',           value: totals.inserted,  color: 'text-portal-green', bg: 'bg-portal-green-lt border-portal-green/30' },
                { label: 'Merged',        value: totals.merged,    color: 'text-portal-blue',  bg: 'bg-portal-blue-lt border-portal-blue/30'   },
                { label: 'Unchanged',     value: totals.unchanged, color: 'text-portal-sub',   bg: 'bg-portal-bg border-portal-border'         },
                { label: 'Auto-linked',   value: totals.matched,   color: 'text-portal-blue',  bg: 'bg-portal-blue-lt border-portal-blue/30'   },
                { label: 'Skipped',       value: totals.skipped,   color: 'text-portal-sub',   bg: 'bg-portal-bg border-portal-border'         },
                { label: 'Errors',        value: totals.errors,    color: 'text-portal-red',   bg: 'bg-portal-red-lt border-portal-red/30'     },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-lg border p-4 text-center ${bg}`}>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-portal-sub mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
              <div className="divide-y divide-portal-border max-h-72 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === 'inserted'  ? 'bg-portal-green-lt text-portal-green' :
                      r.status === 'merged'    ? 'bg-portal-blue-lt text-portal-blue'   :
                      r.status === 'matched'   ? 'bg-portal-blue-lt text-portal-blue'   :
                      r.status === 'unchanged' ? 'bg-portal-row-hover text-portal-sub'  :
                      r.status === 'skipped'   ? 'bg-portal-row-hover text-portal-sub'  :
                                                 'bg-portal-red-lt text-portal-red'
                    }`}>{r.status}</span>
                    <span className="text-xs text-portal-text flex-1 truncate">{r.name}</span>
                    {r.status === 'merged' && r.filledFields && r.filledFields.length > 0 && (
                      <span className="text-[10px] text-portal-blue truncate max-w-xs">
                        filled: {r.filledFields.join(', ')}
                      </span>
                    )}
                    {r.message && <span className="text-[10px] text-portal-muted truncate max-w-xs">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2 text-sm text-portal-sub border border-portal-border-2 rounded-lg hover:bg-portal-bg">
                Import another guide CSV
              </button>
              <a href="/family-resource-guide" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-portal-blue border border-portal-border-2 rounded-lg hover:bg-portal-blue-lt">
                <ExternalLink size={14} />
                View {guideLabel}
              </a>
            </div>

            {(totals.inserted + totals.matched + totals.merged) > 0 && (
              <div className="bg-portal-green-lt border border-portal-green/30 rounded-lg px-4 py-3 text-sm text-portal-green">
                <strong>{totals.inserted + totals.matched} new</strong>
                {totals.merged > 0 && <> · <strong>{totals.merged} merged</strong></>}
                {' '}live in the <strong>{guideLabel}</strong>. Import the next guide CSV or go populate FRG categories.
              </div>
            )}
          </div>
        )}

        {/* Column mapping reference */}
        {!parsed && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-portal-muted hover:text-portal-sub select-none">
              Supported column names
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-portal-muted">
              {FIELD_PATTERNS.map(({ field, patterns }) => (
                <div key={field as string} className="flex gap-2">
                  <span className="font-mono text-portal-blue shrink-0">{field as string}</span>
                  <span className="text-portal-border-2">←</span>
                  <span>{patterns.slice(0, 3).join(', ')}</span>
                </div>
              ))}
              <div className="col-span-2 text-portal-border-2 mt-1">
                All other columns are stored in guide_data (JSON) for guide-specific fields.
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
