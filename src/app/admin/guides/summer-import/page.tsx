'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, X, ChevronDown } from 'lucide-react'
import type { SfgImportRow, SfgImportResult } from '@/app/api/guides/summer-import/route'

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(cell.trim()); cell = '' }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(cell.trim()); cell = ''
        if (row.some(c => c)) rows.push(row)
        row = []
        if (ch === '\r') i++
      } else {
        cell += ch
      }
    }
  }
  row.push(cell.trim())
  if (row.some(c => c)) rows.push(row)
  return rows
}

// ── Column normalisation ──────────────────────────────────────────────────────

const COL_MAP: Record<string, keyof SfgImportRow | '_skip'> = {
  category: 'category',
  cat: 'category',
  type: 'category',
  'business name': 'business_name',
  'business': 'business_name',
  name: 'business_name',
  'camp name': 'business_name',
  address: 'address',
  city: 'city',
  zip: 'zip',
  'zip code': 'zip',
  phone: 'phone',
  'phone number': 'phone',
  website: 'website',
  url: 'website',
  email: 'email',
  description: 'description',
  desc: 'description',
  about: 'description',
  ages: 'ages',
  'age range': 'ages',
  price: 'price_range',
  'price range': 'price_range',
  'price/week': 'price_range',
  'cost': 'price_range',
  setting: 'indoor_outdoor',
  'indoor/outdoor': 'indoor_outdoor',
  'indoor outdoor': 'indoor_outdoor',
  'registration status': 'registration_status',
  'reg status': 'registration_status',
  status: 'registration_status',
  'financial aid': 'financial_aid_available',
  'financial aid available': 'financial_aid_available',
  'before/after care': 'before_after_care',
  'before after care': 'before_after_care',
  'aftercare': 'before_after_care',
  'special needs': 'special_needs_friendly',
  'special needs friendly': 'special_needs_friendly',
  'faith based': 'faith_based',
  'faith-based': 'faith_based',
  'drop in': 'drop_in_available',
  'drop-in': 'drop_in_available',
  'drop in available': 'drop_in_available',
  director: 'camp_director_name',
  'camp director': 'camp_director_name',
  'director name': 'camp_director_name',
  'discount code': 'discount_code',
  'promo code': 'discount_code',
  instagram: 'instagram_url',
  'instagram url': 'instagram_url',
  'virtual tour': 'virtual_tour_url',
  tier: 'listing_tier',
  'listing tier': 'listing_tier',
  neighborhood: 'neighborhood_tag',
  'neighborhood tag': 'neighborhood_tag',
  area: 'neighborhood_tag',
  publication: 'publication',
  pub: 'publication',
}

function normalizeHeader(h: string): keyof SfgImportRow | '_skip' {
  return COL_MAP[h.toLowerCase().trim()] ?? '_skip'
}

const PRICE_MAP: Record<string, string> = {
  free: 'free', '$0': 'free',
  'under $100': 'under-100', 'under 100': 'under-100', '<$100': 'under-100', 'under100': 'under-100',
  '$100-$250': '100-250', '$100-250': '100-250', '100-250': '100-250',
  '$250+': '250-plus', '250+': '250-plus', 'over $250': '250-plus', '$250 +': '250-plus',
  varies: 'varies', 'variable': 'varies',
}

const INDOOR_MAP: Record<string, string> = {
  indoor: 'indoor', inside: 'indoor',
  outdoor: 'outdoor', outside: 'outdoor',
  both: 'both', 'indoor/outdoor': 'both', 'indoor & outdoor': 'both',
}

const STATUS_MAP: Record<string, string> = {
  open: 'open', 'registration open': 'open',
  waitlist: 'waitlist', 'wait list': 'waitlist',
  full: 'full',
  'opening soon': 'opening-soon', 'coming soon': 'opening-soon',
  tbd: 'tbd', '': 'open',
}

function parseBool(v: string): boolean {
  return ['yes', 'true', '1', 'y', 'x'].includes(v.toLowerCase().trim())
}

