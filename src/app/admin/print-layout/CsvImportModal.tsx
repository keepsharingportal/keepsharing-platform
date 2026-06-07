// CSV import modal for /admin/print-layout.
//
// Three steps:
//   1. Upload — editor picks a file + target issue month.
//   2. Map    — editor confirms which CSV column maps to which field.
//               Auto-detection seeds sensible defaults from the header
//               names (Business / Design / Directory / Size / ...), so
//               for a tidy export the editor just hits Continue.
//   3. Plan   — server returns matched / fuzzy / new / duplicate per
//               row; editor confirms fuzzy candidates before commit.

'use client'

import { useMemo, useState } from 'react'
import { X, Upload, Check, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react'

type Step = 'upload' | 'map' | 'plan'
type RowStatus = 'matched' | 'fuzzy' | 'new' | 'duplicate'

// Canonical fields the editor can map a CSV column to. 'business' is
// required; everything else is optional. '' means 'ignore this column'.
const FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',              label: '— Ignore —' },
  { value: 'business',      label: 'Business name (required)' },
  { value: 'design',        label: 'Design (New / Pickup)' },
  { value: 'directory',     label: 'Directory (Yes/No)' },
  { value: 'size',          label: 'Size (page fraction)' },
  { value: 'layout',        label: 'Layout (horizontal/vertical/square)' },
  { value: 'price',         label: 'Price ($)' },
  { value: 'social_budget', label: 'Social budget ($)' },
  { value: 'layout_notes',  label: 'Layout notes' },
  { value: 'expires_month', label: 'Expires (YYYY-MM)' },
  { value: 'status',        label: 'Status (Ongoing / Check)' },
]

interface CsvRow {
  business:      string
  design?:       string
  directory?:    string
  size?:         string
  layout?:       string
  price?:        string
  social_budget?: string
  layout_notes?: string
  expires_month?: string
  status?:       string
}

interface PlannedRow {
  index:   number
  input:   CsvRow
  status:  RowStatus
  matched_id?:       string
  matched_name?:     string
  fuzzy_candidates?: Array<{ id: string; name: string; score: number }>
}

interface PlanResponse {
  ok:     boolean
  plan:   PlannedRow[]
  counts: { matched: number; fuzzy: number; new: number; duplicate: number }
  error?: string
}

interface Resolution {
  advertiser_id?: string
  create_new?:    { business_name: string }
  skip?:          boolean
}

interface Props {
  issue:        string
  monthOptions: string[]
  fmtIssue:     (m: string) => string
  onClose:      () => void
  onCommitted:  () => void
}

