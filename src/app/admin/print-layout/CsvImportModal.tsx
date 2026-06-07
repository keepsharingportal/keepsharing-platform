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
import {
  coerceBool, coerceDesign, coerceExpires, coerceLayout,
  coerceMoney, coerceSize, coerceStatus,
} from './csv-coerce'

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
  advertisers:  Array<{ id: string; business_name: string }>
  onClose:      () => void
  onCommitted:  () => void
}

export function CsvImportModal({ issue, monthOptions, fmtIssue, advertisers, onClose, onCommitted }: Props) {
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
      // Seed resolutions:
      //   matched   → auto-attach (clean exact match, no review needed)
      //   duplicate → auto-skip (advertiser already has a row on issue)
      //   fuzzy     → seed top candidate but surface for review
      //   new       → NO seed. The editor must consciously type or
      //               pick a canonical business — auto-defaulting to
      //               the CSV's 'Business' cell silently pollutes
      //               advertiser_accounts with ad-variant names (the
      //               cell is usually the ad's display label, not the
      //               canonical business). Leaving the resolution
      //               undefined forces a deliberate choice; the
      //               commit step rejects rows without one.
      const seed: Record<number, Resolution> = {}
      for (const p of json.plan) {
        if (p.status === 'matched' && p.matched_id)   seed[p.index] = { advertiser_id: p.matched_id }
        else if (p.status === 'duplicate')            seed[p.index] = { skip: true }
        else if (p.status === 'fuzzy' && p.fuzzy_candidates?.[0]) {
          seed[p.index] = { advertiser_id: p.fuzzy_candidates[0].id }
        }
        // p.status === 'new' → left undefined intentionally
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
  // Both 'fuzzy' and 'new' need editor input. 'matched' is silent
  // auto-attach; 'duplicate' is silent auto-skip.
  const reviewRows = visiblePlan.filter(p => p.status === 'fuzzy' || p.status === 'new')
  // Unresolved rows = 'new' (no fuzzy candidates) rows the editor
  // hasn't typed/picked a business for. Block commit until every one
  // is resolved (either named or explicitly skipped) — silently
  // skipping them at commit would lose placements without a warning.
  const unresolvedNewCount = visiblePlan.filter(p => {
    if (p.status !== 'new') return false
    const r = resolutions[p.index]
    if (!r) return true
    return !r.advertiser_id && !r.create_new && !r.skip
  }).length
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
                      <td className="px-3 py-2 text-gray-500 max-w-[260px]">
                        <div className="truncate" title={sampleRow[i] ?? ''}>{sampleRow[i] ?? ''}</div>
                        <PreviewCoerce field={mapping[i] ?? ''} raw={sampleRow[i] ?? ''} />
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
                {counts.matched} auto-matched
              </span>
              {counts.fuzzy > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  {counts.fuzzy} fuzzy
                </span>
              )}
              {counts.new > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                  {counts.new} no match
                </span>
              )}
              {counts.duplicate > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                  {counts.duplicate} already on issue (skipped)
                </span>
              )}
            </div>

            {reviewRows.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900 mb-2">
                  Review {reviewRows.length} row{reviewRows.length === 1 ? '' : 's'}
                  <span className="font-normal ml-1 text-amber-700">— pick existing business or type a new one</span>
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {reviewRows.map(p => (
                    <ReviewRow
                      key={p.index}
                      planned={p}
                      resolution={resolutions[p.index]}
                      advertisers={advertisers}
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
                disabled={committing || unresolvedNewCount > 0}
                title={unresolvedNewCount > 0
                  ? `${unresolvedNewCount} no-match row${unresolvedNewCount === 1 ? '' : 's'} still need a business name or Skip`
                  : ''}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
              >
                {committing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {committing ? 'Importing…' : `Import to ${fmtIssue(targetMonth)}`}
              </button>
              {unresolvedNewCount > 0 && (
                <span className="text-xs text-amber-700 inline-flex items-center gap-1">
                  <AlertCircle size={12}/>
                  {unresolvedNewCount} no-match row{unresolvedNewCount === 1 ? '' : 's'} still need a business name or Skip
                </span>
              )}
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

// PreviewCoerce — small '→ value' hint under the raw sample, so the
// editor can see at a glance how 'Pick-up' becomes 'pickup', '1/4'
// becomes 0.25, 'Jul 2026' becomes 2026-07, etc. For fields with no
// coercion (business / layout_notes), prints nothing. Renders muted
// when the raw == coerced (no transformation) and emerald when the
// coercion changed the value (e.g. 'Pick-up → pickup').
function PreviewCoerce({ field, raw }: { field: string; raw: string }) {
  if (!field || !raw) return null
  const txt = previewFor(field, raw)
  if (txt == null) return null
  const [coerced, changed] = txt
  if (!changed && field !== 'expires_month') return null         // hide noise
  return (
    <div className={`mt-0.5 text-[10px] font-mono inline-flex items-center gap-1 ${changed ? 'text-emerald-600' : 'text-gray-400'}`}>
      → {coerced}
    </div>
  )
}

// Returns [display string, didCoercionChangeValue]. The 'changed'
// flag drives the green vs grey visual: green = we transformed the
// cell, grey = it was already canonical.
function previewFor(field: string, raw: string): [string, boolean] | null {
  switch (field) {
    case 'design': {
      const c = coerceDesign(raw)
      return [c, c !== raw.trim().toLowerCase()]
    }
    case 'directory': {
      const c = coerceBool(raw)
      return [c ? 'Yes' : 'No', String(c) !== raw.trim().toLowerCase()]
    }
    case 'size': {
      const c = coerceSize(raw)
      return [String(c), String(c) !== raw.trim()]
    }
    case 'layout': {
      const c = coerceLayout(raw)
      return [c ?? '(none)', (c ?? '') !== raw.trim().toLowerCase()]
    }
    case 'price':
    case 'social_budget': {
      const c = coerceMoney(raw)
      return [c == null ? '(none)' : `$${c}`, true]
    }
    case 'expires_month': {
      const c = coerceExpires(raw)
      return [c ?? '(invalid)', true]
    }
    case 'status': {
      const c = coerceStatus(raw)
      return [c ? 'Ongoing' : 'Check Status', true]
    }
    default: return null
  }
}

function StepPill({ step }: { step: Step }) {
  const labels: Record<Step, string> = { upload: '1 of 3', map: '2 of 3', plan: '3 of 3' }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      {labels[step]}
    </span>
  )
}

// ReviewRow — one ambiguous CSV row. Editor confirms which business
// the ad attaches to:
//   - Pick from the algorithm's fuzzy suggestions (if any)
//   - Type a custom business name → server attaches to existing if it
//     matches an exact name (case-insensitive), creates new otherwise.
//     A <datalist> of every advertiser gives typeahead suggestions so
//     'Macon East' completes to 'Macon East Academy' as she types.
//   - Skip the row entirely.
//
// The CSV's original business cell (the AD name like 'Macon East
// Academy Senior Ad') is preserved on the placement as ad_label —
// this control only decides which canonical business it attaches to.
function ReviewRow({ planned, resolution, advertisers, onChange }: {
  planned:    PlannedRow
  resolution: Resolution | undefined
  advertisers: Array<{ id: string; business_name: string }>
  onChange:   (r: Resolution) => void
}) {
  // Visible name in the input. For 'fuzzy' rows we pre-fill with the
  // top candidate's name (so the editor can switch modes by typing).
  // For 'new' rows (no candidate, no match) we leave it BLANK — the
  // CSV's business cell is usually the AD name, not the canonical
  // business, so auto-defaulting it pollutes advertiser_accounts with
  // ad-variant rows. Blank forces the editor to type / pick a clean
  // canonical name.
  const seedCustomName =
    resolution?.create_new?.business_name
    ?? (resolution?.advertiser_id
          ? advertisers.find(a => a.id === resolution.advertiser_id)?.business_name ?? ''
          : '')
  const [customName, setCustomName] = useState<string>(seedCustomName)

  const picked = resolution?.advertiser_id
    ? `existing:${resolution.advertiser_id}`
    : resolution?.create_new ? '__custom__'
    : resolution?.skip ? '__skip__' : ''

  // Editor typed a name. Always treats it as 'create new with this
  // name' — the radio state stays on the custom row so the editor
  // sees they're typing, not auto-jumping into an existing radio.
  // The server still attaches to an exact-match existing advertiser
  // at commit time (case-insensitive on business_name), so typing the
  // exact name of an existing advertiser still attaches instead of
  // creating a dup; the radio visual is just consistent.
  function onCustomChange(v: string) {
    setCustomName(v)
    const trimmed = v.trim()
    // Blank → resolution is unset, forcing the editor to either fill
    // in a name or pick Skip. Without this the create_new would carry
    // the empty string and the commit would fail mid-import.
    if (!trimmed) {
      onChange({})
      return
    }
    onChange({ create_new: { business_name: trimmed } })
  }

  return (
    <div className="rounded-lg border border-amber-100 bg-white p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-gray-900">{planned.input.business}</p>
        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${planned.status === 'new' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
          {planned.status === 'new' ? 'No match' : 'Fuzzy'}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {(planned.fuzzy_candidates ?? []).map(c => (
          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`r-${planned.index}`}
              checked={picked === `existing:${c.id}`}
              onChange={() => { setCustomName(c.name); onChange({ advertiser_id: c.id }) }}
            />
            <span>Use existing: <b>{c.name}</b></span>
            <span className="ml-auto text-[10px] text-gray-400">{Math.round(c.score * 100)}% match</span>
          </label>
        ))}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name={`r-${planned.index}`}
            className="mt-1"
            checked={picked === '__custom__'}
            onChange={() => onCustomChange(customName)}
          />
          <span className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
              Business name (type or pick)
            </span>
            <input
              type="text"
              list={`adv-${planned.index}`}
              value={customName}
              onChange={e => onCustomChange(e.target.value)}
              placeholder="Canonical business name…"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white"
            />
            <datalist id={`adv-${planned.index}`}>
              {advertisers.map(a => <option key={a.id} value={a.business_name} />)}
            </datalist>
          </span>
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
