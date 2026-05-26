'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, X, Plus, Link as LinkIcon, School, RefreshCw, ExternalLink,
  Settings, Camera, Upload, Calendar, Clock, Search, ChevronLeft, ChevronRight,
  MoreVertical, ImageIcon, Trash2, RotateCcw, Pencil,
} from 'lucide-react'
import type { SchoolBitRow, SchoolOption } from './page'
import { SchoolTypeahead, type TypeaheadSchool } from './SchoolTypeahead'
import { PrintExportPanel } from './PrintExportPanel'
import {
  AREA_BADGE_CLASS, PRIVATE_BADGE_CLASS, AREA_SHORT_LABELS,
  type Area, isValidArea,
} from '@/lib/school-news/areas'

const SOURCE_BADGE: Record<string, string> = {
  public_form:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  staff_email:     'bg-purple-50 text-purple-700 ring-purple-200',
  staff_facebook:  'bg-sky-50 text-sky-700 ring-sky-200',
  staff_manual:    'bg-gray-50 text-gray-500 ring-gray-200',
}

const SOURCE_LABEL: Record<string, string> = {
  public_form:    'Public form',
  staff_email:    'Email',
  staff_facebook: 'Facebook',
  staff_manual:   'Manual',
}

const TABS = ['Pending Review', 'Approved', 'Rejected'] as const
type TabName = typeof TABS[number]

const STATUS_FOR_TAB: Record<TabName, string> = {
  'Pending Review': 'pending',
  'Approved':       'approved',
  'Rejected':       'rejected',
}

const PAGE_SIZE = 30

interface Props {
  initialBits: SchoolBitRow[]
  schools:     SchoolOption[]
}

