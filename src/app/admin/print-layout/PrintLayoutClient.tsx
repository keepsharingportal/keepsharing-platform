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

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Printer, Download, ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2,
  Copy, RefreshCw, Check, X, Pencil, ArrowUp, ArrowDown, Edit3, Upload,
} from 'lucide-react'
import { CsvImportModal } from './CsvImportModal'

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
  // Migration 130. TRUE = recurring sponsor that runs every month
  // until expires_month (or cancelled). FALSE = seasonal — only runs
  // the months listed in specific_months.
  is_ongoing:            boolean
  // Migration 131. Optional ad-specific display name. Set when the
  // editor imports a CSV row whose business cell is the AD's name
  // (e.g. 'Macon East Academy Senior Ad') and that ad attaches to a
  // canonical business with a different name. Null = use business_name.
  ad_label:              string | null
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
  // Deep-link from advertiser profile: opens Add form with this id pre-
  // picked. Null when arriving from the toolbar's Add button.
  initialAdd?:           boolean
  initialAdvertiserId?:  string | null
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
// the Expires-month dropdown in the Add/Edit forms.
function build18Months(anchor: string): string[] {
  const [y, m] = anchor.split('-').map(s => parseInt(s, 10))
  const out: string[] = []
  for (let i = 0; i < 18; i++) {
    const d = new Date(y, m - 1 + i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

// Issue picker window — no back-limit (editors audit issues from years
// ago), always at least 24 months ahead of today + the viewed anchor
// (so booking a far-future month doesn't strand the editor without an
// option to step further). Bottom bound is hard-pinned to 2015-01;
// anything older is reachable by typing the issue= URL param directly.
const ISSUE_FLOOR_YYYYMM = '2015-01'

function buildIssueWindow(anchor: string): string[] {
  const today = new Date()
  today.setDate(15)
  const [ay, am] = anchor.split('-').map(s => parseInt(s, 10))
  const anchorDate = new Date(ay, am - 1, 15)

  // End: 24 months past whichever is later (today vs the viewed
  // anchor). Editor viewing Aug 2027 still sees Aug 2029 as an option.
  const endAnchor = anchorDate.getTime() > today.getTime() ? anchorDate : today
  const end = new Date(endAnchor.getFullYear(), endAnchor.getMonth() + 24, 15)

  const [fy, fm] = ISSUE_FLOOR_YYYYMM.split('-').map(s => parseInt(s, 10))
  const out: string[] = []
  const cur = new Date(fy, fm - 1, 15)
  while (cur.getTime() <= end.getTime()) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  // Newest at top — editors work forward most of the time. The anchor
  // is highlighted by the <select>'s value attribute regardless of pos.
  return out.reverse()
}

// Bucket months by year for <optgroup> rendering. Returns groups
// already in display order (matches buildIssueWindow's newest-first).
interface IssueGroup { year: number; months: string[] }
function groupByYear(months: string[]): IssueGroup[] {
  const byYear = new Map<number, string[]>()
  for (const m of months) {
    const y = parseInt(m.slice(0, 4), 10)
    const list = byYear.get(y) ?? []
    list.push(m)
    byYear.set(y, list)
  }
  // Sort descending: newest year first. Maps are insertion-ordered;
  // since `months` is newest-first, the first time we touch year Y is
  // the latest month in Y — iterating keys here is already descending.
  return Array.from(byYear.entries()).map(([year, months]) => ({ year, months }))
}

// ── Component ───────────────────────────────────────────────────────────────

// Columns the editor can sort by. Keys match PrintPlacement field names
// so the sort function can read row[key] without a switch.
type SortKey = 'business_name' | 'design' | 'directory' | 'size' | 'layout' | 'price' | 'social_budget' | 'expires_month' | 'layout_notes'
type SortDir = 'asc' | 'desc'

export function PrintLayoutClient({ issue, prevMonth, nextMonth, prevMonthCount, initial, advertisers, tableMissing, initialAdd, initialAdvertiserId }: Props) {
  const router = useRouter()
  const [rows, setRows]       = useState<PrintPlacement[]>(initial)
  // Sync local rows whenever a server refresh delivers a new initial.
  // Without this, router.refresh() (fired after CSV import, clone,
  // bulk-delete etc) updates the server payload but the existing
  // useState ignores the new prop, leaving the table stale until a
  // hard reload. The cost is dropping any uncommitted optimistic
  // edits when a refresh lands — acceptable since refreshes only
  // happen after a server confirmed mutation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRows(initial) }, [initial])
  const [adding,  setAdding]  = useState(!!initialAdd)
  const [importing, setImporting] = useState(false)
  const [busy, startTransition] = useTransition()

  // Selection (bulk operations). Set keys = row ids; nothing fancy.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkEditing, setBulkEditing] = useState(false)

  // Sort. Default: size desc (mirrors initial server order so the page
  // doesn't visually jump after first load). Editors switch to
  // business_name asc for the second printout.
  const [sortKey, setSortKey] = useState<SortKey>('size')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Status filter. Editor's monthly pass: click 'Check Status' to see
  // only the advertisers she needs to verify, click 'Expired' to see
  // the re-up candidates. 'All' restores the full sheet.
  type StatusFilter = 'all' | 'ongoing' | 'check' | 'expired'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  function clickSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Numeric columns feel right starting desc (biggest first);
      // text columns start asc.
      setSortDir(['size', 'price', 'social_budget'].includes(key) ? 'desc' : 'asc')
    }
  }

  // Apply current sort + memoize so we don't resort on unrelated renders.
  const sortedRows = useMemo(() => {
    const out = [...rows]
    out.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      // Nulls last regardless of direction (visually predictable).
      const aNull = av == null || av === ''
      const bNull = bv == null || bv === ''
      if (aNull && bNull) return 0
      if (aNull) return 1
      if (bNull) return -1
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else if (typeof av === 'boolean' && typeof bv === 'boolean') cmp = (av === bv) ? 0 : av ? 1 : -1
      else cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [rows, sortKey, sortDir])

  // Expired = the commitment date is now in the past relative to this
  // issue. We carry forward anyway so the editor can decide; the row
  // just goes red until she bumps expires_month (re-up) or deletes it.
  function isExpired(r: PrintPlacement): boolean {
    return !!r.expires_month && r.expires_month < issue
  }

  // Status counts power the top-of-page filter pills. Expired wins over
  // the run_mode (an expired ongoing is shown red, not green) so the
  // editor sees decision points first.
  const statusCounts = useMemo(() => {
    let ongoing = 0, check = 0, expired = 0
    for (const r of rows) {
      if (isExpired(r))      expired++
      else if (r.is_ongoing) ongoing++
      else                   check++
    }
    return { ongoing, check, expired, all: rows.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, issue])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return sortedRows
    return sortedRows.filter(r => {
      const exp = isExpired(r)
      if (statusFilter === 'expired') return exp
      if (statusFilter === 'ongoing') return !exp && r.is_ongoing
      if (statusFilter === 'check')   return !exp && !r.is_ongoing
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedRows, statusFilter, issue])

  // Per-advertiser placement count for this issue. Used to decide
  // whether to surface ad_label — only worth showing when one
  // advertiser has multiple ads in the same issue and the editor
  // needs to tell them apart. Solo placements just clutter the row
  // with the CSV's original cell value.
  const advertiserCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      m.set(r.advertiser_account_id, (m.get(r.advertiser_account_id) ?? 0) + 1)
    }
    return m
  }, [rows])

  // Selection helpers — work off the visible set so 'select all'
  // matches what the editor's actually looking at.
  const allSelected = visibleRows.length > 0 && visibleRows.every(r => selected.has(r.id))
  const someSelected = !allSelected && visibleRows.some(r => selected.has(r.id))
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleRows.map(r => r.id)))
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function clearSelection() { setSelected(new Set()) }

  async function onBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} placement${selected.size === 1 ? '' : 's'} from ${fmtIssue(issue)}?`)) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const res = await fetch('/api/admin/print-placements/bulk-delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        window.alert(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setRows(prev => prev.filter(r => !selected.has(r.id)))
      clearSelection()
    })
  }

  async function onDuplicateSelected() {
    if (selected.size === 0) return
    if (!confirm(`Duplicate ${selected.size} selected placement${selected.size === 1 ? '' : 's'} into ${fmtIssue(nextMonth)}? (Existing rows on the target month are skipped.)`)) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const res = await fetch('/api/admin/print-placements/clone-month', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from_month: issue, to_month: nextMonth, ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(json?.error ?? `HTTP ${res.status}`)
        return
      }
      const parts: string[] = []
      if (json.created)          parts.push(`${json.created} duplicated`)
      if (json.skippedDuplicate) parts.push(`${json.skippedDuplicate} already on ${shortMonth(nextMonth)}`)
      window.alert(parts.length > 0 ? parts.join(' · ') : 'Nothing to duplicate')
      clearSelection()
    })
  }

  async function onBulkEditApply(patch: Record<string, unknown>) {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const res = await fetch('/api/admin/print-placements/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids, patch }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      window.alert(json?.error ?? `HTTP ${res.status}`)
      return
    }
    // Patch local rows so the table updates without a refresh.
    setRows(prev => prev.map(r => selected.has(r.id) ? { ...r, ...patch } as PrintPlacement : r))
    clearSelection()
    setBulkEditing(false)
    // Background refresh ensures any DB-side normalization (NULLs from
    // empty strings, trigger updates) reaches the UI on the next paint.
    router.refresh()
  }

  function navigateIssue(targetMonth: string) {
    router.push(`/admin/print-layout?issue=${encodeURIComponent(targetMonth)}`)
  }

  async function onClone() {
    if (!confirm(`Clone every committed placement from ${fmtIssue(prevMonth)} into ${fmtIssue(issue)}? Existing rows on the target month are skipped; expired commitments carry forward flagged red so you can re-up or remove them.`)) return
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
      <div className="bg-white border-b border-portal-border px-6 py-4 print:hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateIssue(prevMonth)} className="p-1.5 rounded-lg hover:bg-portal-row-hover" title={`Previous: ${fmtIssue(prevMonth)}`}>
              <ChevronLeft size={16} />
            </button>
            <div>
              {/* Title doubles as a month picker — wraps a native select
                  so the editor can jump straight to e.g. Jun 2025 to
                  audit who ran. The select sits on top transparently;
                  the visible text follows the selection. */}
              <h1 className="text-xl font-bold text-portal-text leading-tight inline-flex items-center gap-1 relative cursor-pointer hover:text-portal-blue">
                <span>Print Layout — {fmtIssue(issue)}</span>
                <ChevronDown size={14} className="text-portal-muted" aria-hidden />
                <select
                  value={issue}
                  onChange={e => navigateIssue(e.target.value)}
                  aria-label="Jump to issue month"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                >
                  {groupByYear(buildIssueWindow(issue)).map(g => (
                    <optgroup key={g.year} label={String(g.year)}>
                      {g.months.map(m => (
                        <option key={m} value={m}>{fmtIssue(m)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </h1>
              <p className="text-xs text-portal-sub">
                {rows.length} {rows.length === 1 ? 'placement' : 'placements'}
                {' · '}{totalPages.toFixed(2)} pages
                {' · '}${totalRevenue.toLocaleString()} revenue
                {totalSocial > 0 && (<> · ${totalSocial.toLocaleString()} social</>)}
              </p>
            </div>
            <button onClick={() => navigateIssue(nextMonth)} className="p-1.5 rounded-lg hover:bg-portal-row-hover" title={`Next: ${fmtIssue(nextMonth)}`}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdding(v => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700"
            >
              <Plus size={14} /> Add Placement
            </button>
            <button
              type="button"
              onClick={onClone}
              disabled={busy || prevMonthCount === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-portal-border-2 bg-white rounded-lg hover:bg-portal-bg disabled:opacity-40"
              title={prevMonthCount === 0
                ? `Nothing to clone — ${fmtIssue(prevMonth)} is empty`
                : `Clone ${prevMonthCount} placement(s) from ${fmtIssue(prevMonth)}`}
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
              Clone from {shortMonth(prevMonth)} {prevMonthCount > 0 && `(${prevMonthCount})`}
            </button>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-portal-border-2 bg-white rounded-lg hover:bg-portal-bg"
              title="Upload a CSV to back-fill a past month"
            >
              <Upload size={14} /> Import CSV
            </button>
            {/* Two single-view CSV downloads — the editor sends both
                to the layout team: size view is the designer's source
                of truth, name view is for billing reconciliation. */}
            <div className="inline-flex rounded-lg overflow-hidden border border-portal-border-2">
              <a
                href={`/api/admin/print-placements/export?issue_month=${encodeURIComponent(issue)}&view=size`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-portal-bg"
                title="Download CSV sorted by size (largest first)"
              >
                <Download size={14} /> By Size
              </a>
              <a
                href={`/api/admin/print-placements/export?issue_month=${encodeURIComponent(issue)}&view=name`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-portal-bg border-l border-portal-border-2"
                title="Download CSV sorted by business name (A→Z)"
              >
                <Download size={14} /> By Name
              </a>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold border border-portal-border-2 bg-white rounded-lg hover:bg-portal-bg"
              title="Print this view"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Status filter pills — Ongoing / Check Status / Expired with
            running counts. Editor's monthly pass: click Check Status to
            see who needs a verify, click Expired to see who needs a
            re-up decision. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <StatusPill
            label="All"
            count={statusCounts.all}
            tone="neutral"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <StatusPill
            label="Ongoing"
            count={statusCounts.ongoing}
            tone="green"
            active={statusFilter === 'ongoing'}
            onClick={() => setStatusFilter('ongoing')}
          />
          <StatusPill
            label="Check Status"
            count={statusCounts.check}
            tone="amber"
            active={statusFilter === 'check'}
            onClick={() => setStatusFilter('check')}
          />
          <StatusPill
            label="Expired"
            count={statusCounts.expired}
            tone="rose"
            active={statusFilter === 'expired'}
            onClick={() => setStatusFilter('expired')}
          />
        </div>

        {/* Migration banner — until 129 is applied. */}
        {tableMissing && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-portal-amber-lt p-4 text-sm text-amber-900">
            <p className="font-bold">Migration 129 not applied yet</p>
            <p className="text-xs mt-1">
              Apply <code className="px-1 bg-portal-amber-lt rounded">supabase/migrations/129_print_ad_placements.sql</code> in Supabase Studio. The page works without it; the table just stays empty.
            </p>
          </div>
        )}
      </div>

      {adding && (
        <AddRowForm
          advertisers={advertisers}
          issue={issue}
          initialAdvertiserId={initialAdvertiserId ?? null}
          onCancel={() => setAdding(false)}
          onSubmit={async form => {
            const ok = await onAdd(form)
            if (ok) setAdding(false)
          }}
        />
      )}

      {/* ── Bulk action bar ─────────────────────────────────────────
          Slides in above the table whenever the editor has rows
          selected. Stays sticky-visible until they Clear. */}
      {selected.size > 0 && (
        <div className="mx-4 mt-3 bg-gray-900 text-white rounded-lg px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <span className="text-sm font-bold">
            {selected.size} {selected.size === 1 ? 'placement' : 'placements'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDuplicateSelected}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40"
              title={`Duplicate selected rows into ${fmtIssue(nextMonth)}`}
            >
              <Copy size={12} /> Duplicate to {shortMonth(nextMonth)}
            </button>
            <button
              type="button"
              onClick={() => setBulkEditing(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40"
            >
              <Edit3 size={12} /> Edit fields
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-40"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="px-4 py-4 print:px-0 print:py-0">
        {rows.length === 0 ? (
          <div className="bg-white border border-portal-border rounded-lg p-10 text-center text-sm text-portal-sub print:hidden">
            No placements for {fmtIssue(issue)} yet.{' '}
            {prevMonthCount > 0
              ? <>Clone {prevMonthCount} from {fmtIssue(prevMonth)} or add the first one.</>
              : <>Add the first placement.</>}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-portal-border overflow-hidden print:border-0 print:rounded-none">
            <table className="w-full text-sm">
              <thead className="bg-portal-bg border-b border-portal-border text-[10px] uppercase tracking-wider text-portal-sub">
                <tr className="text-left">
                  {/* Select-all checkbox; indeterminate visual when a
                      subset is selected. */}
                  <th className="px-3 py-2 w-8 print:hidden">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </th>
                  <SortHeader label="Business" sortKey="business_name" active={sortKey} dir={sortDir} onClick={clickSort} className="px-4 py-2" />
                  <SortHeader label="Design"   sortKey="design"        active={sortKey} dir={sortDir} onClick={clickSort} />
                  <SortHeader label="Dir."     sortKey="directory"     active={sortKey} dir={sortDir} onClick={clickSort} />
                  <SortHeader label="Size"     sortKey="size"          active={sortKey} dir={sortDir} onClick={clickSort} />
                  <SortHeader label="Layout"   sortKey="layout"        active={sortKey} dir={sortDir} onClick={clickSort} />
                  <SortHeader label="Price"    sortKey="price"         active={sortKey} dir={sortDir} onClick={clickSort} align="right" />
                  <SortHeader label="Social"   sortKey="social_budget" active={sortKey} dir={sortDir} onClick={clickSort} align="right" />
                  <SortHeader label="Expires"  sortKey="expires_month" active={sortKey} dir={sortDir} onClick={clickSort} />
                  <SortHeader label="Notes"    sortKey="layout_notes"  active={sortKey} dir={sortDir} onClick={clickSort} />
                  <th className="px-3 py-2 font-semibold print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(r => (
                  <ReadRow
                    key={r.id}
                    row={r}
                    isExpired={isExpired(r)}
                    showVariant={(advertiserCounts.get(r.advertiser_account_id) ?? 0) > 1}
                    selected={selected.has(r.id)}
                    onToggle={() => toggleOne(r.id)}
                    onEdit={() => router.push(`/admin/print-placements/${r.id}/edit`)}
                    onDelete={() => onDelete(r.id, r.business_name)}
                  />
                ))}
              </tbody>
              {/* Totals footer — page count, revenue, social.
                  Surfaces at the bottom of the print page too so the
                  layout team sees the issue's totals at a glance. */}
              <tfoot className="bg-portal-bg border-t-2 border-portal-border-2 text-xs font-bold">
                <tr>
                  <td className="px-3 py-2 print:hidden"></td>
                  <td className="px-4 py-2 text-portal-text">
                    {rows.length} {rows.length === 1 ? 'placement' : 'placements'}
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 tabular-nums text-portal-text">{totalPages.toFixed(2)} pp</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 tabular-nums text-right text-portal-text">${totalRevenue.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-portal-text">{totalSocial > 0 ? `$${totalSocial.toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {bulkEditing && (
        <BulkEditModal
          issue={issue}
          count={selected.size}
          onCancel={() => setBulkEditing(false)}
          onApply={onBulkEditApply}
        />
      )}

      {importing && (
        <CsvImportModal
          issue={issue}
          monthOptions={buildIssueWindow(issue)}
          fmtIssue={fmtIssue}
          advertisers={advertisers}
          onClose={() => setImporting(false)}
          onCommitted={() => router.refresh()}
        />
      )}
    </>
  )
}

