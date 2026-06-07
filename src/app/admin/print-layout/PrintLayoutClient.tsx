'use client'

// PrintLayoutClient — the interactive Print Layout sheet.
//
// Mounted by /admin/print-layout. Renders the issue-month picker, the
// editable table of placements for that issue, the Add Row form, the
// Clone From Last Month action, and Print + Download triggers.
//
// All edits go through /api/admin/print-placements/* endpoints; the
// client maintains its own row list and syncs back on each save so the
// editor sees changes immediately without a page refresh.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Printer, Download, ChevronLeft, ChevronRight, Plus, Trash2,
  Copy, RefreshCw, Check, X, Pencil,
} from 'lucide-react'

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface PrintPlacement {
  id:                    string
  advertiser_account_id: string
  business_name:         string
  issue_month:           string
  design:                string
  directory:             boolean
  size:                  number
  layout:                string | null
  price:                 number | null
  social_budget:         number | null
  layout_notes:          string | null
  specific_months:       string[] | null
  expires_month:         string | null
  notes:                 string | null
}

export interface AdvertiserOption {
  id:            string
  business_name: string
}

interface Props {
  issue:          string  // YYYY-MM
  prevMonth:      string
  nextMonth:      string
  prevMonthCount: number  // placements on prev issue (drives Clone button copy)
  initial:        PrintPlacement[]
  advertisers:    AdvertiserOption[]
  tableMissing:   boolean
}

// ── Constants ───────────────────────────────────────────────────────────────

const SIZE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1,    label: 'Full (1)'     },
  { value: 0.66, label: '2/3 (0.66)'   },
  { value: 0.5,  label: '1/2 (0.5)'    },
  { value: 0.33, label: '1/3 (0.33)'   },
  { value: 0.25, label: '1/4 (0.25)'   },
  { value: 0.16, label: '1/6 (0.16)'   },
  { value: 0.12, label: '1/8 (0.12)'   },
]

const SOCIAL_PRESETS = [25, 30, 50, 75, 100, 150]

const LAYOUT_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null,         label: '—' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical',   label: 'Vertical'   },
  { value: 'square',     label: 'Square'     },
]

const DESIGN_OPTIONS = ['new', 'pickup'] as const

// ── Month helpers ───────────────────────────────────────────────────────────

