'use client'

// EventsAdminClient — central admin view for calendar events.
// Mirrors the School Bits admin shape so staff can move between them
// fluidly: dense rows, status tabs, filter bar, 30-per-page pagination,
// inline editor, bulk approve, Quick Add.

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Upload, Settings, RefreshCw, Search, ChevronLeft, ChevronRight,
  Calendar, Clock, MapPin, Star, CheckCircle2, X, Pencil, MoreVertical,
  Trash2, Image as ImageIcon, ExternalLink, RotateCcw, Camera, Eye, Crop,
} from 'lucide-react'
import type { EventRow, EventSource } from './page'
import { QuickAddEventPanel } from './QuickAddEventPanel'

const PAGE_SIZE = 30

const TABS = ['Upcoming', 'Past', 'Pending Review', 'Cancelled'] as const
type TabName = typeof TABS[number]

// Map tab → predicate over a row. Decoupled from status because "Upcoming"
// and "Past" both look at published events; tab is a date filter, not a
// status filter.
function eventMatchesTab(row: EventRow, tab: TabName, todayIso: string): boolean {
  if (tab === 'Pending Review') return row.status === 'pending'
  if (tab === 'Cancelled')      return row.status === 'cancelled'
  // Upcoming / Past are both about published or approved events
  const isLive = row.status === 'published' || row.status === 'approved'
  if (!isLive) return false
  if (tab === 'Upcoming') return row.start_date >= todayIso
  return row.start_date < todayIso
}

const SOURCE_BADGE: Record<string, string> = {
  'public-submission': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'public_form':       'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'ical':              'bg-sky-50 text-sky-700 ring-sky-200',
  'ai-extraction':     'bg-purple-50 text-purple-700 ring-purple-200',
  'csv-import':        'bg-amber-50 text-amber-700 ring-amber-200',
  'staff':             'bg-gray-50 text-gray-600 ring-gray-200',
  'manual':            'bg-gray-50 text-gray-600 ring-gray-200',
}
function sourceClass(s: string | null | undefined): string {
  return SOURCE_BADGE[s ?? ''] ?? 'bg-gray-50 text-gray-500 ring-gray-200'
}

const CATEGORY_OPTIONS = [
  '', 'family-friendly', 'free', 'kids', 'teen', 'sports', 'arts',
  'education', 'music', 'food', 'holiday', 'community', 'fundraiser',
]

interface Props {
  initialEvents: EventRow[]
  sources:       EventSource[]
}