// ── Sortable column header ──────────────────────────────────────────────────

function SortHeader({
  label, sortKey, active, dir, onClick, align, className,
}: {
  label:     string
  sortKey:   SortKey
  active:    SortKey
  dir:       SortDir
  onClick:   (k: SortKey) => void
  align?:    'left' | 'right'
  className?: string
}) {
  const isActive = active === sortKey
  return (
    <th className={`px-3 py-2 font-semibold ${align === 'right' ? 'text-right' : 'text-left'} ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : ''} ${isActive ? 'text-portal-text' : 'hover:text-portal-text'}`}
      >
        {label}
        {isActive && (dir === 'asc'
          ? <ArrowUp   size={9} className="text-portal-text" />
          : <ArrowDown size={9} className="text-portal-text" />)}
      </button>
    </th>
  )
}

// ── Read-only row ───────────────────────────────────────────────────────────

function ReadRow({ row, isExpired, showVariant, selected, onToggle, onEdit, onDelete }: {
  row: PrintPlacement; isExpired: boolean; showVariant: boolean; selected: boolean; onToggle: () => void;
  onEdit: () => void; onDelete: () => void
}) {
  // Row-level visual state: expired wins over selection (re-up decision
  // is more urgent than 'I picked this one'), then check-status, then
  // selection, then default.
  const rowBg = isExpired
    ? 'bg-portal-red-lt hover:bg-portal-red-lt'
    : !row.is_ongoing
      ? (selected ? 'bg-portal-amber-lt/70' : 'bg-portal-amber-lt/60 hover:bg-portal-amber-lt')
      : (selected ? 'bg-portal-amber-lt/40' : 'hover:bg-portal-bg')
  // Show ad_label only when:
  //   - It exists and differs from the canonical business name AND
  //   - The advertiser has more than one placement on this issue
  // (multi-ad businesses are the only case where the variant label
  // adds real signal — for solo placements it just clutters the row
  // with the CSV's original cell text).
  const adVariant = showVariant
    && row.ad_label
    && row.ad_label.trim()
    && row.ad_label.trim().toLowerCase() !== row.business_name.toLowerCase()
      ? row.ad_label.trim()
      : null
  return (
    <tr className={`border-b border-portal-border last:border-0 group ${rowBg}`}>
      <td className="px-3 py-2 w-8 print:hidden">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${row.business_name}`} />
      </td>
      <td className={`px-4 py-2 font-bold ${isExpired ? 'text-rose-900' : 'text-portal-text'}`}>
        {/* Click anywhere on the business name to open the inline editor
            — matches the convention on /admin/advertisers and saves a
            hover-and-aim at the tiny pencil icon. */}
        <button
          type="button"
          onClick={onEdit}
          className={`text-left hover:text-portal-blue inline-flex flex-col items-start ${isExpired ? 'hover:text-portal-red' : ''}`}
          title="Click to edit this placement"
        >
          <span>{row.business_name}</span>
          {adVariant && (
            <span className="text-[10px] font-normal text-portal-sub mt-0.5">↳ {adVariant}</span>
          )}
        </button>
      </td>
      <td className="px-3 py-2 text-xs capitalize">{row.design}</td>
      <td className="px-3 py-2 text-xs">
        <div className="flex flex-col gap-0.5">
          {row.directory && <span>Yes</span>}
          {!isExpired && !row.is_ongoing && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-portal-amber-lt text-portal-amber text-[9px] font-bold uppercase tracking-wide w-fit print:hidden" title="Check status — sporadic advertiser, verify before issue ships.">
              Check
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-xs tabular-nums">{row.size}</td>
      <td className="px-3 py-2 text-xs capitalize">{row.layout ?? ''}</td>
      <td className="px-3 py-2 text-xs text-right tabular-nums">{row.price != null ? `$${row.price.toLocaleString()}` : ''}</td>
      <td className="px-3 py-2 text-xs text-right tabular-nums">
        {row.social_budget == null
          ? ''
          : row.social_budget === 0
            ? <span className="text-portal-muted">N/A</span>
            : `$${row.social_budget.toLocaleString()}`}
      </td>
      <td className={`px-3 py-2 text-[11px] ${isExpired ? 'text-portal-red font-bold' : 'text-portal-sub'}`}>
        <div className="flex flex-col gap-0.5">
          <span>{row.expires_month ? shortMonth(row.expires_month) : ''}</span>
          {isExpired && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wide w-fit print:hidden" title="Past expires_month — re-up by bumping the date, or delete the row to let lapse.">
              Expired
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-[11px] text-portal-sub truncate max-w-[180px]" title={row.layout_notes ?? ''}>
        {row.layout_notes ?? ''}
      </td>
      <td className="px-3 py-2 print:hidden">
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-200 text-portal-muted hover:text-portal-text" aria-label="Edit">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-portal-red-lt text-gray-300 hover:text-rose-600" aria-label="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </td>
    </tr>
  )
}


// StatusPill — counter chip for the top-of-page status filter. Active
// state shows filled colour, inactive shows muted outline; click swaps
// the page filter to that status.
function StatusPill({ label, count, tone, active, onClick }: {
  label:   string
  count:   number
  tone:    'neutral' | 'green' | 'amber' | 'rose'
  active:  boolean
  onClick: () => void
}) {
  const toneActive: Record<string, string> = {
    neutral: 'bg-gray-900 text-white border-gray-900',
    green:   'bg-emerald-600 text-white border-emerald-600',
    amber:   'bg-portal-amber-lt0 text-white border-amber-500',
    rose:    'bg-rose-600 text-white border-rose-600',
  }
  const toneIdle: Record<string, string> = {
    neutral: 'bg-white text-portal-text border-portal-border-2 hover:bg-portal-bg',
    green:   'bg-white text-portal-green border-emerald-200 hover:bg-portal-green-lt',
    amber:   'bg-white text-portal-amber border-amber-200 hover:bg-portal-amber-lt',
    rose:    'bg-white text-portal-red border-portal-red/30 hover:bg-portal-red-lt',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${active ? toneActive[tone] : toneIdle[tone]}`}
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${active ? 'opacity-90' : 'opacity-70'}`}>{count}</span>
    </button>
  )
}

// FieldRow — checkbox + label + value control. Lives at module scope
// (not inside BulkEditModal) so the static-components rule passes:
// React would otherwise rebuild the component on every modal render.
function FieldRow({ enabled, onToggle, field, label, children }: {
  enabled:  Record<string, boolean>
  onToggle: (field: string) => void
  field:    string
  label:    string
  children: React.ReactNode
}) {
  const on = !!enabled[field]
  return (
    <div className="grid grid-cols-[24px_140px_1fr] gap-3 items-center">
      <input
        type="checkbox"
        checked={on}
        onChange={() => onToggle(field)}
        aria-label={`Update ${label}`}
      />
      <label className="text-xs font-bold uppercase tracking-wider text-portal-sub">{label}</label>
      <div className={on ? '' : 'opacity-40 pointer-events-none'}>{children}</div>
    </div>
  )
}

// ── Bulk edit modal ─────────────────────────────────────────────────────────
//
// One field at a time per checkbox; only checked fields get applied to
// every selected row. Modeled on Zoho/Salesforce mass-update — the
// editor's most common ask is 'change design from new to pickup on
// these 12' or 'set price=$X on the whole picked-up batch'.

function BulkEditModal({ issue, count, onCancel, onApply }: {
  issue:    string
  count:    number
  onCancel: () => void
  onApply:  (patch: Record<string, unknown>) => Promise<void>
}) {
  const monthOptions = build18Months(issue)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [design,    setDesign]    = useState<'new' | 'pickup'>('new')
  const [directory, setDirectory] = useState(false)
  const [size,      setSize]      = useState<number>(0.25)
  const [layout,    setLayout]    = useState<string>('')
  const [price,     setPrice]     = useState('')
  const [social,    setSocial]    = useState('')
  const [expires,   setExpires]   = useState('')
  const [layoutNotes, setLayoutNotes] = useState('')
  const [ongoing,   setOngoing]   = useState(true)
  const [saving, setSaving] = useState(false)

  function toggle(field: string) {
    setEnabled(e => ({ ...e, [field]: !e[field] }))
  }

  async function apply() {
    const patch: Record<string, unknown> = {}
    if (enabled.design)        patch.design          = design
    if (enabled.directory)     patch.directory       = directory
    if (enabled.size)          patch.size            = size
    if (enabled.layout)        patch.layout          = layout || null
    if (enabled.price)         patch.price           = price.trim() === '' ? null : Number(price)
    if (enabled.social_budget) patch.social_budget   = social.trim() === '' ? null : Number(social)
    if (enabled.expires_month) patch.expires_month   = expires || null
    if (enabled.layout_notes)  patch.layout_notes    = layoutNotes.trim() || null
    if (enabled.is_ongoing)    patch.is_ongoing      = ongoing
    if (Object.keys(patch).length === 0) {
      window.alert('Tick the box next to at least one field to update.')
      return
    }
    setSaving(true)
    try { await onApply(patch) }
    finally { setSaving(false) }
  }

  const inp = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-6 overflow-y-auto" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-md w-full max-w-xl p-5 my-12 space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="text-base font-bold text-portal-text inline-flex items-center gap-1.5">
            <Edit3 size={14} /> Bulk edit {count} placement{count === 1 ? '' : 's'}
          </h3>
          <button onClick={onCancel} className="text-portal-muted hover:text-portal-text"><X size={14} /></button>
        </header>
        <p className="text-xs text-portal-sub">
          Tick a field to update it across every selected row. Unticked fields are left alone.
        </p>

        <div className="space-y-3">
          <FieldRow enabled={enabled} onToggle={toggle} field="design" label="Design">
            <select value={design} onChange={e => setDesign(e.target.value as 'new' | 'pickup')} className={`${inp} cursor-pointer capitalize`}>
              {DESIGN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="directory" label="Directory">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={directory} onChange={e => setDirectory(e.target.checked)} />
              {directory ? 'Yes (in directory)' : 'No (not in directory)'}
            </label>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="is_ongoing" label="Status">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={ongoing} onChange={e => setOngoing(e.target.checked)} />
              {ongoing ? 'Ongoing (every month)' : 'Check Status (sporadic)'}
            </label>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="size" label="Size">
            <select value={size} onChange={e => setSize(parseFloat(e.target.value))} className={`${inp} cursor-pointer`}>
              {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="layout" label="Layout">
            <select value={layout} onChange={e => setLayout(e.target.value)} className={`${inp} cursor-pointer`}>
              {LAYOUT_OPTIONS.map(l => <option key={l.label} value={l.value ?? ''}>{l.label}</option>)}
            </select>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="price" label="Price ($)">
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="leave blank to clear" className={inp} />
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="social_budget" label="Social budget ($)">
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
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="expires_month" label="Expires">
            <select value={expires} onChange={e => setExpires(e.target.value)} className={`${inp} cursor-pointer`}>
              <option value="">— Clear —</option>
              {monthOptions.map(m => <option key={m} value={m}>{shortMonth(m)}</option>)}
            </select>
          </FieldRow>
          <FieldRow enabled={enabled} onToggle={toggle} field="layout_notes" label="Layout notes">
            <input value={layoutNotes} onChange={e => setLayoutNotes(e.target.value)} placeholder="leave blank to clear" className={inp} />
          </FieldRow>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-portal-border">
          <button
            type="button"
            onClick={apply}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-portal-navy text-white rounded-full hover:bg-portal-navy/90 disabled:opacity-40 shadow-sm"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Applying…' : `Apply to ${count}`}
          </button>
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-portal-sub hover:text-portal-text">
            Cancel
          </button>
        </div>
      </div>
    </div>
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
  expires_month:         string | null
  is_ongoing:            boolean
  ad_label:              string | null
}

function AddRowForm({ advertisers, issue, initialAdvertiserId, onCancel, onSubmit }: {
  advertisers:          AdvertiserOption[]
  issue:                string
  initialAdvertiserId?: string | null
  onCancel:             () => void
  onSubmit:             (form: AddFormShape) => Promise<void>
}) {
  const monthOptions = build18Months(issue)
  // Pre-select the advertiser when the form was opened from a specific
  // advertiser profile (?add=1&advertiser_id=X). Empty otherwise.
  const [advId,    setAdvId]    = useState(initialAdvertiserId ?? '')
  const [design,   setDesign]   = useState<'new' | 'pickup'>('new')
  const [directory, setDirectory] = useState(false)
  const [size,     setSize]     = useState<number>(0.25)
  const [layout,   setLayout]   = useState<string | null>(null)
  const [price,    setPrice]    = useState('')
  const [social,   setSocial]   = useState('')
  const [layoutNotes, setLayoutNotes] = useState('')
  const [expires,  setExpires]  = useState('')
  // Default ongoing=true — runs every month until cancelled. Editor
  // unticks for sporadic advertisers who need a verify each issue
  // ('Check Status').
  const [ongoing,  setOngoing]  = useState(true)
  const [adLabel,  setAdLabel]  = useState('')
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
        is_ongoing:      ongoing,
        expires_month:   expires || null,
        ad_label:        adLabel.trim() || null,
      })
    } finally { setSaving(false) }
  }

  const inp = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1'

  return (
    <div className="mx-4 mt-4 bg-white rounded-lg border border-portal-border p-5 print:hidden">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-portal-text inline-flex items-center gap-1.5">
          <Plus size={14} /> Add print placement
        </h3>
        <button onClick={onCancel} className="text-portal-muted hover:text-portal-text"><X size={14} /></button>
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
          <label className={lbl}>Ad label <span className="text-portal-muted normal-case font-normal">(optional)</span></label>
          <input
            type="text"
            value={adLabel}
            onChange={e => setAdLabel(e.target.value)}
            placeholder="e.g. Senior Ad"
            className={inp}
            title="Only fill if this business has multiple ads in the same issue"
          />
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
          <label className={lbl}>Status</label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm pt-2" title="Ongoing = runs every month. Off = Check Status (sporadic — needs monthly verification).">
            <input type="checkbox" checked={ongoing} onChange={e => setOngoing(e.target.checked)} />
            {ongoing ? 'Ongoing' : 'Check Status'}
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
          <label className={lbl}>Layout notes</label>
          <input value={layoutNotes} onChange={e => setLayoutNotes(e.target.value)} placeholder="Layout notes for the design team…" className={inp} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-portal-border">
        <button
          type="button"
          onClick={save}
          disabled={!advId || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-portal-navy text-white rounded-full hover:bg-portal-navy/90 disabled:opacity-40 shadow-sm"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'Saving…' : 'Add to layout'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-portal-sub hover:text-portal-text">
          Cancel
        </button>
      </div>
    </div>
  )
}