export function SchoolNewsClient({ initialBits, schools }: Props) {
  const router = useRouter()
  const [bits, setBits]             = useState<SchoolBitRow[]>(initialBits)
  const [activeTab, setActiveTab]   = useState<TabName>('Pending Review')
  const [quickAdd, setQuickAdd]     = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Filters apply to the active tab only — switching tabs preserves them so
  // an editor can hop between Pending and Approved with the same school filter
  // active. Pagination resets on every filter change.
  const [search,    setSearch]    = useState('')
  const [schoolId,  setSchoolId]  = useState('')
  const [fromDate,  setFromDate]  = useState('')
  const [toDate,    setToDate]    = useState('')
  const [page,      setPage]      = useState(1)
  // Inline editor row id — only one row in edit mode at a time
  const [editingId, setEditingId] = useState<string | null>(null)

  // Build a school lookup for fast row enrichment
  const schoolMap = useMemo(() => {
    const m = new Map<string, SchoolOption>()
    for (const s of schools) m.set(s.id, s)
    return m
  }, [schools])

  // ── Filtering pipeline ─────────────────────────────────────────────────────
  // Status → then search/school/date → then sort → then page slice.
  const inTab = useMemo(
    () => bits.filter(b => b.status === STATUS_FOR_TAB[activeTab]),
    [bits, activeTab],
  )

  const filtered = useMemo(() => {
    const q     = search.trim().toLowerCase()
    const fromMs = fromDate ? new Date(fromDate).getTime() : null
    // toDate is inclusive of the chosen day — push it to end-of-day local
    const toMs   = toDate ? new Date(toDate + 'T23:59:59').getTime() : null
    return inTab.filter(b => {
      if (q && !(b.title.toLowerCase().includes(q) || b.blurb.toLowerCase().includes(q))) return false
      if (schoolId && b.school_id !== schoolId) return false
      // Approved tab filters on published_at; others filter on created_at
      const dateBasis = activeTab === 'Approved' ? b.published_at : b.created_at
      if ((fromMs !== null || toMs !== null) && dateBasis) {
        const t = new Date(dateBasis).getTime()
        if (fromMs !== null && t < fromMs) return false
        if (toMs   !== null && t > toMs)   return false
      }
      return true
    })
  }, [inTab, search, schoolId, fromDate, toDate, activeTab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function resetFilters() {
    setSearch('')
    setSchoolId('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  // ── Tab + counts ──────────────────────────────────────────────────────────
  const counts = {
    'Pending Review': bits.filter(b => b.status === 'pending').length,
    'Approved':       bits.filter(b => b.status === 'approved').length,
    'Rejected':       bits.filter(b => b.status === 'rejected').length,
  }
  const nowMs = Date.now()
  const scheduledCount = bits.filter(b =>
    b.status === 'approved' && b.published_at && new Date(b.published_at).getTime() > nowMs,
  ).length

  function switchTab(tab: TabName) {
    setActiveTab(tab)
    setSelectedIds(new Set())
    setEditingId(null)
    setPage(1)
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds(new Set(paged.map(b => b.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function dripScheduleSelected(overDays: number, startAt: string) {
    if (selectedIds.size === 0) return
    const res = await fetch('/api/admin/school-news/drip-schedule', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ids:       Array.from(selectedIds),
        over_days: overDays,
        start_at:  startAt || undefined,
        shuffle:   true,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { alert(json?.error ?? `HTTP ${res.status}`); return }
    // Optimistic local update so the bits leave Pending without a full refresh
    const ids = Array.from(selectedIds)
    setBits(prev => prev.map(b => ids.includes(b.id) ? { ...b, status: 'approved' } : b))
    clearSelection()
    router.refresh()
    alert(`Scheduled ${json.scheduled} bit${json.scheduled === 1 ? '' : 's'} to drip over ${overDays} day${overDays === 1 ? '' : 's'}.`)
  }

  async function bulkApproveSelected() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const res = await fetch('/api/admin/school-news/bulk-approve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { alert(json?.error ?? `HTTP ${res.status}`); return }
    // Optimistic update — flip to approved + stamp published_at locally so
    // the rows disappear from Pending immediately. Server is authoritative
    // on the next refresh.
    const nowIso = new Date().toISOString()
    setBits(prev => prev.map(b =>
      ids.includes(b.id)
        ? { ...b, status: 'approved', published_at: b.published_at ?? nowIso }
        : b,
    ))
    clearSelection()
    router.refresh()
  }

  function handleAdded(bit: SchoolBitRow) {
    setBits(prev => [bit, ...prev])
    setQuickAdd(false)
    // Jump to the tab where the new bit lives so the operator sees their
    // work immediately — published bits go to Approved, queued ones to Pending.
    setActiveTab(bit.status === 'approved' ? 'Approved' : 'Pending Review')
    setPage(1)
    router.refresh()
  }

  function handleAddedKeepOpen(bit: SchoolBitRow) {
    setBits(prev => [bit, ...prev])
    // Don't switch tabs or close the panel — the operator is mid-batch.
    router.refresh()
  }

  function handleUpdated(id: string, patch: Partial<SchoolBitRow>) {
    setBits(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
    router.refresh()
  }

  function handleRemoved(id: string) {
    setBits(prev => prev.filter(b => b.id !== id))
    setEditingId(curr => curr === id ? null : curr)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900">School Bits</h1>
          {counts['Pending Review'] > 0 && (
            <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
              {counts['Pending Review']} pending
            </span>
          )}
          {schools.length === 0 && (
            <span className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full ring-1 ring-rose-200">
              No schools added yet — set them up first
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrintExportPanel approvedCount={counts['Approved']} />
          <Link
            href="/admin/school-news/schools"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Settings size={13} /> Manage schools ({schools.length})
          </Link>
          <button
            onClick={() => setQuickAdd(v => !v)}
            disabled={schools.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-40"
          >
            <Plus size={14} /> Quick Add
          </button>
        </div>
      </div>

      {/* Quick Add Panel */}
      {quickAdd && (
        <QuickAddPanel
          schools={schools}
          onCancel={() => setQuickAdd(false)}
          onAdded={handleAdded}
          onAddedKeepOpen={handleAddedKeepOpen}
        />
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0 flex items-center justify-between flex-wrap">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? 'text-primary border-primary' : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              {tab}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${activeTab === tab ? 'bg-primary/5 text-primary ring-primary/20' : 'bg-gray-50 text-gray-400 ring-gray-200'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
        {scheduledCount > 0 && (
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full ring-1 ring-purple-200 inline-flex items-center gap-1">
            <Clock size={11} /> {scheduledCount} scheduled to publish later
          </span>
        )}
      </div>

      {/* Filter bar — search / school / date range */}
      <FilterBar
        search={search}    onSearch={v   => { setSearch(v);   setPage(1) }}
        schoolId={schoolId} onSchool={v  => { setSchoolId(v); setPage(1) }}
        fromDate={fromDate} onFromDate={v => { setFromDate(v); setPage(1) }}
        toDate={toDate}     onToDate={v   => { setToDate(v);   setPage(1) }}
        schools={schools}
        dateLabel={activeTab === 'Approved' ? 'Published' : 'Created'}
        resultCount={filtered.length}
        onReset={resetFilters}
      />

      {/* Bulk action bar — Pending only. Select-all checkbox + Approve N +
           drip-schedule. Selection is page-scoped (resets on tab/page change). */}
      {activeTab === 'Pending Review' && paged.length > 0 && (
        <BulkActionBar
          totalVisible={paged.length}
          selectedCount={selectedIds.size}
          onSelectAll={selectAllVisible}
          onClear={clearSelection}
          onSchedule={dripScheduleSelected}
          onApproveAll={bulkApproveSelected}
        />
      )}

      {/* List */}
      <div className="bg-[#f4f5f7] px-4 py-3">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {paged.map(item => (
              <BitRow
                key={item.id}
                item={item}
                school={item.school_id ? schoolMap.get(item.school_id) : undefined}
                selectable={activeTab === 'Pending Review'}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelection(item.id)}
                editing={editingId === item.id}
                onEdit={() => setEditingId(item.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={(patch) => handleUpdated(item.id, patch)}
                onRemoved={() => handleRemoved(item.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalResults={filtered.length}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-200">
      <School size={32} className="mb-2 opacity-30" />
      <p className="text-sm">No bits match the current filter</p>
    </div>
  )
}

// ── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search, onSearch, schoolId, onSchool, fromDate, onFromDate, toDate, onToDate,
  schools, dateLabel, resultCount, onReset,
}: {
  search:      string;    onSearch:   (v: string) => void
  schoolId:    string;    onSchool:   (v: string) => void
  fromDate:    string;    onFromDate: (v: string) => void
  toDate:      string;    onToDate:   (v: string) => void
  schools:     SchoolOption[]
  dateLabel:   string
  resultCount: number
  onReset:     () => void
}) {
  const hasFilter = !!(search || schoolId || fromDate || toDate)
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap text-sm">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search title or blurb…"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
        />
      </div>
      <select
        value={schoolId}
        onChange={e => onSchool(e.target.value)}
        className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer outline-none focus:border-primary max-w-[220px]"
      >
        <option value="">All schools</option>
        {schools.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="font-semibold">{dateLabel}:</span>
        <input
          type="date"
          value={fromDate}
          onChange={e => onFromDate(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-primary"
        />
        <span>→</span>
        <input
          type="date"
          value={toDate}
          onChange={e => onToDate(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-primary"
        />
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-900 underline"
        >
          Reset
        </button>
      )}
      <span className="ml-auto text-xs text-gray-500">
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </span>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, totalResults, onPage,
}: {
  page: number; totalPages: number; totalResults: number; onPage: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-between mt-3 px-1 text-xs text-gray-500">
      <span>
        Page <strong className="text-gray-700">{page}</strong> of {totalPages} · {totalResults} total
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Bit row ────────────────────────────────────────────────────────────────
// Dense list row used by all three tabs. Edit/Approve/Reject/Reopen actions
// switch per status. Expands into an inline editor when `editing` is true.

function BitRow({
  item, school, selectable, selected, onToggleSelect,
  editing, onEdit, onCancelEdit, onUpdated, onRemoved,
}: {
  item:           SchoolBitRow
  school?:        SchoolOption
  selectable:     boolean
  selected:       boolean
  onToggleSelect: () => void
  editing:        boolean
  onEdit:         () => void
  onCancelEdit:   () => void
  onUpdated:      (patch: Partial<SchoolBitRow>) => void
  onRemoved:      () => void
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | 'reopen' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Date shown in the right column — published for approved, created otherwise
  const date = item.status === 'approved' && item.published_at
    ? new Date(item.published_at)
    : new Date(item.created_at)
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Scheduled = approved with future published_at
  const scheduledFor = item.status === 'approved' && item.published_at && new Date(item.published_at).getTime() > Date.now()
    ? new Date(item.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  // School + area for the secondary metadata row
  const areaLabel = school
    ? (school.is_private ? 'Private' : (isValidArea(school.area) ? AREA_SHORT_LABELS[school.area] : school.area))
    : null
  const areaCls = school
    ? (school.is_private ? PRIVATE_BADGE_CLASS : (isValidArea(school.area) ? AREA_BADGE_CLASS[school.area] : 'bg-gray-500 text-white'))
    : 'bg-gray-500 text-white'

  async function call(action: 'approve' | 'reject' | 'reopen') {
    setBusy(action); setErr(null)
    try {
      const res = await fetch(`/api/admin/school-news/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      if (action === 'approve') onUpdated({ status: 'approved', published_at: item.published_at ?? new Date().toISOString() })
      if (action === 'reject')  onUpdated({ status: 'rejected' })
      if (action === 'reopen')  onUpdated({ status: 'pending'  })
    } finally { setBusy(null) }
  }

  async function remove() {
    if (!confirm('Delete this bit? This cannot be undone.')) return
    const res = await fetch(`/api/admin/school-news/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j?.error ?? `HTTP ${res.status}`)
      return
    }
    onRemoved()
  }

  return (
    <div className={`transition-colors ${selected ? 'bg-primary/5' : 'bg-white hover:bg-gray-50/60'}`}>
      <div className="px-4 py-3 flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 mt-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
            aria-label="Select for drip schedule"
          />
        )}

        {/* Thumbnail */}
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
          {item.image_web_url ? (
            <Image
              src={item.image_web_url}
              alt=""
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={20} />
            </div>
          )}
        </div>

        {/* Title / blurb / meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 truncate">{item.title}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ring-1 ${SOURCE_BADGE[item.source_type] ?? SOURCE_BADGE.staff_manual}`}>
              {SOURCE_LABEL[item.source_type] ?? item.source_type}
            </span>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-0.5">
                source <ExternalLink size={9} />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-snug line-clamp-2 mb-1.5">{item.blurb}</p>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-semibold text-gray-700">{item.school_name}</span>
            {areaLabel && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${areaCls}`}>
                {areaLabel}
              </span>
            )}
            {item.issue_month && (
              <span className="text-gray-500">
                Issue: {new Date(item.issue_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {scheduledFor && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 ring-1 ring-purple-200">
                <Calendar size={9} /> Scheduled {scheduledFor}
              </span>
            )}
            {item.status === 'approved' && !scheduledFor && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 ring-1 ring-green-200">
                <CheckCircle2 size={9} /> Live
              </span>
            )}
          </div>
          {err && <p className="text-xs text-rose-700 font-semibold mt-1">{err}</p>}
        </div>

        {/* Date column */}
        <div className="shrink-0 text-right text-[11px] text-gray-500 leading-tight w-24 pt-1">
          {dateLabel}
        </div>

        {/* Per-status action buttons */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {item.status === 'pending' && (
            <>
              <button
                onClick={() => call('approve')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-40"
              >
                {busy === 'approve' ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                Approve
              </button>
              <button
                onClick={() => call('reject')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40"
              >
                {busy === 'reject' ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
                Reject
              </button>
            </>
          )}
          {(item.status === 'approved' || item.status === 'rejected') && (
            <button
              onClick={() => call('reopen')}
              disabled={busy !== null}
              title="Move back to Pending Review"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              {busy === 'reopen' ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Reopen
            </button>
          )}
          <button
            onClick={editing ? onCancelEdit : onEdit}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Pencil size={11} />
            {editing ? 'Close' : 'Edit'}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              aria-label="More actions"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                />
                <div className="absolute right-0 mt-1 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); remove() }}
                    className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
                  >
                    <Trash2 size={11} /> Delete bit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inline editor */}
      {editing && (
        <BitRowEditor
          item={item}
          onCancel={onCancelEdit}
          onSaved={(patch) => { onUpdated(patch); onCancelEdit() }}
        />
      )}
    </div>
  )
}

// ── Inline editor ──────────────────────────────────────────────────────────
// Title, blurb, published_at, issue_month, replace-image. Works on any status.

function BitRowEditor({
  item, onCancel, onSaved,
}: {
  item:    SchoolBitRow
  onCancel: () => void
  onSaved: (patch: Partial<SchoolBitRow>) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [blurb, setBlurb] = useState(item.blurb)
  // published_at: native input wants YYYY-MM-DD; convert from ISO
  const initialPublishedAt = item.published_at
    ? new Date(item.published_at).toISOString().slice(0, 10)
    : ''
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt)
  const initialIssueMonth = item.issue_month
    ? new Date(item.issue_month).toISOString().slice(0, 7)
    : ''
  const [issueMonth, setIssueMonth] = useState(initialIssueMonth)
  const [imageBusy, setImageBusy] = useState(false)
  // cropBusy tracks the gravity being applied so we can show a spinner on
  // just the active grid cell (not the whole 9-grid).
  const [cropBusy,  setCropBusy]  = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(item.image_web_url)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/school-news/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          title,
          blurb,
          // null clears them; empty string also clears (matches API contract)
          published_at: publishedAt || null,
          issue_month:  issueMonth  ? `${issueMonth}-01` : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onSaved({
        title,
        blurb,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        issue_month:  issueMonth  ? `${issueMonth}-01` : null,
      })
    } finally { setBusy(false) }
  }

  async function replaceImage(file: File) {
    setImageBusy(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('action', 'replace-image')
      fd.append('image',  file)
      const res = await fetch(`/api/admin/school-news/${item.id}`, { method: 'PATCH', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setPreviewUrl(json.image_web_url)
      onSaved({ image_web_url: json.image_web_url })
    } finally {
      setImageBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Re-crop the existing original with a chosen gravity. Same photo, new
  // focal point — no upload required. Bust the cache on the preview by
  // appending a timestamp so the browser always shows the fresh crop even
  // though the new URL is a different path anyway.
  async function recrop(gravity: string) {
    setCropBusy(gravity); setErr(null)
    try {
      const res = await fetch(`/api/admin/school-news/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 're-crop', gravity }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      const fresh = `${json.image_web_url}?t=${Date.now()}`
      setPreviewUrl(fresh)
      onSaved({ image_web_url: json.image_web_url })
    } finally {
      setCropBusy(null)
    }
  }

  return (
    <div className="bg-blue-50/40 border-t border-blue-100 px-4 py-4">
      <div className="grid md:grid-cols-[160px_1fr] gap-4">
        {/* Image / replace */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1.5">Image</p>
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-white ring-1 ring-blue-200">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon size={28} />
              </div>
            )}
          </div>
          <label className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold border border-dashed border-blue-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 text-blue-800">
            {imageBusy ? <RefreshCw size={11} className="animate-spin" /> : <Camera size={11} />}
            {imageBusy ? 'Processing…' : 'Replace image'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/avif"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) replaceImage(f)
              }}
            />
          </label>

          {/* Focal-point picker — re-crops the existing original with the
              chosen gravity. Use when the auto crop missed the subject and
              you don't want to re-upload. */}
          <CropGravityPicker
            busyGravity={cropBusy}
            disabled={imageBusy || cropBusy !== null}
            onPick={recrop}
          />
        </div>

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-sm font-semibold border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">Blurb</label>
            <textarea
              value={blurb}
              onChange={e => setBlurb(e.target.value)}
              className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white resize-y min-h-[80px]"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">Published date</label>
              <input
                type="date"
                value={publishedAt}
                onChange={e => setPublishedAt(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded outline-none focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-blue-700/70 mt-0.5">Backdate to sort old bits. Blank = unscheduled.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">Print issue month</label>
              <input
                type="month"
                value={issueMonth}
                onChange={e => setIssueMonth(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded outline-none focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-blue-700/70 mt-0.5">Filters the print export ZIP.</p>
            </div>
          </div>
          {err && <p className="text-xs text-rose-700 font-semibold">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40"
            >
              {busy ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Save changes
            </button>
            <button onClick={onCancel} className="px-3 py-1.5 text-xs text-blue-800 hover:text-blue-950">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Crop gravity picker ─────────────────────────────────────────────────────
// 3×3 grid mapping to sharp's compass positions + an "Auto" button that
// re-runs the attention strategy. Each cell triggers a server re-crop on
// the saved original — no upload required.

const GRAVITY_GRID: Array<{ gravity: string; label: string }> = [
  { gravity: 'northwest', label: '↖' },
  { gravity: 'north',     label: '↑' },
  { gravity: 'northeast', label: '↗' },
  { gravity: 'west',      label: '←' },
  { gravity: 'center',    label: '•' },
  { gravity: 'east',      label: '→' },
  { gravity: 'southwest', label: '↙' },
  { gravity: 'south',     label: '↓' },
  { gravity: 'southeast', label: '↘' },
]

function CropGravityPicker({
  busyGravity, disabled, onPick,
}: {
  busyGravity: string | null
  disabled:    boolean
  onPick:      (gravity: string) => void
}) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">Pick focus</p>
      <div className="grid grid-cols-3 gap-1 mb-1.5">
        {GRAVITY_GRID.map(({ gravity, label }) => {
          const isBusy = busyGravity === gravity
          return (
            <button
              key={gravity}
              type="button"
              onClick={() => onPick(gravity)}
              disabled={disabled}
              title={`Crop toward ${gravity}`}
              className="aspect-square inline-flex items-center justify-center text-base font-bold rounded border border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50 text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBusy ? <RefreshCw size={11} className="animate-spin" /> : label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onPick('attention')}
        disabled={disabled}
        className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50 text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busyGravity === 'attention' ? <RefreshCw size={10} className="animate-spin" /> : null}
        Auto (attention)
      </button>
      <p className="text-[10px] text-blue-700/70 mt-1 leading-tight">
        Click a direction to recrop the same photo toward that part of the frame. Try a corner if the subject is off to one side.
      </p>
    </div>
  )
}

// ── Quick Add panel ─────────────────────────────────────────────────────────

const IMAGE_TYPE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/avif'
const IMAGE_MAX_BYTES   = 25 * 1024 * 1024
const MAX_IMAGES_PER_BIT = 3

function QuickAddPanel({
  schools: initialSchools, onCancel, onAdded, onAddedKeepOpen,
}: {
  schools:         SchoolOption[]
  onCancel:        () => void
  /** Append the bit AND close the panel. Used by "Publish Now" / "Save to queue". */
  onAdded:         (bit: SchoolBitRow) => void
  /** Append the bit but keep the panel open. Used by "Publish & Add Another". */
  onAddedKeepOpen: (bit: SchoolBitRow) => void
}) {
  const [fbUrl,    setFbUrl]    = useState('')
  const [blurb,    setBlurb]    = useState('')
  const [title,    setTitle]    = useState('')
  const [issueMonth,  setIssueMonth]  = useState('')   // YYYY-MM; blank = next issue
  const [publishedAt, setPublishedAt] = useState('')   // YYYY-MM-DD; blank = approval date
  // busy carries the active submit mode so the right button shows the spinner
  const [busy,     setBusy]     = useState<'publish' | 'publish-and-add' | 'queue' | null>(null)
  const [err,      setErr]      = useState<string | null>(null)

  // Images: up to 3 files OR up to 3 pasted URLs. Mutually exclusive paths.
  const [imageFiles,    setImageFiles]    = useState<File[]>([])
  const [imageFilePreviews, setImageFilePreviews] = useState<string[]>([])
  const [imageUrls,     setImageUrls]     = useState<string[]>([''])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef     = useRef<HTMLInputElement>(null)

  const [schools, setSchools] = useState<TypeaheadSchool[]>(
    () => initialSchools.map(s => ({ ...s, area: s.area as Area })),
  )
  const [selected, setSelected] = useState<TypeaheadSchool | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null)
    const incoming = Array.from(e.target.files ?? [])
    if (incoming.length === 0) return
    const slotsLeft = MAX_IMAGES_PER_BIT - imageFiles.length
    if (slotsLeft <= 0) {
      setErr(`Max ${MAX_IMAGES_PER_BIT} photos per bit. Remove one to add another.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const toAdd: File[] = []
    for (const f of incoming.slice(0, slotsLeft)) {
      if (f.size > IMAGE_MAX_BYTES) {
        setErr(`"${f.name}" too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`)
        continue
      }
      toAdd.push(f)
    }
    if (toAdd.length === 0) return
    setImageFiles(prev => [...prev, ...toAdd])
    setImageFilePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    setImageUrls([''])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImageFile(idx: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImageFilePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function moveFileToHero(idx: number) {
    if (idx === 0) return
    setImageFiles(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)])
    setImageFilePreviews(prev => [prev[idx], ...prev.filter((_, i) => i !== idx)])
  }

  function updateImageUrl(idx: number, value: string) {
    setImageUrls(prev => prev.map((v, i) => i === idx ? value : v))
    if (value.trim() && imageFiles.length > 0) {
      setImageFiles([])
      setImageFilePreviews([])
    }
  }

  function addImageUrlSlot() {
    if (imageUrls.length >= MAX_IMAGES_PER_BIT) return
    setImageUrls(prev => [...prev, ''])
  }

  function clearAllImages() {
    setImageFiles([])
    setImageFilePreviews([])
    setImageUrls([''])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Three submit modes:
  //   'publish'           → status=approved, panel closes, list refreshes
  //   'publish-and-add'   → status=approved, panel stays open, form resets
  //   'queue'             → status=pending, panel closes (rare — for drafts
  //                         we want a human to look at later)
  // 'busy' carries the active mode so the right button shows a spinner.
  type SubmitMode = 'publish' | 'publish-and-add' | 'queue'

  async function submit(mode: SubmitMode) {
    if (!title.trim() || !blurb.trim() || !selected) return
    setBusy(mode); setErr(null)
    try {
      const targetStatus = mode === 'queue' ? 'pending' : 'approved'
      let res: Response

      const filledUrls = imageUrls.map(u => u.trim()).filter(Boolean)

      if (imageFiles.length > 0) {
        const fd = new FormData()
        imageFiles.forEach((file, i) => {
          fd.append(i === 0 ? 'image' : `image${i + 1}`, file)
        })
        fd.append('school_id',   selected.id)
        fd.append('title',       title)
        fd.append('blurb',       blurb)
        if (fbUrl)        fd.append('source_url',   fbUrl)
        fd.append('source_type', fbUrl ? 'staff_facebook' : 'staff_manual')
        if (issueMonth.trim())  fd.append('issue_month',  issueMonth.trim())
        if (publishedAt.trim()) fd.append('published_at', publishedAt.trim())
        fd.append('status', targetStatus)
        res = await fetch('/api/admin/school-news', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/admin/school-news', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id:    selected.id,
            title,
            blurb,
            source_url:   fbUrl || undefined,
            source_type:  fbUrl ? 'staff_facebook' : 'staff_manual',
            image_urls:   filledUrls.length > 0 ? filledUrls : undefined,
            issue_month:  issueMonth.trim()  || undefined,
            published_at: publishedAt.trim() || undefined,
            status:       targetStatus,
          }),
        })
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }

      const nowIso         = new Date().toISOString()
      const finalPublished = publishedAt.trim()
        ? new Date(publishedAt.trim()).toISOString()
        : (targetStatus === 'approved' ? nowIso : null)

      const added: SchoolBitRow = {
        id:                 json.bit.id,
        school_id:          selected.id,
        school_name:        selected.name,
        title,
        blurb,
        image_web_url:      json.bit.image_web_url ?? null,
        source_type:        fbUrl ? 'staff_facebook' : 'staff_manual',
        source_url:         fbUrl || null,
        submitted_by_name:  null,
        submitted_by_email: null,
        status:             targetStatus,
        issue_month:        issueMonth.trim()  || null,
        published_at:       finalPublished,
        created_at:         nowIso,
      }

      if (mode === 'publish-and-add') {
        // Hold onto the school selection — typical use is multiple bits for
        // the same school in one sitting. Everything else resets.
        onAddedKeepOpen(added)
        setTitle(''); setBlurb(''); setFbUrl('')
        setIssueMonth(''); setPublishedAt('')
        clearAllImages()
        setErr(null)
        // Focus title for fast continuation
        titleRef.current?.focus()
      } else {
        onAdded(added)
        setTitle(''); setBlurb(''); setFbUrl(''); setSelected(null)
        setIssueMonth(''); setPublishedAt('')
        clearAllImages()
      }
    } finally { setBusy(null) }
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 shrink-0">
      <div className="max-w-3xl space-y-3">
        <h3 className="text-sm font-semibold text-blue-900">Quick Add School Bit</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-blue-800 mb-1">School *</label>
            <SchoolTypeahead
              schools={schools}
              value={selected?.id ?? null}
              onChange={setSelected}
              onSchoolAdded={(s) => setSchools(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))}
              placeholder="Begin typing your school's name…"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-800 mb-1">Facebook Post URL <span className="font-normal text-blue-600">(optional)</span></label>
            <div className="relative">
              <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
              <input type="url" value={fbUrl} onChange={e => setFbUrl(e.target.value)}
                placeholder="https://facebook.com/post/..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">Headline *</label>
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Pine Level Elementary Named Purple Star School"
            className="w-full px-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">News Blurb *</label>
          <textarea value={blurb} onChange={e => setBlurb(e.target.value)}
            placeholder="Paste the Facebook post text or type the school news blurb here…"
            className="w-full px-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400 resize-y min-h-[80px]" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">
            Images <span className="font-normal text-blue-600">
              ({imageFiles.length > 0 ? `${imageFiles.length}/${MAX_IMAGES_PER_BIT} uploaded` : 'optional but recommended'})
              {imageFiles.length > 1 && ' · first is the cover'}
            </span>
          </label>

          {imageFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {imageFilePreviews.map((url, i) => (
                <div key={i} className="relative rounded-lg border-2 border-blue-200 bg-white overflow-hidden aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full bg-primary text-primary-foreground shadow-sm">
                      Cover
                    </span>
                  )}
                  <button type="button" onClick={() => removeImageFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-rose-700 shadow-sm"
                    aria-label="Remove">
                    <X size={11} />
                  </button>
                  {i > 0 && (
                    <button type="button" onClick={() => moveFileToHero(i)}
                      className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 hover:bg-black/80 text-white">
                      Use as cover
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {imageFiles.length === 0 ? (
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="flex flex-col items-center justify-center px-4 py-5 border-2 border-dashed border-blue-200 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <Camera className="h-5 w-5 text-blue-400 mb-1" />
                <span className="text-xs font-semibold text-blue-900">Upload from device</span>
                <span className="text-[10px] text-blue-600 mt-0.5">Up to {MAX_IMAGES_PER_BIT} photos · 25 MB each</span>
                <input ref={fileInputRef} type="file" accept={IMAGE_TYPE_ACCEPT} multiple onChange={handleFileChange} className="hidden" />
              </label>

              <div className="border-2 border-dashed border-blue-200 rounded-lg bg-white px-3 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-900 inline-flex items-center gap-1">
                  <LinkIcon size={12} /> Or paste image URL{imageUrls.length > 1 ? 's' : ''}
                </p>
                {imageUrls.map((url, i) => (
                  <input key={i} type="url" value={url} onChange={e => updateImageUrl(i, e.target.value)}
                    placeholder={i === 0 ? 'https://…/image.jpg' : `Optional photo ${i + 1}`}
                    className="w-full px-2 py-1 text-xs border border-blue-200 rounded outline-none focus:border-blue-400" />
                ))}
                {imageUrls.length < MAX_IMAGES_PER_BIT && imageUrls.some(u => u.trim()) && (
                  <button type="button" onClick={addImageUrlSlot}
                    className="text-[10px] font-bold text-blue-700 hover:underline">
                    + Add another URL
                  </button>
                )}
                <p className="text-[10px] text-blue-600 leading-tight">
                  Right-click any image on a Facebook post → &ldquo;Copy image address&rdquo; → paste here.
                </p>
              </div>
            </div>
          ) : imageFiles.length < MAX_IMAGES_PER_BIT && (
            <label className="flex items-center justify-center px-4 py-2 border border-dashed border-blue-200 rounded-lg bg-white cursor-pointer hover:border-blue-400 text-xs font-semibold text-blue-900">
              <Camera className="h-3.5 w-3.5 text-blue-400 mr-1.5" />
              Add another photo ({imageFiles.length}/{MAX_IMAGES_PER_BIT})
              <input ref={fileInputRef} type="file" accept={IMAGE_TYPE_ACCEPT} multiple onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        <details className="rounded-lg border border-blue-200 bg-white/60">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-blue-900 select-none">
            Backfill / scheduling <span className="font-normal text-blue-600">(leave blank for next issue + now)</span>
          </summary>
          <div className="px-3 pb-3 pt-1 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">Print issue month</label>
              <input type="month" value={issueMonth} onChange={e => setIssueMonth(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded outline-none focus:border-blue-400 bg-white" />
              <p className="text-[10px] text-blue-700/70 mt-0.5">Blank = next issue. Used by the print export ZIP filter.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">Publish date</label>
              <input type="date" value={publishedAt} onChange={e => setPublishedAt(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded outline-none focus:border-blue-400 bg-white" />
              <p className="text-[10px] text-blue-700/70 mt-0.5">Blank = stamps at approval. Backdate to sort old bits in time order.</p>
            </div>
          </div>
        </details>

        {err && <p className="text-sm text-rose-700 font-semibold">{err}</p>}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Primary: publish immediately. Staff IS the moderator, no need to queue. */}
          <button
            onClick={() => submit('publish')}
            disabled={!title.trim() || !blurb.trim() || !selected || busy !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {busy === 'publish' ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {busy === 'publish' ? 'Publishing…' : 'Publish Now'}
          </button>

          {/* Batch helper — publishes + keeps the panel open + resets the
               form (school selection preserved) for fast continuation. */}
          <button
            onClick={() => submit('publish-and-add')}
            disabled={!title.trim() || !blurb.trim() || !selected || busy !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {busy === 'publish-and-add' ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
            {busy === 'publish-and-add' ? 'Publishing…' : 'Publish & Add Another'}
          </button>

          {/* Tertiary: drop into Pending Review without publishing — for
               drafts a teammate should look at first. */}
          <button
            onClick={() => submit('queue')}
            disabled={!title.trim() || !blurb.trim() || !selected || busy !== null}
            className="text-xs text-blue-700 hover:text-blue-900 underline disabled:opacity-40 ml-1"
          >
            {busy === 'queue' ? 'Saving…' : 'Save to queue instead'}
          </button>

          <button onClick={onCancel} className="ml-auto px-3 py-2 text-sm text-blue-700 hover:text-blue-900">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk Action Bar ─────────────────────────────────────────────────────────
// Sticky bar above the list (Pending Review only). Holds a tristate
// select-all checkbox, a count, and two bulk actions:
//   - Approve all selected (publishes immediately)
//   - Drip-schedule selected (staggers publish dates over a window)
// Selection is page-scoped — the parent tracks ids in a Set.

function BulkActionBar({
  totalVisible, selectedCount,
  onSelectAll, onClear, onSchedule, onApproveAll,
}: {
  totalVisible:  number
  selectedCount: number
  onSelectAll:   () => void
  onClear:       () => void
  onSchedule:    (overDays: number, startAt: string) => Promise<void>
  onApproveAll:  () => Promise<void>
}) {
  const [overDays, setOverDays]   = useState(14)
  const [startAt,  setStartAt]    = useState('')
  const [busy,     setBusy]       = useState<'drip' | 'approve' | null>(null)
  // Tristate: checked when all on page selected, indeterminate when some,
  // unchecked when none. React doesn't expose 'indeterminate' as a prop
  // so set it via ref. See https://github.com/facebook/react/issues/1798
  const checkboxRef = useRef<HTMLInputElement>(null)
  const allOnPageSelected = selectedCount === totalVisible && totalVisible > 0
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = selectedCount > 0 && !allOnPageSelected
    }
  }, [selectedCount, allOnPageSelected])

  async function drip() {
    setBusy('drip')
    try { await onSchedule(overDays, startAt) }
    finally { setBusy(null) }
  }
  async function approve() {
    setBusy('approve')
    try { await onApproveAll() }
    finally { setBusy(null) }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap text-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allOnPageSelected}
            onChange={() => (allOnPageSelected ? onClear() : onSelectAll())}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            aria-label="Select all on this page"
          />
          <span className={selectedCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}>
            {selectedCount === 0
              ? `Select all ${totalVisible} on this page`
              : `${selectedCount} selected`}
          </span>
        </label>
        {selectedCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-900 underline">
            Clear
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bulk approve — publishes immediately, status=approved, published_at=now (or preserved backdate) */}
          <button
            type="button"
            onClick={approve}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
          >
            {busy === 'approve' ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            {busy === 'approve' ? 'Approving…' : `Approve ${selectedCount}`}
          </button>

          {/* Drip-schedule controls — staggers publish across a date window */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-gray-500 inline-flex items-center gap-1">
              <Calendar size={12} /> Drip over
            </span>
            <input type="number" value={overDays}
              onChange={e => setOverDays(Math.max(1, Math.min(60, Number(e.target.value) || 14)))}
              min={1} max={60} className="w-14 text-xs px-2 py-1 border border-gray-200 rounded" />
            <span className="text-gray-500">days starting</span>
            <input type="date" value={startAt} onChange={e => setStartAt(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded" />
            <span className="text-[10px] text-gray-400">(blank = today)</span>
            <button type="button" onClick={drip} disabled={busy !== null}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40">
              {busy === 'drip' ? <RefreshCw size={11} className="animate-spin" /> : <Clock size={11} />}
              {busy === 'drip' ? 'Scheduling…' : `Schedule ${selectedCount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