export function EventsAdminClient({ initialEvents, sources }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') === 'pending' ? 'Pending Review' : 'Upcoming'

  const [events,    setEvents]    = useState<EventRow[]>(initialEvents)
  const [activeTab, setActiveTab] = useState<TabName>(initialTab)
  const [quickAdd,  setQuickAdd]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Filters apply within the active tab
  const [search,    setSearch]   = useState('')
  const [sourceId,  setSourceId] = useState('')
  const [category,  setCategory] = useState('')
  const [fromDate,  setFromDate] = useState('')
  const [toDate,    setToDate]   = useState('')
  const [page,      setPage]     = useState(1)
  // Inline-editor row id; null = no row in edit mode
  const [editingId, setEditingId] = useState<string | null>(null)

  const todayIso = new Date().toISOString().split('T')[0]

  const counts: Record<TabName, number> = useMemo(() => ({
    'Upcoming':       events.filter(e => eventMatchesTab(e, 'Upcoming',       todayIso)).length,
    'Past':           events.filter(e => eventMatchesTab(e, 'Past',           todayIso)).length,
    'Pending Review': events.filter(e => eventMatchesTab(e, 'Pending Review', todayIso)).length,
    'Cancelled':      events.filter(e => eventMatchesTab(e, 'Cancelled',      todayIso)).length,
  }), [events, todayIso])

  // Tab-scoped + filtered list
  const filtered = useMemo(() => {
    const q     = search.trim().toLowerCase()
    const fMs   = fromDate ? new Date(fromDate).getTime() : null
    const tMs   = toDate ? new Date(toDate + 'T23:59:59').getTime() : null
    return events.filter(e => {
      if (!eventMatchesTab(e, activeTab, todayIso)) return false
      if (q && !(
        e.title.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.location_name ?? '').toLowerCase().includes(q) ||
        (e.organizer_name ?? '').toLowerCase().includes(q)
      )) return false
      if (sourceId) {
        const wantName = sources.find(s => s.id === sourceId)?.name
        if (!wantName || e.source_name !== wantName) return false
      }
      if (category && e.category !== category) return false
      if (fMs !== null || tMs !== null) {
        const t = new Date(e.start_date).getTime()
        if (fMs !== null && t < fMs) return false
        if (tMs !== null && t > tMs) return false
      }
      return true
    })
  }, [events, activeTab, search, sourceId, category, fromDate, toDate, todayIso, sources])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function switchTab(tab: TabName) {
    setActiveTab(tab)
    setSelectedIds(new Set())
    setEditingId(null)
    setPage(1)
  }
  function resetFilters() {
    setSearch(''); setSourceId(''); setCategory(''); setFromDate(''); setToDate(''); setPage(1)
  }
  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function selectAllVisible() { setSelectedIds(new Set(paged.map(p => p.id))) }
  function clearSelection()   { setSelectedIds(new Set()) }

  function handleAdded(ev: EventRow) {
    setEvents(prev => [ev, ...prev])
    setQuickAdd(false)
    setActiveTab(ev.status === 'pending' ? 'Pending Review' : 'Upcoming')
    setPage(1)
    router.refresh()
  }
  function handleUpdated(id: string, patch: Partial<EventRow>) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    router.refresh()
  }
  function handleRemoved(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    setEditingId(curr => curr === id ? null : curr)
  }

  // Single point of dispatch for every bulk button. Optimistic local update
  // mirrors what the server is about to write so the row state changes
  // immediately; router.refresh() reconciles after.
  type BulkAction = 'approve' | 'reject' | 'cancel' | 'reopen' | 'delete' | 'feature' | 'unfeature'

  async function runBulkAction(action: BulkAction): Promise<void> {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    const confirmCopy: Partial<Record<BulkAction, string>> = {
      reject: `Reject ${ids.length} event(s)?`,
      delete: `Move ${ids.length} event(s) to trash? (soft delete — recoverable)`,
      cancel: `Cancel ${ids.length} event(s)? They stay in the DB but hide from public.`,
    }
    const ask = confirmCopy[action]
    if (ask && !confirm(ask)) return

    const res = await fetch('/api/admin/events/bulk-action', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids, action }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error ?? `HTTP ${res.status}`)
      return
    }

    // Optimistic local apply
    setEvents(prev => prev.map(e => {
      if (!ids.includes(e.id)) return e
      switch (action) {
        case 'approve':   return { ...e, status: 'published' }
        case 'reject':    return { ...e, status: 'rejected'  }
        case 'cancel':    return { ...e, status: 'cancelled' }
        case 'reopen':    return { ...e, status: 'pending'   }
        case 'feature':   return { ...e, is_featured: true   }
        case 'unfeature': return { ...e, is_featured: false, featured_until: null }
        case 'delete':    return { ...e, status: 'archived'  }
      }
    }))
    // For deletes, also drop from the visible list since they're gone from
    // all the alive-only tabs.
    if (action === 'delete') {
      setEvents(prev => prev.filter(e => !ids.includes(e.id)))
    }
    clearSelection()
    router.refresh()
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900">Events</h1>
          {counts['Pending Review'] > 0 && (
            <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
              {counts['Pending Review']} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/events/organizations"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Settings size={13} /> Community Connections
          </Link>
          <Link
            href="/admin/content/events-import"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Upload size={13} /> Import CSV
          </Link>
          <button
            onClick={() => setQuickAdd(v => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
          >
            <Plus size={14} /> Quick Add Event
          </button>
        </div>
      </div>

      {quickAdd && (
        <QuickAddEventPanel
          sources={sources}
          onCancel={() => setQuickAdd(false)}
          onAdded={handleAdded}
        />
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
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
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${
                activeTab === tab ? 'bg-primary/5 text-primary ring-primary/20' : 'bg-gray-50 text-gray-400 ring-gray-200'
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap text-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search title, venue, organizer…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.filter(Boolean).map(c => (
            <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
          ))}
        </select>
        {sources.length > 0 && (
          <select
            value={sourceId}
            onChange={e => { setSourceId(e.target.value); setPage(1) }}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer outline-none focus:border-primary max-w-[200px]"
          >
            <option value="">All sources</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-semibold">Date:</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1) }}
            className="px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-primary"
          />
          <span>→</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1) }}
            className="px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-primary"
          />
        </div>
        {(search || sourceId || category || fromDate || toDate) && (
          <button type="button" onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-900 underline">
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Bulk action bar — always visible. Buttons surface what makes sense
          for the current tab (approve only matters in Pending, etc.). */}
      {paged.length > 0 && (
        <BulkBar
          activeTab={activeTab}
          totalVisible={paged.length}
          selectedCount={selectedIds.size}
          onSelectAll={selectAllVisible}
          onClear={clearSelection}
          onRunAction={runBulkAction}
        />
      )}

      {/* List */}
      <div className="bg-[#f4f5f7] px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Calendar size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No events match the current filter</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {paged.map(ev => (
              <EventRowItem
                key={ev.id}
                ev={ev}
                selectable
                selected={selectedIds.has(ev.id)}
                onToggleSelect={() => toggleSelection(ev.id)}
                editing={editingId === ev.id}
                onEdit={() => setEditingId(ev.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={(patch) => handleUpdated(ev.id, patch)}
                onRemoved={() => handleRemoved(ev.id)}
              />
            ))}
          </div>
        )}

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

// ── Bulk action bar ────────────────────────────────────────────────────────
// Visible on every tab. The button set is tab-aware so operators only see
// actions that actually move events between meaningful states from where
// they are:
//
//   Pending Review → Approve · Reject · Feature · Unfeature · Trash
//   Upcoming       → Feature · Unfeature · Cancel · Trash
//   Past           → Feature · Unfeature · Trash
//   Cancelled      → Reopen (back to Pending) · Trash
//
// "Trash" is soft delete — the rows survive in the DB with deleted_at set.

type BulkActionKind =
  'approve' | 'reject' | 'cancel' | 'reopen' | 'delete' | 'feature' | 'unfeature'

interface BulkButton {
  action: BulkActionKind
  label:  string   // % is replaced with the selected count
  icon:   React.ComponentType<{ size?: number; className?: string }>
  tone:   'green' | 'red' | 'amber' | 'gray' | 'rose'
}

const BUTTONS_BY_TAB: Record<TabName, BulkButton[]> = {
  'Pending Review': [
    { action: 'approve',   label: 'Approve %',   icon: CheckCircle2, tone: 'green' },
    { action: 'reject',    label: 'Reject %',    icon: X,            tone: 'red'   },
    { action: 'feature',   label: 'Feature %',   icon: Star,         tone: 'amber' },
    { action: 'unfeature', label: 'Unfeature %', icon: Star,         tone: 'gray'  },
    { action: 'delete',    label: 'Trash %',     icon: Trash2,       tone: 'rose'  },
  ],
  'Upcoming': [
    { action: 'feature',   label: 'Feature %',   icon: Star,   tone: 'amber' },
    { action: 'unfeature', label: 'Unfeature %', icon: Star,   tone: 'gray'  },
    { action: 'cancel',    label: 'Cancel %',    icon: X,      tone: 'gray'  },
    { action: 'delete',    label: 'Trash %',     icon: Trash2, tone: 'rose'  },
  ],
  'Past': [
    { action: 'feature',   label: 'Feature %',   icon: Star,   tone: 'amber' },
    { action: 'unfeature', label: 'Unfeature %', icon: Star,   tone: 'gray'  },
    { action: 'delete',    label: 'Trash %',     icon: Trash2, tone: 'rose'  },
  ],
  'Cancelled': [
    { action: 'reopen', label: 'Reopen % to Pending', icon: RotateCcw, tone: 'green' },
    { action: 'delete', label: 'Trash %',             icon: Trash2,    tone: 'rose'  },
  ],
}

const TONE_CLS: Record<BulkButton['tone'], string> = {
  green: 'bg-green-600 text-white hover:bg-green-700',
  red:   'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
  gray:  'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  rose:  'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
}

function BulkBar({
  activeTab, totalVisible, selectedCount, onSelectAll, onClear, onRunAction,
}: {
  activeTab:     TabName
  totalVisible:  number
  selectedCount: number
  onSelectAll:   () => void
  onClear:       () => void
  onRunAction:   (action: BulkActionKind) => Promise<void>
}) {
  const [busy, setBusy] = useState<BulkActionKind | null>(null)
  const allSelected = selectedCount === totalVisible && totalVisible > 0
  const buttons     = BUTTONS_BY_TAB[activeTab]

  async function go(action: BulkActionKind) {
    setBusy(action)
    try { await onRunAction(action) } finally { setBusy(null) }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap text-sm">
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => (allSelected ? onClear() : onSelectAll())}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label="Select all on this page"
        />
        <span className={selectedCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}>
          {selectedCount === 0
            ? `Select all ${totalVisible} on this page`
            : `${selectedCount} selected`}
        </span>
        {selectedCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-gray-500 hover:text-gray-900 underline ml-2">
            Clear
          </button>
        )}
      </label>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {buttons.map(b => {
            const Icon = b.icon
            const label = b.label.replace('%', String(selectedCount))
            return (
              <button
                key={b.action}
                type="button"
                onClick={() => go(b.action)}
                disabled={busy !== null}
                className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 ${TONE_CLS[b.tone]}`}
              >
                {busy === b.action ? <RefreshCw size={11} className="animate-spin" /> : <Icon size={11} />}
                {label}
              </button>
            )
          })}
        </div>
      )}
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

// ── Event row ──────────────────────────────────────────────────────────────

function EventRowItem({
  ev, selectable, selected, onToggleSelect, editing, onEdit, onCancelEdit, onUpdated, onRemoved,
}: {
  ev:             EventRow
  selectable:     boolean
  selected:       boolean
  onToggleSelect: () => void
  editing:        boolean
  onEdit:         () => void
  onCancelEdit:   () => void
  onUpdated:      (patch: Partial<EventRow>) => void
  onRemoved:      () => void
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | 'cancel' | 'reopen' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const start  = new Date(ev.start_date + 'T12:00:00')
  const dateLabel = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLabel = ev.start_time
    ? formatTime(ev.start_time) + (ev.end_time ? ` – ${formatTime(ev.end_time)}` : '')
    : 'All day'

  async function call(action: 'approve' | 'reject' | 'cancel' | 'reopen') {
    setBusy(action); setErr(null)
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      const next = action === 'approve' ? 'published'
                  : action === 'reject' ? 'rejected'
                  : action === 'cancel' ? 'cancelled'
                  : 'pending'
      onUpdated({ status: next })
    } finally { setBusy(null) }
  }

  async function remove() {
    if (!confirm('Delete this event? (Soft delete — recoverable from trash)')) return
    const res = await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' })
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
            aria-label="Select"
          />
        )}

        {/* Thumb */}
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
          {ev.hero_image_url ? (
            <Image src={ev.hero_image_url} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={20} />
            </div>
          )}
        </div>

        {/* Title / desc / meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 truncate">{ev.title}</h3>
            {ev.is_featured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                <Star size={9} className="fill-amber-500 text-amber-500" /> Featured
              </span>
            )}
            {/* "Possible duplicate" badge — set automatically by iCal ingest
                or AI extraction when an incoming event resembles an existing
                row, stored as a prefix in discovery_notes. Editors see this
                at-a-glance in the list and can resolve via the editor. */}
            {typeof ev.discovery_notes === 'string' && /^possible duplicate/i.test(ev.discovery_notes) && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200" title={ev.discovery_notes}>
                ⚠ Possible duplicate
              </span>
            )}
            {ev.source_type && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ring-1 ${sourceClass(ev.source_type)}`}>
                {ev.source_type.replace(/[-_]/g, ' ')}
              </span>
            )}
            {ev.source_url && (
              <a href={ev.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-0.5">
                source <ExternalLink size={9} />
              </a>
            )}
          </div>
          {ev.description && (
            <p className="text-xs text-gray-600 leading-snug line-clamp-2 mb-1.5">{ev.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> {timeLabel}
            </span>
            {(ev.location_name || ev.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {ev.location_name || ev.city}
              </span>
            )}
            {ev.organizer_name && (
              <span className="text-gray-600">By {ev.organizer_name}</span>
            )}
            {ev.is_free && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 ring-1 ring-green-200">
                Free
              </span>
            )}
          </div>
          {err && <p className="text-xs text-rose-700 font-semibold mt-1">{err}</p>}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {ev.status === 'pending' && (
            <>
              <a
                href={`/admin/events/preview/${ev.id}`}
                target="_blank"
                rel="noreferrer"
                title="Preview the public page before approving"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100"
              >
                <Eye size={11} /> Preview
              </a>
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
          {(ev.status === 'published' || ev.status === 'approved') && (
            <button
              onClick={() => call('cancel')}
              disabled={busy !== null}
              title="Mark as cancelled — stays in DB, hidden from public"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              {busy === 'cancel' ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
              Cancel
            </button>
          )}
          {(ev.status === 'rejected' || ev.status === 'cancelled') && (
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
                  {ev.slug && (
                    <a
                      href={`/calendar/events/${ev.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <ExternalLink size={11} /> View public page
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); remove() }}
                    className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
                  >
                    <Trash2 size={11} /> Delete event
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EventEditor ev={ev} onCancel={onCancelEdit} onSaved={(patch) => { onUpdated(patch); onCancelEdit() }} />
      )}
    </div>
  )
}

// ── Inline editor ──────────────────────────────────────────────────────────

function EventEditor({
  ev, onCancel, onSaved,
}: {
  ev:       EventRow
  onCancel: () => void
  onSaved:  (patch: Partial<EventRow>) => void
}) {
  const [title,       setTitle]       = useState(ev.title)
  const [description, setDescription] = useState(ev.description ?? '')
  const [startDate,   setStartDate]   = useState(ev.start_date)
  const [startTime,   setStartTime]   = useState(ev.start_time ?? '')
  const [endTime,     setEndTime]     = useState(ev.end_time ?? '')
  const [location,    setLocation]    = useState(ev.location_name ?? '')
  const [address,     setAddress]     = useState(ev.address ?? '')
  const [city,        setCity]        = useState(ev.city ?? '')
  const [organizer,   setOrganizer]   = useState(ev.organizer_name ?? '')
  const [registration, setRegistration] = useState(ev.registration_url ?? '')
  const [costText,    setCostText]    = useState(ev.cost_text ?? '')
  const [isFree,      setIsFree]      = useState(ev.is_free ?? false)
  const [isFeatured,  setIsFeatured]  = useState(ev.is_featured ?? false)
  // featured_until comes from the DB as a TIMESTAMPTZ — slice off the time
  // for the date input. Empty string means "indefinite".
  const [featuredUntil, setFeaturedUntil] = useState(
    typeof ev.featured_until === 'string' && ev.featured_until
      ? ev.featured_until.slice(0, 10)
      : '',
  )
  const [category,    setCategory]    = useState(ev.category ?? '')
  const [heroUrl,     setHeroUrl]     = useState(ev.hero_image_url ?? '')
  // Track whether we have a saved original — re-crop only works when this
  // is set, so the gravity picker stays disabled for legacy rows.
  const [origPath, setOrigPath] = useState(ev.image_orig_path ?? null)
  const [imageBusy,   setImageBusy]   = useState(false)
  const [recropBusy,  setRecropBusy]  = useState<string | null>(null)
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const featuredUntilIso = isFeatured && featuredUntil
        ? new Date(featuredUntil + 'T23:59:59').toISOString()
        : null
      const payload = {
        action: 'edit',
        title:            title.trim(),
        description:      description.trim() || null,
        start_date:       startDate,
        start_time:       startTime || null,
        end_time:         endTime   || null,
        location_name:    location.trim() || null,
        address:          address.trim()  || null,
        city:             city.trim()     || null,
        organizer_name:   organizer.trim() || null,
        registration_url: registration.trim() || null,
        cost_text:        costText.trim() || null,
        is_free:          isFree,
        is_featured:      isFeatured,
        featured_until:   featuredUntilIso,
        category:         category || null,
        hero_image_url:   heroUrl.trim() || null,
      }
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onSaved({
        title:            payload.title,
        description:      payload.description,
        start_date:       payload.start_date,
        start_time:       payload.start_time,
        end_time:         payload.end_time,
        location_name:    payload.location_name,
        address:          payload.address,
        city:             payload.city,
        organizer_name:   payload.organizer_name,
        registration_url: payload.registration_url,
        cost_text:        payload.cost_text,
        is_free:          payload.is_free,
        is_featured:      payload.is_featured,
        featured_until:   payload.featured_until,
        category:         payload.category,
        hero_image_url:   payload.hero_image_url,
      })
    } finally { setBusy(false) }
  }

  async function replaceImage(file: File) {
    setImageBusy(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('action', 'replace-image')
      fd.append('image', file)
      const res = await fetch(`/api/admin/events/${ev.id}`, { method: 'PATCH', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setHeroUrl(json.hero_image_url)
      if (json.image_orig_path) setOrigPath(json.image_orig_path)
      onSaved({
        hero_image_url:  json.hero_image_url,
        image_orig_path: json.image_orig_path ?? origPath,
        image_width:     json.image_width  ?? null,
        image_height:    json.image_height ?? null,
      })
    } finally {
      setImageBusy(false)
    }
  }

  // Re-crop the hero from the saved original using a manual gravity. Only
  // works when image_orig_path is set on the row — events uploaded before
  // migration 092 or via legacy CSVs don't have one.
  async function recrop(gravity: string) {
    if (!origPath) {
      setErr('Re-crop needs a fresh upload first — original image isn\'t saved on this event.')
      return
    }
    setRecropBusy(gravity); setErr(null)
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 're-crop', gravity }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      // Cache-bust by appending a tick query so the browser refetches.
      const bustedUrl = `${json.hero_image_url}?t=${Date.now()}`
      setHeroUrl(bustedUrl)
      onSaved({ hero_image_url: bustedUrl })
    } finally {
      setRecropBusy(null)
    }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1'

  return (
    <div className="bg-blue-50/40 border-t border-blue-100 px-4 py-4">
      <div className="grid md:grid-cols-[160px_1fr] gap-4">
        {/* Image */}
        <div>
          <p className={lbl}>Image</p>
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-white ring-1 ring-blue-200">
            {heroUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={heroUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon size={28} />
              </div>
            )}
          </div>
          <label className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold border border-dashed border-blue-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 text-blue-800">
            {imageBusy ? <RefreshCw size={11} className="animate-spin" /> : <Camera size={11} />}
            {imageBusy ? 'Uploading…' : 'Replace image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/avif"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) replaceImage(f)
              }}
            />
          </label>
          <div className="mt-2">
            <p className={lbl}>Or paste URL</p>
            <input
              value={heroUrl}
              onChange={e => setHeroUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs border border-blue-200 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
            />
          </div>
          {/* Gravity picker — re-crops the saved original around a different
              focal point. Sharp's attention strategy is good but not perfect;
              when it misses (lockers, busy backgrounds, off-center subjects)
              this lets you nudge it without re-uploading. */}
          <GravityPicker
            origPath={origPath}
            busyGravity={recropBusy}
            onPick={recrop}
          />
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className={lbl}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={`${inp} font-semibold`} />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${inp} resize-y min-h-[80px]`}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Venue name</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className={inp} placeholder="e.g., Montgomery Public Library" />
            </div>
            <div>
              <label className={lbl}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className={inp} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Organizer</label>
              <input value={organizer} onChange={e => setOrganizer(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Registration URL</label>
              <input type="url" value={registration} onChange={e => setRegistration(e.target.value)} className={inp} placeholder="https://..." />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Cost description</label>
              <input value={costText} onChange={e => setCostText(e.target.value)} className={inp} placeholder="e.g., $5 per child" />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inp} cursor-pointer`}>
                <option value="">— Select —</option>
                {CATEGORY_OPTIONS.filter(Boolean).map(c => (
                  <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
                <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="rounded" />
                Free event
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
                Featured
              </label>
              {/* Featured-through date — only meaningful when Featured is on.
                  Empty = featured indefinitely until manually cleared. */}
              {isFeatured && (
                <label className="inline-flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-800 mt-0.5">
                  Featured through
                  <input
                    type="date"
                    value={featuredUntil}
                    onChange={e => setFeaturedUntil(e.target.value)}
                    className="text-xs border border-blue-200 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white normal-case font-normal"
                  />
                </label>
              )}
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

// ── Gravity picker ─────────────────────────────────────────────────────────
// 3×3 compass grid + two auto strategies. Same picker school-bits uses;
// re-crops the hero from the saved original around a different focal point
// without re-uploading.
//
// Disabled when origPath is null (the event was created before migration
// 092 or imported via CSV — there's no high-res original to re-process).

const COMPASS: { gravity: string; label: string }[] = [
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

function GravityPicker({
  origPath, busyGravity, onPick,
}: {
  origPath:    string | null
  busyGravity: string | null
  onPick:      (gravity: string) => void
}) {
  const disabled = !origPath
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1 inline-flex items-center gap-1">
        <Crop size={10} /> Re-crop hero
      </p>
      <div className="grid grid-cols-3 gap-0.5 w-full max-w-[120px]">
        {COMPASS.map(({ gravity, label }) => {
          const active = busyGravity === gravity
          return (
            <button
              key={gravity}
              type="button"
              onClick={() => onPick(gravity)}
              disabled={disabled || busyGravity !== null}
              title={`Re-crop toward ${gravity}`}
              className={`aspect-square text-xs font-bold rounded transition-colors ${
                disabled
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50'
              }`}
            >
              {active ? <RefreshCw size={10} className="animate-spin mx-auto" /> : label}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => onPick('attention')}
          disabled={disabled || busyGravity !== null}
          title="Re-run automatic attention crop"
          className={`flex-1 text-[10px] font-bold rounded px-1 py-1 ${
            disabled
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50'
          }`}
        >
          {busyGravity === 'attention' ? '…' : 'Auto'}
        </button>
        <button
          type="button"
          onClick={() => onPick('entropy')}
          disabled={disabled || busyGravity !== null}
          title="Re-run entropy crop (detail-densest region)"
          className={`flex-1 text-[10px] font-bold rounded px-1 py-1 ${
            disabled
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50'
          }`}
        >
          {busyGravity === 'entropy' ? '…' : 'Entropy'}
        </button>
      </div>
      {disabled && (
        <p className="mt-1.5 text-[10px] text-gray-500 italic">
          Re-upload the image to enable re-crop.
        </p>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  // "14:30" → "2:30 PM"
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

// Suppress unused-vars warning for the Calendar / Settings icons in props.
// (Imported at top so they're available when extending the BulkBar later.)
void useEffect
