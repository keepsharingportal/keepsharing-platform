'use client'

// TrendingList — the interactive shell for /admin/trending. Wraps the
// existing server actions but adds:
//   - Live preview bar at the top (same look as homepage trending bar)
//   - Filter chips (Live + Scheduled + Expired + Off + Archived + All)
//   - Bulk select + bulk action bar
//   - Drag-to-reorder (HTML5 drag/drop)
//   - Per-row quick actions: Edit (inline form), Turn off/on, End now, Archive, Delete
//
// All mutations are server actions — passed in as props from the page so
// this file stays free of `'use server'` directives. Optimistic UI for
// reorder + checked state; the rest revalidates after the action settles.

import { useEffect, useMemo, useState, useTransition } from 'react'
import { TrendingUp, GripVertical, Eye, Pencil, X, Check, Trash2 } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

export interface TrendingItem {
  id:             string
  emoji:          string | null
  label:          string
  link:           string
  display_order:  number
  is_active:      boolean
  start_at:       string | null
  end_at:         string | null
  archived_at:    string | null
  created_at:     string
}

type Status = 'live' | 'scheduled' | 'expired' | 'off' | 'archived'

interface Props {
  initialItems: TrendingItem[]
  createItem:   (formData: FormData) => Promise<void>
  updateItem:   (formData: FormData) => Promise<void>
  toggleActive: (formData: FormData) => Promise<void>
  endNow:       (formData: FormData) => Promise<void>
  archiveItem:  (formData: FormData) => Promise<void>
  restoreItem:  (formData: FormData) => Promise<void>
  deleteItem:   (formData: FormData) => Promise<void>
  bulkAction:   (formData: FormData) => Promise<void>
  reorderItems: (formData: FormData) => Promise<void>
}