function normalizeRow(headers: Array<keyof SfgImportRow | '_skip'>, cells: string[]): SfgImportRow {
  const r: Record<string, unknown> = {}
  headers.forEach((key, i) => {
    if (key === '_skip') return
    const val = cells[i]?.trim() ?? ''
    if (key === 'price_range') r[key] = (PRICE_MAP[val.toLowerCase()] ?? val.toLowerCase()) || undefined
    else if (key === 'indoor_outdoor') r[key] = (INDOOR_MAP[val.toLowerCase()] ?? val.toLowerCase()) || undefined
    else if (key === 'registration_status') r[key] = STATUS_MAP[val.toLowerCase()] ?? 'open'
    else if (['financial_aid_available', 'before_after_care', 'special_needs_friendly', 'faith_based', 'drop_in_available'].includes(key))
      r[key] = val ? parseBool(val) : false
    else r[key] = val || undefined
  })
  return r as SfgImportRow
}

// Apply forward-fill to category column
function applyForwardFill(rows: SfgImportRow[]): SfgImportRow[] {
  let lastCat = ''
  return rows.map(row => {
    if (row.category?.trim()) lastCat = row.category.trim()
    return { ...row, category: lastCat }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

type ParsedState = {
  headers: Array<keyof SfgImportRow | '_skip'>
  rawHeaders: string[]
  rows: SfgImportRow[]
}

export default function SummerGuideImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [parsed, setParsed]       = useState<ParsedState | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<SfgImportResult | null>(null)
  const [showAll, setShowAll]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function processFile(file: File) {
    setResult(null); setError(null); setParsed(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const allRows = parseCSV(text)
        if (allRows.length < 2) { setError('CSV appears empty or has only a header row.'); return }
        const rawHeaders = allRows[0]
        const headers = rawHeaders.map(normalizeHeader)
        const dataRows = allRows.slice(1)
          .map(cells => normalizeRow(headers, cells))
          .filter(r => r.business_name?.trim())
        const filled = applyForwardFill(dataRows)
        setParsed({ headers, rawHeaders, rows: filled })
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
    if (!parsed) return
    setImporting(true); setResult(null); setError(null)
    try {
      const res = await fetch('/api/guides/summer-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows }),
      })
      if (!res.ok) { setError(`Server error ${res.status}`); return }
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setImporting(false)
    }
  }

  const displayRows = parsed ? (showAll ? parsed.rows : parsed.rows.slice(0, 15)) : []
  const unmapped = parsed ? parsed.rawHeaders.filter((_, i) => parsed.headers[i] === '_skip') : []

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Summer Fun Guide — CSV Import</h1>
        <p className="text-sm text-white/50 mt-1">
          Upload your spreadsheet. Category column is forward-filled automatically.
          Existing records (matched by business name) are updated; new records are inserted.
        </p>
      </div>

      {/* Upload zone */}
      {!parsed && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragging ? 'border-portal-blue/50 bg-portal-blue/10' : 'border-white/15 hover:border-white/30 hover:bg-white/3'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={32} className="mx-auto mb-3 text-white/30" />
          <p className="text-sm font-semibold text-white/70">Drop CSV file here or click to browse</p>
          <p className="text-xs text-white/30 mt-1">Exported from Excel or Google Sheets</p>
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
        <div className="mt-4 p-4 bg-portal-red/10 border border-portal-red/30 rounded-lg flex items-start gap-2 text-sm text-portal-red">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Parsed preview */}
      {parsed && !result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/60">
              <span className="font-semibold text-white">{parsed.rows.length}</span> rows ready to import
            </div>
            <button onClick={() => setParsed(null)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
              <X size={13} /> Reset
            </button>
          </div>

          {/* Unmapped columns warning */}
          {unmapped.length > 0 && (
            <div className="p-3 bg-portal-amber/10 border border-amber-500/30 rounded-lg text-xs text-portal-amber">
              <span className="font-semibold">Columns not recognised (will be skipped):</span>{' '}
              {unmapped.join(', ')}
            </div>
          )}

          {/* Preview table */}
          <div className="bg-white/3 border border-white/10 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Preview</span>
              <span className="text-xs text-white/30">Showing {displayRows.length} of {parsed.rows.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-4 py-2 text-white/40 font-semibold w-8">#</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">Category</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">Business Name</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">City</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">Tier</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">Phone</th>
                    <th className="text-left px-4 py-2 text-white/40 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-2 text-white/25">{i + 1}</td>
                      <td className="px-4 py-2 text-portal-blue font-medium">{row.category}</td>
                      <td className="px-4 py-2 text-white font-medium">{row.business_name}</td>
                      <td className="px-4 py-2 text-white/60">{row.city ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.listing_tier === 'advertiser' ? 'bg-portal-amber/20 text-portal-amber' :
                          row.listing_tier === 'enhanced'  ? 'bg-portal-blue/20 text-portal-blue' :
                                                              'bg-white/8 text-white/40'
                        }`}>
                          {row.listing_tier ?? 'community'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-white/60">{row.phone ?? '—'}</td>
                      <td className="px-4 py-2 text-white/60">{row.price_range ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.rows.length > 15 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 text-xs text-white/40 hover:text-white/70 flex items-center justify-center gap-1 border-t border-white/8 transition-colors"
              >
                <ChevronDown size={13} className={showAll ? 'rotate-180' : ''} />
                {showAll ? 'Show less' : `Show all ${parsed.rows.length} rows`}
              </button>
            )}
          </div>

          <button
            onClick={runImport}
            disabled={importing}
            className="flex items-center gap-2 px-6 py-3 bg-portal-navy hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {importing ? 'Importing...' : `Import ${parsed.rows.length} records`}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Inserted', value: result.inserted, color: 'text-portal-green' },
              { label: 'Updated',  value: result.updated,  color: 'text-portal-blue'  },
              { label: 'Skipped',  value: result.skipped,  color: 'text-white/40'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/3 border border-white/10 rounded-lg p-4 text-center">
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-white/40 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="bg-portal-red/10 border border-portal-red/20 rounded-lg p-4">
              <p className="text-xs font-semibold text-portal-red mb-2">{result.errors.length} error(s)</p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-portal-red/80">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white/3 border border-white/10 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Row Results</span>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {result.rowResults.map((r) => (
                <div key={r.row} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-white/25 w-8 shrink-0">{r.row}</span>
                  <span className="text-xs text-white flex-1">{r.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    r.status === 'ok'      ? 'bg-portal-green/20 text-portal-green' :
                    r.status === 'updated' ? 'bg-portal-blue/20 text-portal-blue'  :
                    r.status === 'skipped' ? 'bg-white/8 text-white/40'      :
                                             'bg-portal-red/20 text-portal-red'
                  }`}>
                    {r.status === 'ok' ? 'inserted' : r.status}
                  </span>
                  {r.message && <span className="text-[10px] text-white/30 ml-1 truncate max-w-xs">{r.message}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setParsed(null); setResult(null) }}
              className="px-4 py-2 text-sm text-white/60 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              Import another file
            </button>
            <a href="/admin/go/summer-fun-guide" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-portal-blue border border-portal-blue/30 rounded-lg hover:bg-portal-blue/10 transition-colors">
              <FileText size={14} />
              View Summer Fun Guide
            </a>
          </div>
        </div>
      )}

      {/* Column mapping reference */}
      <details className="mt-10">
        <summary className="cursor-pointer text-xs font-semibold text-white/30 hover:text-white/60 transition-colors select-none">
          Expected column headers
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(COL_MAP).map(([header, field]) => field !== '_skip' && (
            <div key={header} className="flex items-center gap-2 text-white/40">
              <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{header}</span>
              <span className="text-white/20">→</span>
              <span className="text-white/50">{field}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