function fmtIssue(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function shortMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Build 18 months out from a given anchor (current + 17 ahead). Used for
// the multi-select "specific months purchased" picker.
function build18Months(anchor: string): string[] {
  const [y, m] = anchor.split('-').map(s => parseInt(s, 10))
  const out: string[] = []
  for (let i = 0; i < 18; i++) {
    const d = new Date(y, m - 1 + i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

// ── Component ───────────────────────────────────────────────────────────────

export function PrintLayoutClient({ issue, prevMonth, nextMonth, prevMonthCount, initial, advertisers, tableMissing }: Props) {
  const router = useRouter()
  const [rows, setRows]       = useState<PrintPlacement[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding,  setAdding]  = useState(false)
  const [busy, startTransition] = useTransition()

  function navigateIssue(targetMonth: string) {
    router.push(`/admin/print-layout?issue=${encodeURIComponent(targetMonth)}`)
  }

  async function onClone() {
    if (!confirm(`Clone every committed placement from ${fmtIssue(prevMonth)} into ${fmtIssue(issue)}? Expired commitments and duplicates are skipped.`)) return
    startTransition(async () => {
      const res = await fetch('/api/admin/print-placements/clone-month', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from_month: prevMonth, to_month: issue }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(json?.error ?? `HTTP ${res.status}`)
        return
      }
      const parts: string[] = []
      if (json.created)          parts.push(`${json.created} added`)
      if (json.skippedExpired)   parts.push(`${json.skippedExpired} expired`)
      if (json.skippedDuplicate) parts.push(`${json.skippedDuplicate} already here`)
      window.alert(parts.length > 0 ? parts.join(' · ') : 'Nothing to clone')
      router.refresh()
    })
  }

  function onDelete(id: string, name: string) {
    if (!confirm(`Delete the print placement for "${name}" from ${fmtIssue(issue)}?`)) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/print-placements/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        window.alert(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setRows(prev => prev.filter(r => r.id !== id))
    })
  }

  async function onSave(id: string, patch: Partial<PrintPlacement>): Promise<boolean> {
    const res = await fetch(`/api/admin/print-placements/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.placement) { window.alert(json?.error ?? `HTTP ${res.status}`); return false }
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...json.placement, business_name: r.business_name } : r))
    return true
  }

  async function onAdd(form: AddFormShape): Promise<boolean> {
    const res = await fetch('/api/admin/print-placements', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, issue_month: issue }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.placement) { window.alert(json?.error ?? `HTTP ${res.status}`); return false }
    const adv = advertisers.find(a => a.id === form.advertiser_account_id)
    setRows(prev => [...prev, { ...json.placement, business_name: adv?.business_name ?? '' }])
    return true
  }

  const totalPages   = rows.reduce((s, r) => s + r.size, 0)
  const totalRevenue = rows.reduce((s, r) => s + (r.price ?? 0), 0)
  const totalSocial  = rows.reduce((s, r) => s + (r.social_budget ?? 0), 0)

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateIssue(prevMonth)} className="p-1.5 rounded-lg hover:bg-gray-100" title={`Previous: ${fmtIssue(prevMonth)}`}>
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Print Layout — {fmtIssue(issue)}</h1>
              <p className="text-xs text-gray-500">
                {rows.length} {rows.length === 1 ? 'placement' : 'placements'}
                {' · '}{totalPages.toFixed(2)} pages
                {' · '}${totalRevenue.toLocaleString()} revenue
                {totalSocial > 0 && (<> · ${totalSocial.toLocaleString()} social</>)}
              </p>
            </div>
            <button onClick={() => navigateIssue(nextMonth)} className="p-1.5 rounded-lg hover:bg-gray-100" title={`Next: ${fmtIssue(nextMonth)}`}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setAdding(v => !v); setEditing(null) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700"
            >
              <Plus size={14} /> Add Placement
            </button>
            <button
              type="button"
              onClick={onClone}
              disabled={busy || prevMonthCount === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-40"
              title={prevMonthCount === 0
                ? `Nothing to clone — ${fmtIssue(prevMonth)} is empty`
                : `Clone ${prevMonthCount} placement(s) from ${fmtIssue(prevMonth)}`}
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
              Clone from {shortMonth(prevMonth)} {prevMonthCount > 0 && `(${prevMonthCount})`}
            </button>
            <a
              href={`/api/admin/print-placements/export?issue_month=${encodeURIComponent(issue)}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              title="Download CSV"
            >
              <Download size={14} /> CSV
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              title="Print this view"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Migration banner — until 129 is applied. */}
        {tableMissing && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Migration 129 not applied yet</p>
            <p className="text-xs mt-1">
              Apply <code className="px-1 bg-amber-100 rounded">supabase/migrations/129_print_ad_placements.sql</code> in Supabase Studio. The page works without it; the table just stays empty.
            </p>
          </div>
        )}
      </div>

      {adding && (
        <AddRowForm
          advertisers={advertisers}
          issue={issue}
          onCancel={() => setAdding(false)}
          onSubmit={async form => {
            const ok = await onAdd(form)
            if (ok) setAdding(false)
          }}
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 print:px-0 print:py-0">
        {rows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500 print:hidden">
            No placements for {fmtIssue(issue)} yet.{' '}
            {prevMonthCount > 0
              ? <>Clone {prevMonthCount} from {fmtIssue(prevMonth)} or add the first one.</>
              : <>Add the first placement.</>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden print:border-0 print:rounded-none">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-600">
                <tr className="text-left">
                  <th className="px-4 py-2 font-semibold">Business</th>
                  <th className="px-3 py-2 font-semibold">Design</th>
                  <th className="px-3 py-2 font-semibold">Dir.</th>
                  <th className="px-3 py-2 font-semibold">Size</th>
                  <th className="px-3 py-2 font-semibold">Layout</th>
                  <th className="px-3 py-2 font-semibold text-right">Price</th>
                  <th className="px-3 py-2 font-semibold text-right">Social</th>
                  <th className="px-3 py-2 font-semibold">Months</th>
                  <th className="px-3 py-2 font-semibold">Expires</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                  <th className="px-3 py-2 font-semibold print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => editing === r.id ? (
                  <EditRow
                    key={r.id}
                    row={r}
                    issue={issue}
                    onCancel={() => setEditing(null)}
                    onSubmit={async patch => {
                      const ok = await onSave(r.id, patch)
                      if (ok) setEditing(null)
                    }}
                  />
                ) : (
                  <ReadRow
                    key={r.id}
                    row={r}
                    onEdit={() => { setEditing(r.id); setAdding(false) }}
                    onDelete={() => onDelete(r.id, r.business_name)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Read-only row ───────────────────────────────────────────────────────────

function ReadRow({ row, onEdit, onDelete }: { row: PrintPlacement; onEdit: () => void; onDelete: () => void }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
      <td className="px-4 py-2 font-bold text-gray-900">{row.business_name}</td>
      <td className="px-3 py-2 text-xs capitalize">{row.design}</td>
      <td className="px-3 py-2 text-xs">{row.directory ? 'Yes' : '—'}</td>
      <td className="px-3 py-2 text-xs tabular-nums">{row.size}</td>
      <td className="px-3 py-2 text-xs capitalize">{row.layout ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-right tabular-nums">{row.price != null ? `$${row.price.toLocaleString()}` : '—'}</td>
      <td className="px-3 py-2 text-xs text-right tabular-nums">{row.social_budget != null ? `$${row.social_budget.toLocaleString()}` : '—'}</td>
      <td className="px-3 py-2 text-[10px] text-gray-500 truncate max-w-[140px]">
        {(row.specific_months ?? []).map(m => shortMonth(m)).join(', ') || '—'}
      </td>
      <td className="px-3 py-2 text-[11px] text-gray-600">{row.expires_month ? shortMonth(row.expires_month) : '—'}</td>
      <td className="px-3 py-2 text-[11px] text-gray-500 truncate max-w-[180px]" title={row.layout_notes ?? ''}>
        {row.layout_notes ?? '—'}
      </td>
      <td className="px-3 py-2 print:hidden">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-200 text-gray-500" aria-label="Edit">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" aria-label="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Edit row (inline) ───────────────────────────────────────────────────────

interface PatchShape {
  design?:          string
  directory?:       boolean
  size?:            number
  layout?:          string | null
  price?:           number | null
  social_budget?:   number | null
  layout_notes?:    string | null
  specific_months?: string[]
  expires_month?:   string | null
  notes?:           string | null
}

function EditRow({ row, issue, onCancel, onSubmit }: {
  row:      PrintPlacement
  issue:    string
  onCancel: () => void
  onSubmit: (patch: PatchShape) => Promise<void>
}) {
  const monthOptions = build18Months(issue)
  const [design,   setDesign]   = useState(row.design)
  const [directory, setDirectory] = useState(row.directory)
  const [size,     setSize]     = useState(row.size)
  const [layout,   setLayout]   = useState<string | null>(row.layout)
  const [price,    setPrice]    = useState<string>(row.price       != null ? String(row.price)         : '')
  const [social,   setSocial]   = useState<string>(row.social_budget != null ? String(row.social_budget) : '')
  const [layoutNotes, setLayoutNotes] = useState(row.layout_notes ?? '')
  const [months,   setMonths]   = useState<string[]>(row.specific_months ?? [])
  const [expires,  setExpires]  = useState<string>(row.expires_month ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onSubmit({
        design,
        directory,
        size,
        layout,
        price:           price.trim()  === '' ? null : Number(price),
        social_budget:   social.trim() === '' ? null : Number(social),
        layout_notes:    layoutNotes.trim() || null,
        specific_months: months,
        expires_month:   expires || null,
      })
    } finally { setSaving(false) }
  }

  function toggleMonth(m: string) {
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const inp = 'w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400'

  return (
    <tr className="border-b border-gray-100 bg-amber-50/60">
      <td className="px-4 py-2 font-bold text-gray-900 align-top">{row.business_name}</td>
      <td className="px-3 py-2 align-top">
        <select value={design} onChange={e => setDesign(e.target.value)} className={inp}>
          {DESIGN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <label className="inline-flex items-center gap-1 cursor-pointer text-xs">
          <input type="checkbox" checked={directory} onChange={e => setDirectory(e.target.checked)} />
          {directory ? 'Yes' : 'No'}
        </label>
      </td>
      <td className="px-3 py-2 align-top">
        <select value={size} onChange={e => setSize(parseFloat(e.target.value))} className={inp}>
          {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <select
          value={layout ?? ''}
          onChange={e => setLayout(e.target.value || null)}
          className={inp}
        >
          {LAYOUT_OPTIONS.map(l => <option key={l.label} value={l.value ?? ''}>{l.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={`${inp} text-right`} />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-1">
          <select
            value={SOCIAL_PRESETS.includes(Number(social)) ? social : 'custom'}
            onChange={e => {
              if (e.target.value !== 'custom') setSocial(e.target.value)
            }}
            className={inp}
          >
            <option value="">—</option>
            {SOCIAL_PRESETS.map(v => <option key={v} value={v}>${v}</option>)}
            <option value="custom">Custom…</option>
          </select>
          <input type="number" value={social} onChange={e => setSocial(e.target.value)} placeholder="custom $" className={`${inp} text-right`} />
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <details className="text-xs">
          <summary className="cursor-pointer text-primary">
            {months.length > 0 ? `${months.length} month${months.length === 1 ? '' : 's'}` : 'Pick months'}
          </summary>
          <div className="mt-1 grid grid-cols-3 gap-x-1 gap-y-0.5 max-h-40 overflow-y-auto p-1 bg-white border border-gray-200 rounded">
            {monthOptions.map(m => (
              <label key={m} className="inline-flex items-center gap-1 text-[10px] cursor-pointer">
                <input type="checkbox" checked={months.includes(m)} onChange={() => toggleMonth(m)} />
                {shortMonth(m)}
              </label>
            ))}
          </div>
        </details>
      </td>
      <td className="px-3 py-2 align-top">
        <select value={expires} onChange={e => setExpires(e.target.value)} className={inp}>
          <option value="">—</option>
          {monthOptions.map(m => <option key={m} value={m}>{shortMonth(m)}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        <input value={layoutNotes} onChange={e => setLayoutNotes(e.target.value)} placeholder="Layout notes" className={inp} />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40"
          >
            {saving ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
            Save
          </button>
          <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={11} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Add row form (full-width above the table) ───────────────────────────────

interface AddFormShape {
  advertiser_account_id: string
  design:                string
  directory:             boolean
  size:                  number
  layout:                string | null
  price:                 number | null
  social_budget:         number | null
  layout_notes:          string | null
  specific_months:       string[]
  expires_month:         string | null
}

function AddRowForm({ advertisers, issue, onCancel, onSubmit }: {
  advertisers: AdvertiserOption[]
  issue:       string
  onCancel:    () => void
  onSubmit:    (form: AddFormShape) => Promise<void>
}) {
  const monthOptions = build18Months(issue)
  const [advId,    setAdvId]    = useState('')
  const [design,   setDesign]   = useState<'new' | 'pickup'>('new')
  const [directory, setDirectory] = useState(false)
  const [size,     setSize]     = useState<number>(0.25)
  const [layout,   setLayout]   = useState<string | null>(null)
  const [price,    setPrice]    = useState('')
  const [social,   setSocial]   = useState('')
  const [layoutNotes, setLayoutNotes] = useState('')
  const [months,   setMonths]   = useState<string[]>([])
  const [expires,  setExpires]  = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!advId) return
    setSaving(true)
    try {
      await onSubmit({
        advertiser_account_id: advId,
        design,
        directory,
        size,
        layout,
        price:           price.trim()  === '' ? null : Number(price),
        social_budget:   social.trim() === '' ? null : Number(social),
        layout_notes:    layoutNotes.trim() || null,
        specific_months: months,
        expires_month:   expires || null,
      })
    } finally { setSaving(false) }
  }
  function toggleMonth(m: string) {
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1'

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-5 print:hidden">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
          <Plus size={14} /> Add print placement
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X size={14} /></button>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={lbl}>Business <span className="text-rose-600">*</span></label>
          <select value={advId} onChange={e => setAdvId(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— Pick a business —</option>
            {advertisers.map(a => <option key={a.id} value={a.id}>{a.business_name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Design</label>
          <select value={design} onChange={e => setDesign(e.target.value as 'new' | 'pickup')} className={`${inp} cursor-pointer capitalize`}>
            {DESIGN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Size</label>
          <select value={size} onChange={e => setSize(parseFloat(e.target.value))} className={`${inp} cursor-pointer`}>
            {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Layout</label>
          <select value={layout ?? ''} onChange={e => setLayout(e.target.value || null)} className={`${inp} cursor-pointer`}>
            {LAYOUT_OPTIONS.map(l => <option key={l.label} value={l.value ?? ''}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Directory</label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm pt-2">
            <input type="checkbox" checked={directory} onChange={e => setDirectory(e.target.checked)} />
            {directory ? 'In directory' : 'Not in directory'}
          </label>
        </div>
        <div>
          <label className={lbl}>Price ($)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={inp} />
        </div>
        <div>
          <label className={lbl}>Social budget ($)</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={SOCIAL_PRESETS.includes(Number(social)) ? social : 'custom'}
              onChange={e => { if (e.target.value !== 'custom') setSocial(e.target.value) }}
              className={`${inp} cursor-pointer text-xs`}
            >
              <option value="">—</option>
              {SOCIAL_PRESETS.map(v => <option key={v} value={v}>${v}</option>)}
              <option value="custom">Custom…</option>
            </select>
            <input type="number" value={social} onChange={e => setSocial(e.target.value)} placeholder="$" className={`${inp} text-xs`} />
          </div>
        </div>
        <div>
          <label className={lbl}>Expires (last issue)</label>
          <select value={expires} onChange={e => setExpires(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">—</option>
            {monthOptions.map(m => <option key={m} value={m}>{shortMonth(m)}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className={lbl}>Specific months purchased</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-y-0.5 gap-x-2 p-2 bg-gray-50 rounded-lg">
            {monthOptions.map(m => (
              <label key={m} className="inline-flex items-center gap-1 text-[11px] cursor-pointer">
                <input type="checkbox" checked={months.includes(m)} onChange={() => toggleMonth(m)} />
                {shortMonth(m)}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className={lbl}>Layout notes</label>
          <input value={layoutNotes} onChange={e => setLayoutNotes(e.target.value)} placeholder="Layout notes for the design team…" className={inp} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={save}
          disabled={!advId || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'Saving…' : 'Add to layout'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900">
          Cancel
        </button>
      </div>
    </div>
  )
}