const STATUS_STYLE: Record<Status, { dot: string; bg: string; text: string; label: string }> = {
  live:      { dot: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'Live'      },
  scheduled: { dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af', label: 'Scheduled' },
  expired:   { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563', label: 'Expired'   },
  off:       { dot: '#d1d5db', bg: '#f9fafb', text: '#6b7280', label: 'Off'       },
  archived:  { dot: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6', label: 'Archived'  },
}

function classify(item: TrendingItem, now: Date): Status {
  if (item.archived_at) return 'archived'
  if (!item.is_active) return 'off'
  if (item.start_at && new Date(item.start_at) > now) return 'scheduled'
  if (item.end_at   && new Date(item.end_at)   < now) return 'expired'
  return 'live'
}

function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toLocalInput(s: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface AutoPreviewItem {
  id:           string
  label:        string
  link:         string
  emoji:        string | null
  unique_views: number
}

export function TrendingList(props: Props) {
  const [items, setItems] = useState<TrendingItem[]>(props.initialItems)
  const [filter, setFilter] = useState<'all-active' | Status>('all-active')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [autoPreview, setAutoPreview] = useState<AutoPreviewItem[]>([])
  const [, startTransition] = useTransition()

  // Fetch the auto-trending pool so the live preview shows EXACTLY what
  // the homepage renders. Fire on mount + every 2 min so the editor sees
  // fresh signal while triaging.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res  = await fetch('/api/admin/trending/auto')
        const json = await res.json()
        if (!cancelled) setAutoPreview(json.items ?? [])
      } catch {
        // Auto-trending preview is non-critical — silently ignore so a
        // missing migration / RLS hiccup doesn't break the page.
      }
    }
    load()
    const id = setInterval(load, 120_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Reset local state when server-side data changes (after a revalidate).
  useEffect(() => { setItems(props.initialItems); setSelected(new Set()) }, [props.initialItems])

  // Re-compute `now` every 30s so items that pass their end_at while the
  // admin is open visibly reclassify from Live → Expired. Previously this
  // was useMemo([]) so the value froze at mount and the editor's "Live"
  // pill could lie about already-expired items.
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const counts = useMemo(() => {
    const c: Record<Status | 'all-active', number> = { live: 0, scheduled: 0, expired: 0, off: 0, archived: 0, 'all-active': 0 }
    for (const it of items) {
      const s = classify(it, now)
      c[s]++
      if (s !== 'archived') c['all-active']++
    }
    return c
  }, [items, now])

  // Visible items per the active filter.
  const visible = useMemo(() => {
    if (filter === 'all-active') return items.filter(i => !i.archived_at)
    return items.filter(i => classify(i, now) === filter)
  }, [items, filter, now])

  const liveItems = useMemo(() => items.filter(i => classify(i, now) === 'live'), [items, now])

  // Same merge logic the homepage uses: pinned wins, auto fills the rest
  // up to 4 total, deduped by link. Lets the editor see what readers see.
  type PreviewRow = { id: string; label: string; link: string; emoji: string | null; source: 'pinned' | 'auto' }
  const previewItems: PreviewRow[] = useMemo(() => {
    const pinned: PreviewRow[] = liveItems.map(i => ({
      id: i.id, label: i.label, link: i.link, emoji: i.emoji, source: 'pinned',
    }))
    const pinnedLinks = new Set(pinned.map(p => p.link))
    const auto: PreviewRow[] = autoPreview
      .filter(a => !pinnedLinks.has(a.link))
      .slice(0, Math.max(0, 4 - pinned.length))
      .map(a => ({ id: a.id, label: a.label, link: a.link, emoji: a.emoji, source: 'auto' }))
    return [...pinned, ...auto]
  }, [liveItems, autoPreview])

  // ── Selection ────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function selectAll() {
    setSelected(new Set(visible.map(v => v.id)))
  }
  function clearSelection() { setSelected(new Set()) }

  async function runBulk(action: string) {
    if (selected.size === 0) return
    const ids = Array.from(selected).join(',')
    if (action === 'delete' && !confirm(`Permanently delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`)) return
    const fd = new FormData()
    fd.set('ids', ids)
    fd.set('action', action)
    startTransition(async () => {
      await props.bulkAction(fd)
      setSelected(new Set())
    })
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  // We only allow reorder when filter shows "all active" — reordering a
  // filtered subset doesn't make sense (the relative order matters across
  // the full set).
  const canReorder = filter === 'all-active'
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  function onDragStart(idx: number) { setDragFrom(idx) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(destIdx: number) {
    if (dragFrom == null || dragFrom === destIdx) { setDragFrom(null); return }
    const next = visible.slice()
    const [m] = next.splice(dragFrom, 1)
    next.splice(destIdx, 0, m)
    setItems(prev => {
      // Reorder only the visible (non-archived) slice; preserve archived
      // items at the tail.
      const archived = prev.filter(p => p.archived_at)
      return [...next, ...archived]
    })
    setDragFrom(null)

    // Fire-and-forget save. Server action revalidates → useEffect resets
    // from authoritative server state.
    const fd = new FormData()
    fd.set('ids', next.map(n => n.id).join(','))
    startTransition(() => props.reorderItems(fd))
  }

  // ── Inline edit helpers ─────────────────────────────────────────────────
  function startEdit(id: string)  { setEditingId(id) }
  function cancelEdit()           { setEditingId(null) }

  return (
    <div className="space-y-6">
      {/* ── Live preview ───────────────────────────────────────────────── */}
      <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center justify-between">
          <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
            <Eye size={14} className="text-portal-muted" />
            Live preview — exactly what the homepage shows right now
          </h2>
          <span className="text-xs text-portal-muted">
            {previewItems.filter(p => p.source === 'pinned').length} pinned ·{' '}
            {previewItems.filter(p => p.source === 'auto').length} auto · 4 max
          </span>
        </div>
        <div className="px-5 py-4 bg-[#fef0eb]">
          {previewItems.length === 0 ? (
            <p className="text-sm text-portal-sub italic">Nothing to show. Add a pinned item below, or wait for readers to start visiting pages — auto-trending kicks in once we have view data.</p>
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-portal-blue whitespace-nowrap shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending:
              </span>
              <div className="w-px h-3.5 bg-portal-navy/30 shrink-0" />
              {previewItems.map((t, i) => (
                <span
                  key={t.id}
                  className="flex items-center gap-1.5 text-sm text-foreground shrink-0 whitespace-nowrap"
                  title={t.source === 'auto' ? 'Auto-filled from page views' : 'Pinned by you'}
                >
                  {t.emoji && <span>{t.emoji}</span>}
                  <span className="font-medium">{t.label}</span>
                  {t.source === 'auto' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-portal-amber-lt text-portal-amber ml-0.5">auto</span>
                  )}
                  {i < previewItems.length - 1 && <span className="text-portal-blue/30 ml-2">·</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Help ───────────────────────────────────────────────────────── */}
      <div className="bg-portal-amber-lt border border-amber-200 rounded-lg px-5 py-4 text-sm leading-relaxed">
        <p className="font-bold text-amber-900 mb-1">How the trending bar works</p>
        <ul className="list-disc list-inside text-portal-amber space-y-0.5 text-xs">
          <li><strong>Pinned items below show first</strong> — these are your editorial picks (Best Of, guides, nominations, etc.).</li>
          <li><strong>Empty slots auto-fill with the top-visited pages from the last 7 days</strong>. So if you pin 2 items, the bar adds 2 hot pages from real reader traffic.</li>
          <li>Pin up to 4 items to lock the entire bar. Pin 0 and the bar is 100% data-driven.</li>
          <li><strong>Start</strong> empty = live immediately. <strong>End</strong> empty = no expiry.</li>
          <li>Drag the grip handle to reorder pinned items.</li>
          <li>Items auto-archive 30 days after their <strong>End</strong> date — restore from the <em>Archived</em> filter.</li>
        </ul>
      </div>

      {/* ── Add new ────────────────────────────────────────────────────── */}
      <AddForm onCreate={props.createItem} nextOrder={(items.at(-1)?.display_order ?? 0) + 1} />

      {/* ── Filter chips ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <FilterChip label="All active" count={counts['all-active']} active={filter === 'all-active'} onClick={() => setFilter('all-active')} tone={null} />
        <FilterChip label="Live"       count={counts.live}      active={filter === 'live'}      onClick={() => setFilter('live')}      tone="live" />
        <FilterChip label="Scheduled"  count={counts.scheduled} active={filter === 'scheduled'} onClick={() => setFilter('scheduled')} tone="scheduled" />
        <FilterChip label="Expired"    count={counts.expired}   active={filter === 'expired'}   onClick={() => setFilter('expired')}   tone="expired" />
        <FilterChip label="Off"        count={counts.off}       active={filter === 'off'}       onClick={() => setFilter('off')}       tone="off" />
        <FilterChip label="Archived"   count={counts.archived}  active={filter === 'archived'}  onClick={() => setFilter('archived')}  tone="archived" />
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center justify-between">
          <h2 className="text-sm font-bold text-portal-text">{visible.length} items</h2>
          <div className="flex items-center gap-3">
            {visible.length > 0 && (
              <button onClick={selected.size === visible.length ? clearSelection : selectAll} className="text-xs text-portal-sub hover:text-portal-text">
                {selected.size === visible.length ? 'Clear' : 'Select all'}
              </button>
            )}
            <span className="text-xs text-portal-muted">{items.length} total</span>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-portal-muted">No items match this filter.</p>
        ) : (
          <ul className="divide-y divide-portal-border">
            {visible.map((item, idx) => {
              const status = classify(item, now)
              const style  = STATUS_STYLE[status]
              const isEditing = editingId === item.id
              const isSelected = selected.has(item.id)
              return (
                <li
                  key={item.id}
                  draggable={canReorder && !isEditing}
                  onDragStart={canReorder && !isEditing ? () => onDragStart(idx) : undefined}
                  onDragOver={canReorder && !isEditing ? onDragOver : undefined}
                  onDrop={canReorder && !isEditing ? () => onDrop(idx) : undefined}
                  className={`p-4 ${dragFrom === idx ? 'opacity-50 bg-portal-blue-lt' : ''} ${isSelected ? 'bg-portal-blue-lt/40' : ''}`}
                >
                  {!isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="shrink-0"
                      />
                      {canReorder && (
                        <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" />
                      )}
                      <span className="text-xl shrink-0" aria-hidden="true">{item.emoji ?? '·'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-portal-text truncate">{item.label}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: style.bg, color: style.text }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                            {style.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-portal-sub mt-0.5 font-mono truncate">{item.link}</p>
                        <p className="text-[11px] text-portal-muted mt-0.5">
                          Order {item.display_order} · Starts {fmtDateTime(item.start_at)} · Ends {fmtDateTime(item.end_at)}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                        {status === 'archived' ? (
                          <form action={props.restoreItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="text-xs font-semibold px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50">
                              Restore
                            </button>
                          </form>
                        ) : (
                          <>
                            <form action={props.toggleActive}>
                              <input type="hidden" name="id"      value={item.id} />
                              <input type="hidden" name="current" value={String(item.is_active)} />
                              <button type="submit" className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${item.is_active ? 'bg-white text-portal-text border-portal-border hover:bg-portal-bg' : 'bg-portal-green-lt text-green-700 border-green-200 hover:bg-green-100'}`}>
                                {item.is_active ? 'Turn off' : 'Turn on'}
                              </button>
                            </form>
                            {status === 'live' && (
                              <form action={props.endNow}>
                                <input type="hidden" name="id" value={item.id} />
                                <button type="submit" className="text-xs font-semibold px-2.5 py-1 rounded-md border border-amber-200 text-portal-amber hover:bg-portal-amber-lt">
                                  End now
                                </button>
                              </form>
                            )}
                            {(status === 'expired' || status === 'off') && (
                              <form action={props.archiveItem}>
                                <input type="hidden" name="id" value={item.id} />
                                <button type="submit" className="text-xs font-semibold px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50">
                                  Archive
                                </button>
                              </form>
                            )}
                          </>
                        )}
                        <button type="button" onClick={() => startEdit(item.id)} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-portal-border text-portal-text hover:bg-portal-bg">
                          <Pencil size={11} /> Edit
                        </button>
                        {/* Direct Remove — wipes the row entirely. Confirm
                            client-side so a misclick doesn't nuke history. */}
                        <form
                          action={props.deleteItem}
                          onSubmit={(e) => { if (!confirm(`Permanently delete "${item.label}"? This can't be undone.`)) e.preventDefault() }}
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" title="Remove permanently" className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-red-200 text-portal-red hover:bg-portal-red-lt">
                            <Trash2 size={11} /> Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <EditForm
                      item={item}
                      onSave={props.updateItem}
                      onDelete={props.deleteItem}
                      onCancel={cancelEdit}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Bulk action bar ────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-40 mx-auto max-w-[1100px]">
          <div className="rounded-lg bg-gray-900 text-white shadow-md px-4 py-3 flex items-center gap-3 flex-wrap">
            <p className="text-sm font-bold">{selected.size} selected</p>
            <span className="text-white/30">·</span>
            <button onClick={() => runBulk('turn-off')} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20">Turn off</button>
            <button onClick={() => runBulk('turn-on')}  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20">Turn on</button>
            <button onClick={() => runBulk('end-now')}  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-portal-amber-lt0 hover:bg-amber-400">End now</button>
            <button onClick={() => runBulk('archive')}  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-500">Archive</button>
            <button onClick={() => runBulk('restore')}  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20">Restore</button>
            <button onClick={() => runBulk('delete')}   className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-600 hover:bg-portal-red-lt0">Delete</button>
            <button onClick={clearSelection} className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-md text-white/60 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone: Status | null }) {
  const dotColor = tone ? STATUS_STYLE[tone].dot : '#374151'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'
      }`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? '#fff' : dotColor }} />
      <span className="font-semibold">{label}</span>
      <span className={`font-bold ${active ? 'text-white/80' : 'text-portal-muted'}`}>{count}</span>
    </button>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────

function AddForm({ onCreate, nextOrder }: { onCreate: (fd: FormData) => Promise<void>; nextOrder: number }) {
  const inputCls = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors'
  return (
    <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-portal-border bg-portal-bg">
        <h2 className="text-sm font-bold text-portal-text">Add a new trending item</h2>
      </div>
      <form action={onCreate} className="p-5 grid md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Emoji</label>
          <EmojiPicker />
        </div>
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Label *</label>
          <input name="label" type="text" required placeholder="2026 Summer Camp Guide" className={inputCls} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Link *</label>
          <input name="link" type="text" required placeholder="/summer-camp-guide" className={inputCls} />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Order</label>
          <input name="display_order" type="number" defaultValue={nextOrder} className={inputCls} />
        </div>
        <div className="md:col-span-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-portal-sub mb-1">Start (optional)</label>
            <input name="start_at" type="datetime-local" className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-portal-sub mb-1">End (optional)</label>
            <input name="end_at" type="datetime-local" className={inputCls} />
          </div>
        </div>
        <div className="md:col-span-12">
          <button type="submit" className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
            Add item
          </button>
        </div>
      </form>
    </section>
  )
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ item, onSave, onDelete, onCancel }: {
  item: TrendingItem
  onSave:   (fd: FormData) => Promise<void>
  onDelete: (fd: FormData) => Promise<void>
  onCancel: () => void
}) {
  const inputCls = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors'
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-portal-text">Editing item</p>
        <button onClick={onCancel} className="text-portal-muted hover:text-portal-sub"><X size={14} /></button>
      </div>
      <form action={async (fd) => { await onSave(fd); onCancel() }} className="grid md:grid-cols-12 gap-3 items-end">
        <input type="hidden" name="id" value={item.id} />
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Emoji</label>
          <EmojiPicker defaultValue={item.emoji} />
        </div>
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Label</label>
          <input name="label" type="text" required defaultValue={item.label} className={inputCls} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Link</label>
          <input name="link" type="text" required defaultValue={item.link} className={inputCls} />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold text-portal-sub mb-1">Order</label>
          <input name="display_order" type="number" defaultValue={item.display_order} className={inputCls} />
        </div>
        <div className="md:col-span-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-portal-sub mb-1">Start</label>
            <input name="start_at" type="datetime-local" defaultValue={toLocalInput(item.start_at)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-portal-sub mb-1">End</label>
            <input name="end_at" type="datetime-local" defaultValue={toLocalInput(item.end_at)} className={inputCls} />
          </div>
        </div>
        <div className="md:col-span-12 flex items-center gap-2">
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
            <Check size={12} /> Save
          </button>
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm font-semibold text-portal-sub hover:text-portal-text">Cancel</button>
          <form action={async (fd) => { if (confirm('Delete permanently?')) { await onDelete(fd); onCancel() } }} className="ml-auto">
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className="text-xs text-portal-red hover:text-red-700 font-semibold">
              Delete permanently
            </button>
          </form>
        </div>
      </form>
    </div>
  )
}