export function CsvImportModal({ issue, monthOptions, fmtIssue, onClose, onCommitted }: Props) {
  const [step, setStep]               = useState<Step>('upload')
  const [targetMonth, setTargetMonth] = useState(issue)
  // Raw grid from the file: rawRows[0] is the header row.
  const [rawRows, setRawRows]         = useState<string[][]>([])
  // Per-column canonical field assignment; index keyed.
  const [mapping, setMapping]         = useState<string[]>([])
  const [planning, setPlanning]       = useState(false)
  const [committing, setCommitting]   = useState(false)
  const [plan, setPlan]               = useState<PlannedRow[] | null>(null)
  const [counts, setCounts]           = useState<PlanResponse['counts'] | null>(null)
  const [error, setError]             = useState<string | null>(null)
  // Per-row resolutions keyed by source row index.
  const [resolutions, setResolutions] = useState<Record<number, Resolution>>({})

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPlan(null)
    setResolutions({})
    try {
      const text = await file.text()
      const grid = parseCsvGrid(text)
      if (grid.length < 2) {
        setError('CSV has no data rows.')
        setRawRows([])
        return
      }
      setRawRows(grid)
      // Seed mapping from auto-detection so the typical case is one click.
      const headers = grid[0]
      setMapping(headers.map(h => canonicalHeader(h)))
      setStep('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }

  // Build CsvRow[] from the rawRows + current column mapping. Skips
  // entirely blank rows + rows whose mapped business cell is empty.
  function buildRows(): CsvRow[] {
    if (rawRows.length < 2) return []
    const data = rawRows.slice(1)
    const out: CsvRow[] = []
    for (const cells of data) {
      if (cells.length === 0 || cells.every(c => c.trim() === '')) continue
      const obj: Record<string, string> = {}
      for (let c = 0; c < mapping.length; c++) {
        const key = mapping[c]
        if (!key) continue
        const val = (cells[c] ?? '').trim()
        if (val) obj[key] = val
      }
      if (!obj.business) continue
      out.push(obj as unknown as CsvRow)
    }
    return out
  }

  async function onPlan() {
    const rows = buildRows()
    if (rows.length === 0) {
      setError('No usable rows. Map a column to Business name and try again.')
      return
    }
    if (!mapping.includes('business')) {
      setError('Map at least one column to Business name.')
      return
    }
    setPlanning(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/print-placements/import-csv', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'plan', issue_month: targetMonth, rows }),
      })
      const json = await res.json() as PlanResponse
      if (!res.ok || !json.ok) {
        setError(json.error ?? `HTTP ${res.status}`)
        return
      }
      setPlan(json.plan)
      setCounts(json.counts)
      // Seed resolutions: matched/new auto-decide; fuzzy defaults to
      // top candidate so the editor can scan + correct outliers fast.
      const seed: Record<number, Resolution> = {}
      for (const p of json.plan) {
        if (p.status === 'matched' && p.matched_id)   seed[p.index] = { advertiser_id: p.matched_id }
        else if (p.status === 'new')                  seed[p.index] = { create_new: { business_name: p.input.business } }
        else if (p.status === 'duplicate')            seed[p.index] = { skip: true }
        else if (p.status === 'fuzzy' && p.fuzzy_candidates?.[0]) {
          seed[p.index] = { advertiser_id: p.fuzzy_candidates[0].id }
        }
      }
      setResolutions(seed)
      setStep('plan')
    } finally {
      setPlanning(false)
    }
  }

  function setResolution(idx: number, r: Resolution) {
    setResolutions(prev => ({ ...prev, [idx]: r }))
  }

  async function onCommit() {
    if (!plan) return
    setCommitting(true)
    setError(null)
    try {
      const resolutionList = plan
        .filter(p => p.status !== 'duplicate' || resolutions[p.index]?.skip === false)
        .map(p => ({ row: p.input, ...(resolutions[p.index] ?? { skip: true }) }))
      const res = await fetch('/api/admin/print-placements/import-csv', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'commit', issue_month: targetMonth, resolutions: resolutionList }),
      })
      const json = await res.json() as {
        ok: boolean; createdPlacements: number; createdAdvertisers: number;
        newAdvertiserNames: string[]; skippedDuplicate: number; skippedByEditor: number;
        errors: string[]; error?: string;
      }
      if (!res.ok && !json.errors) {
        setError(json.error ?? `HTTP ${res.status}`)
        return
      }
      const lines = [
        `${json.createdPlacements} placement${json.createdPlacements === 1 ? '' : 's'} added to ${fmtIssue(targetMonth)}`,
        json.createdAdvertisers > 0 && `${json.createdAdvertisers} new advertiser${json.createdAdvertisers === 1 ? '' : 's'} created`,
        json.skippedDuplicate > 0 && `${json.skippedDuplicate} skipped (already on ${fmtIssue(targetMonth)})`,
        json.skippedByEditor > 0 && `${json.skippedByEditor} skipped (editor)`,
        json.errors.length > 0 && `${json.errors.length} error${json.errors.length === 1 ? '' : 's'} — see console`,
      ].filter(Boolean) as string[]
      window.alert(lines.join('\n'))
      if (json.errors.length > 0) console.warn('[import-csv]', json.errors)
      onCommitted()
      onClose()
    } finally {
      setCommitting(false)
    }
  }

  const visiblePlan = useMemo(() => plan ?? [], [plan])
  const needsAttention = visiblePlan.filter(p => p.status === 'fuzzy').length
  const headers = rawRows[0] ?? []
  const sampleRow = rawRows[1] ?? []
  const dataRowCount = Math.max(0, rawRows.length - 1)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-5 my-8 space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-1.5">
            <Upload size={14} /> Import CSV
            <StepPill step={step} />
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={14} /></button>
        </header>

        {/* Step 1 — file + month */}
        {step === 'upload' && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFile}
                  className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-100 file:text-xs file:font-semibold hover:file:bg-gray-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Target issue</label>
                <select
                  value={targetMonth}
                  onChange={e => setTargetMonth(e.target.value)}
                  className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
                >
                  {monthOptions.map(m => <option key={m} value={m}>{fmtIssue(m)}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 inline-flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
          </>
        )}

        {/* Step 2 — column mapping */}
        {step === 'map' && (
          <>
            <p className="text-xs text-gray-500">
              {dataRowCount} data row{dataRowCount === 1 ? '' : 's'} detected. Confirm which CSV column maps to which field. Unmapped columns are ignored.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">CSV column</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Sample value</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 font-bold text-gray-900">
                        {h || <span className="text-gray-400 italic">(blank header)</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 truncate max-w-[180px]" title={sampleRow[i] ?? ''}>
                        {sampleRow[i] ?? ''}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping[i] ?? ''}
                          onChange={e => setMapping(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                          className="block text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer"
                        >
                          {FIELD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={planning}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft size={12} /> Back
              </button>
              <button
                type="button"
                onClick={onPlan}
                disabled={planning}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
              >
                {planning ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {planning ? 'Analyzing…' : 'Preview import'}
              </button>
              {error && <span className="text-xs text-rose-600 inline-flex items-center gap-1"><AlertCircle size={12}/> {error}</span>}
            </div>
          </>
        )}

        {/* Step 3 — plan summary + fuzzy resolutions */}
        {step === 'plan' && plan && counts && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {counts.matched} matched
              </span>
              {counts.fuzzy > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  {counts.fuzzy} need confirm
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                {counts.new} new advertiser{counts.new === 1 ? '' : 's'}
              </span>
              {counts.duplicate > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                  {counts.duplicate} already on issue (skipped)
                </span>
              )}
            </div>

            {needsAttention > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900 mb-2">Review {needsAttention} fuzzy match{needsAttention === 1 ? '' : 'es'}</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {visiblePlan.filter(p => p.status === 'fuzzy').map(p => (
                    <FuzzyRow
                      key={p.index}
                      planned={p}
                      resolution={resolutions[p.index]}
                      onChange={r => setResolution(p.index, r)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setStep('map')}
                disabled={committing}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft size={12} /> Back
              </button>
              <button
                type="button"
                onClick={onCommit}
                disabled={committing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
              >
                {committing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {committing ? 'Importing…' : `Import to ${fmtIssue(targetMonth)}`}
              </button>
              <button
                type="button"
                onClick={() => { setPlan(null); setCounts(null); setResolutions({}); setStep('map') }}
                disabled={committing}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-900"
              >
                <RefreshCw size={12} /> Re-analyze
              </button>
              {error && <span className="text-xs text-rose-600 inline-flex items-center gap-1"><AlertCircle size={12}/> {error}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepPill({ step }: { step: Step }) {
  const labels: Record<Step, string> = { upload: '1 of 3', map: '2 of 3', plan: '3 of 3' }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      {labels[step]}
    </span>
  )
}

// FuzzyRow — radio buttons for one ambiguous row. Editor picks a
// candidate, creates new, or skips entirely.
function FuzzyRow({ planned, resolution, onChange }: {
  planned:    PlannedRow
  resolution: Resolution | undefined
  onChange:   (r: Resolution) => void
}) {
  const picked = resolution?.advertiser_id ?? (resolution?.create_new ? '__new__' : resolution?.skip ? '__skip__' : '')
  return (
    <div className="rounded-lg border border-amber-100 bg-white p-2.5 text-xs">
      <p className="font-bold text-gray-900">{planned.input.business}</p>
      <div className="mt-1.5 space-y-1">
        {(planned.fuzzy_candidates ?? []).map(c => (
          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`r-${planned.index}`}
              checked={picked === c.id}
              onChange={() => onChange({ advertiser_id: c.id })}
            />
            <span>Use existing: <b>{c.name}</b></span>
            <span className="ml-auto text-[10px] text-gray-400">{Math.round(c.score * 100)}% match</span>
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`r-${planned.index}`}
            checked={picked === '__new__'}
            onChange={() => onChange({ create_new: { business_name: planned.input.business } })}
          />
          <span>Create new advertiser: <b>{planned.input.business}</b></span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-gray-500">
          <input
            type="radio"
            name={`r-${planned.index}`}
            checked={picked === '__skip__'}
            onChange={() => onChange({ skip: true })}
          />
          <span>Skip this row</span>
        </label>
      </div>
    </div>
  )
}

// Minimal CSV parser — handles quoted cells with embedded commas, CRLF,
// and double-quote escapes. Returns the raw grid; mapping happens later.
function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (ch === '\r') { /* skip */ }
      else cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

// Map a CSV header cell to our canonical field name (auto-detection
// for the mapping step's defaults). Returns '' for headers we don't
// recognize — the editor maps them by hand.
function canonicalHeader(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ')
  if (s === 'business' || s === 'business name' || s === 'advertiser' || s === 'company') return 'business'
  if (s === 'design')                                                                      return 'design'
  if (s === 'directory' || s === 'in directory')                                           return 'directory'
  if (s === 'size')                                                                        return 'size'
  if (s === 'layout')                                                                      return 'layout'
  if (s === 'price' || s === 'cost' || s === 'amount')                                     return 'price'
  if (s === 'social' || s === 'social budget')                                             return 'social_budget'
  if (s === 'layout notes' || s === 'notes layout' || s === 'note' || s === 'notes')       return 'layout_notes'
  if (s === 'expires' || s === 'expires month' || s === 'expire')                          return 'expires_month'
  if (s === 'status' || s === 'run schedule' || s === 'schedule')                          return 'status'
  return ''
}
