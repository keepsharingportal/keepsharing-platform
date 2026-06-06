'use client'

// ── /admin/ads — All Slots (renamed from "All Bookings") ───────────────────
//
// Slot-oriented inventory view. Every row is one slot (page × placement_type),
// regardless of whether it has a booking. Status reads ON / EMPTY / PAUSED /
// HIDDEN so the editor sees the universe of inventory in one place.
//
// Empty slots show in orange with a "Sell this spot" button — directly
// actionable. Hidden slots show dimmed; the per-row Hide/Show button
// flips ad_slot_settings.disabled.
//
// Four dropdown filters (Page · Type · Status · Advertiser) + search. List
// paginated at 30 rows per page.

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Star, RefreshCw, Plus, AlertTriangle, Search, EyeOff, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  findPlacementType, PLACEMENT_TYPES, CATEGORY_LABELS,
  PAGES, PAGE_SLOTS, type PlacementCategory, type PageDef,
} from '@/lib/ads/placement-types'
import { AdsTabs } from '@/components/admin/AdsTabs'

interface AdPlacement {
  id:                string
  placement_type:    string
  context_type:      string | null
  context_slug:      string | null
  ad_headline:       string | null
  ad_eyebrow:        string | null
  ad_cta_label:      string | null
  is_active:         boolean
  impression_count:  number
  click_count:       number
  starts_at:         string
  ends_at:           string | null
  /** Set when an ad is soft-archived. Present in the DB but hidden from
   *  the default list — only shows up when Status filter = Archived. */
  archived_at:       string | null
  rotation_group:    string | null
  rotation_weight:   number | null
  advertiser_accounts: { business_name: string } | null
}

// One row in the slot list = one slot in inventory.
interface SlotRow {
  /** Stable composite key: page.key + ':' + placement_type. */
  key:            string
  page:           PageDef
  placement_type: string
  placement_label: string
  category:       PlacementCategory
  bookings:       AdPlacement[]   // 0 or more
  status:         'on' | 'empty' | 'paused' | 'hidden'
  is_hidden:      boolean
}

const STATUS_OPTIONS: Array<{ key: 'all' | SlotRow['status']; label: string; color: string }> = [
  { key: 'all',    label: 'All statuses', color: '#0f172a' },
  { key: 'on',     label: 'On',           color: '#16a34a' },
  { key: 'empty',  label: 'Empty',        color: '#f59e0b' },
  { key: 'paused', label: 'Paused',       color: '#dc2626' },
  { key: 'hidden', label: 'Hidden',       color: '#6b7280' },
]

const PER_PAGE = 30

const ctr = (imp: number, clk: number) =>
  imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—'

export default function AdminAdsPage() {
  const [ads,           setAds]         = useState<AdPlacement[]>([])
  const [hiddenSlots,   setHiddenSlots] = useState<Set<string>>(new Set())
  const [loading,       setLoading]     = useState(true)
  const [error,         setError]       = useState<string | null>(null)
  const [filterPage,    setFilterPage]    = useState<string>('all')
  const [filterCategory,setFilterCategory] = useState<'all' | PlacementCategory>('all')
  const [filterStatus,  setFilterStatus]  = useState<'all' | SlotRow['status']>('all')
  const [filterAdvertiser, setFilterAdvertiser] = useState<string>('all')
  const [search,        setSearch]      = useState('')
  const [page,          setPage]        = useState(1)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/admin/ads/list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); setAds([]); return }
      setAds(json.ads as AdPlacement[])
      setHiddenSlots(new Set((json.hiddenSlots ?? []) as string[]))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleSlotHidden(placementType: string) {
    const isHidden = hiddenSlots.has(placementType)
    await fetch('/api/admin/ads/slot-toggle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ placementType, contextSlug: null, disabled: !isHidden }),
    })
    load()
  }

  async function expireAd(id: string) {
    if (!confirm('Mark this ad as expired? It will be removed from active ads but kept in the customer\'s history.')) return
    await fetch('/api/admin/ads/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    load()
  }

  // ── Build the slot list ──────────────────────────────────────────────────
  // For each page in PAGES × each placement_type in PAGE_SLOTS[page], emit
  // one SlotRow. Attach matching bookings. Compute status.
  const slotRows: SlotRow[] = useMemo(() => {
    const rows: SlotRow[] = []
    // Index bookings by (placement_type, context_slug) for fast attach.
    // Exclude archived ads from the bookings attached to slots — the editor
    // doesn't want archived YMCA cluttering the homepage Wide-banner row;
    // they live under the Archived filter instead.
    const adsBySlot: Record<string, AdPlacement[]> = {}
    for (const a of ads) {
      if (a.archived_at) continue
      const ctx = a.context_slug ?? ''
      const k = `${a.placement_type}|${ctx}`
      if (!adsBySlot[k]) adsBySlot[k] = []
      adsBySlot[k].push(a)
    }

    for (const pageDef of PAGES) {
      const slotsForPage = PAGE_SLOTS[pageDef.key] ?? []
      for (const placement_type of slotsForPage) {
        const def = findPlacementType(placement_type)
        if (!def) continue
        const ctx = pageDef.context_slug ?? ''
        const bookings = adsBySlot[`${placement_type}|${ctx}`] ?? []
        const is_hidden = hiddenSlots.has(placement_type)
        const hasActive = bookings.some(b => b.is_active)
        const status: SlotRow['status'] =
          is_hidden              ? 'hidden' :
          bookings.length === 0  ? 'empty'  :
          hasActive              ? 'on'     :
                                   'paused'
        rows.push({
          key:             `${pageDef.key}:${placement_type}`,
          page:            pageDef,
          placement_type,
          placement_label: def.label,
          category:        def.category,
          bookings,
          status,
          is_hidden,
        })
      }
    }
    return rows
  }, [ads, hiddenSlots])

  // ── Apply filters ────────────────────────────────────────────────────────
  const visibleRows: SlotRow[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    return slotRows.filter(r => {
      if (filterPage     !== 'all' && r.page.key      !== filterPage)     return false
      if (filterCategory !== 'all' && r.category      !== filterCategory) return false
      if (filterStatus   !== 'all' && r.status        !== filterStatus)   return false
      if (filterAdvertiser !== 'all') {
        const matchesAdvertiser = r.bookings.some(b => b.advertiser_accounts?.business_name === filterAdvertiser)
        if (!matchesAdvertiser) return false
      }
      if (q) {
        const haystack = [
          r.placement_label,
          r.placement_type,
          r.page.label,
          ...r.bookings.flatMap(b => [
            b.advertiser_accounts?.business_name ?? '',
            b.ad_headline ?? '',
            b.ad_eyebrow ?? '',
          ]),
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [slotRows, filterPage, filterCategory, filterStatus, filterAdvertiser, search])

  // Reset pagination when filters change.
  useEffect(() => { setPage(1) }, [filterPage, filterCategory, filterStatus, filterAdvertiser, search])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PER_PAGE))
  const pageRows   = visibleRows.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ── Tile counts (live across the full slot universe, not just filtered) ─
  const counts = useMemo(() => {
    let on = 0, empty = 0, paused = 0, hidden = 0
    for (const r of slotRows) {
      if (r.status === 'on')     on++
      if (r.status === 'empty')  empty++
      if (r.status === 'paused') paused++
      if (r.status === 'hidden') hidden++
    }
    return { on, empty, paused, hidden, total: slotRows.length }
  }, [slotRows])

  // Advertisers dropdown — every distinct business with at least one booking.
  const advertiserOptions = useMemo(() => {
    const set = new Set<string>()
    for (const a of ads) {
      if (a.advertiser_accounts?.business_name) set.add(a.advertiser_accounts.business_name)
    }
    return Array.from(set).sort()
  }, [ads])

  // Group PAGES for the Page dropdown <optgroup>s.
  const pageGroups = useMemo(() => {
    const groups: Record<string, PageDef[]> = {}
    for (const p of PAGES) {
      if (!groups[p.group]) groups[p.group] = []
      groups[p.group].push(p)
    }
    return groups
  }, [])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1200px] mx-auto space-y-6">

        <AdsTabs />

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} className="text-primary" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">All Slots</h1>
            </div>
            <p className="text-sm text-gray-500">
              Every ad slot on the site. <strong className="text-gray-700">On</strong> = paid ad rendering ·{' '}
              <strong className="text-amber-700">Empty</strong> = sellable (showing sales placeholder) ·{' '}
              <strong className="text-gray-600">Paused</strong> = booked but off ·{' '}
              <strong className="text-gray-500">Hidden</strong> = slot disabled site-wide.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              href="/admin/ads/new"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90"
            >
              <Plus size={14} /> New booking
            </Link>
          </div>
        </header>

        {/* ── Status stat tiles (click to filter) ──────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="All slots" value={counts.total}  tone="#0f172a"
                active={filterStatus === 'all'}
                onClick={() => setFilterStatus('all')} />
          <Stat label="On"        value={counts.on}     tone="#16a34a"
                active={filterStatus === 'on'}
                onClick={() => setFilterStatus('on')} />
          <Stat label="Empty"     value={counts.empty}  tone="#f59e0b"
                active={filterStatus === 'empty'}
                onClick={() => setFilterStatus('empty')} />
          <Stat label="Paused"    value={counts.paused} tone="#dc2626"
                active={filterStatus === 'paused'}
                onClick={() => setFilterStatus('paused')} />
          <Stat label="Hidden"    value={counts.hidden} tone="#6b7280"
                active={filterStatus === 'hidden'}
                onClick={() => setFilterStatus('hidden')} />
        </div>

        {/* ── Filter bar — 4 dropdowns + search ────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="Page">
            <select
              value={filterPage}
              onChange={e => setFilterPage(e.target.value)}
              className={selectCls}
            >
              <option value="all">All pages</option>
              {Object.entries(pageGroups).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as 'all' | PlacementCategory)}
              className={selectCls}
            >
              <option value="all">All types</option>
              {(Object.entries(CATEGORY_LABELS) as Array<[PlacementCategory, string]>).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | SlotRow['status'])}
              className={selectCls}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Advertiser">
            <select
              value={filterAdvertiser}
              onChange={e => setFilterAdvertiser(e.target.value)}
              className={selectCls}
            >
              <option value="all">All advertisers</option>
              {advertiserOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </Field>
          <Field label="Search">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Business · headline · slot"
                className={`${selectCls} pl-9`}
              />
            </div>
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Load failed</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Slot table ───────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">
              {visibleRows.length} of {slotRows.length} slots
              {visibleRows.length > PER_PAGE && (
                <span className="text-gray-400 ml-2 font-normal">· page {page} of {totalPages}</span>
              )}
            </h2>
            {(filterPage !== 'all' || filterCategory !== 'all' || filterStatus !== 'all' || filterAdvertiser !== 'all' || search) && (
              <button
                onClick={() => {
                  setFilterPage('all'); setFilterCategory('all'); setFilterStatus('all'); setFilterAdvertiser('all'); setSearch('')
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all filters
              </button>
            )}
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
          ) : visibleRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No slots match those filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 1100 }}>
                <colgroup>
                  <col style={{ width: 270 }} />  {/* Slot */}
                  <col style={{ width: 160 }} />  {/* Page */}
                  <col style={{ width: 100 }} />  {/* Type */}
                  <col style={{ width: 200 }} />  {/* Advertiser */}
                  <col style={{ width: 220 }} />  {/* Headline / status */}
                  <col style={{ width: 80  }} />  {/* Impr. */}
                  <col style={{ width: 70  }} />  {/* CTR */}
                  <col style={{ width: 160 }} />  {/* Actions */}
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                    <th className="px-4 py-2 font-semibold">Slot</th>
                    <th className="px-4 py-2 font-semibold">Page</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Advertiser</th>
                    <th className="px-4 py-2 font-semibold">Status / Headline</th>
                    <th className="px-4 py-2 font-semibold text-right">Impr.</th>
                    <th className="px-4 py-2 font-semibold text-right">CTR</th>
                    <th className="px-4 py-2 font-semibold text-right sticky right-0 bg-gray-50 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => <SlotRowItem key={row.key} row={row} onToggleHidden={toggleSlotHidden} onExpire={expireAd} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────── */}
          {visibleRows.length > PER_PAGE && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, visibleRows.length)} of {visibleRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <span className="text-gray-400 px-2 tabular-nums">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ── Slot row ─────────────────────────────────────────────────────────────────

function SlotRowItem({
  row, onToggleHidden, onExpire,
}: {
  row: SlotRow
  onToggleHidden: (slug: string) => void
  onExpire:       (id: string) => void
}) {
  const isEmpty   = row.status === 'empty'
  const isHidden  = row.status === 'hidden'
  const isOn      = row.status === 'on'
  const isPaused  = row.status === 'paused'
  const headBooking = row.bookings[0]

  const rowClass = `group border-b border-gray-100 last:border-0 ${
    isEmpty  ? 'bg-amber-50/40 hover:bg-amber-50' :
    isHidden ? 'bg-gray-50 hover:bg-gray-100 opacity-70' :
               'hover:bg-gray-50'
  }`

  const stickyCellClass = `px-4 py-3 text-right whitespace-nowrap sticky right-0 group-hover:bg-gray-50 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)] ${
    isEmpty  ? 'bg-amber-50/40 group-hover:bg-amber-50' :
    isHidden ? 'bg-gray-50 group-hover:bg-gray-100'    :
               'bg-white'
  }`

  return (
    <tr className={rowClass}>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-gray-900 leading-snug">{row.placement_label}</div>
        <code className="text-[10px] text-gray-400">{row.placement_type}</code>
      </td>
      <td className="px-4 py-3 text-xs text-gray-700">
        {row.page.label}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 capitalize">
        {CATEGORY_LABELS[row.category]}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {row.bookings.length === 0 ? (
          <span className="text-amber-700 italic font-semibold text-xs">No advertiser</span>
        ) : row.bookings.length === 1 ? (
          headBooking?.advertiser_accounts?.business_name ?? <span className="text-gray-400">—</span>
        ) : (
          <span className="text-violet-700 font-semibold text-xs">{row.bookings.length} rotating</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusPill status={row.status} />
        {isOn && headBooking?.ad_headline && (
          <div className="text-xs text-gray-600 mt-1 truncate">{headBooking.ad_headline}</div>
        )}
        {isEmpty && (
          <div className="text-[11px] text-amber-700 mt-1">Showing sales placeholder on the public site.</div>
        )}
        {isHidden && (
          <div className="text-[11px] text-gray-500 mt-1">Slot disabled. Nothing renders.</div>
        )}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
        {row.bookings.reduce((s, b) => s + (b.impression_count ?? 0), 0).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
        {(() => {
          const imp = row.bookings.reduce((s, b) => s + (b.impression_count ?? 0), 0)
          const clk = row.bookings.reduce((s, b) => s + (b.click_count ?? 0), 0)
          return ctr(imp, clk)
        })()}
      </td>
      <td className={stickyCellClass}>
        {/* Per-status actions:
            EMPTY  → "Sell this spot" + Hide
            ON     → Edit (first booking) + Hide
            PAUSED → Edit (first booking) + Hide
            HIDDEN → Show */}
        {isEmpty ? (
          <div className="inline-flex items-center gap-2">
            <Link
              href={`/admin/ads/new?placement_type=${encodeURIComponent(row.placement_type)}${row.page.context_slug ? `&context_slug=${encodeURIComponent(row.page.context_slug)}` : ''}`}
              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-md"
            >
              + Sell this spot
            </Link>
            <button
              onClick={() => onToggleHidden(row.placement_type)}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
              title="Hide this slot site-wide"
            >
              <EyeOff size={11} /> Hide
            </button>
          </div>
        ) : isHidden ? (
          <button
            onClick={() => onToggleHidden(row.placement_type)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
          >
            <Eye size={11} /> Show
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs">
            {headBooking && (
              <>
                <Link
                  href={`/admin/ads/${headBooking.id}/edit`}
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => onExpire(headBooking.id)}
                  className="font-semibold text-amber-700 hover:text-amber-900"
                  title="Mark this ad as expired — moves it out of active ads but keeps it in the customer's history"
                >
                  Mark expired
                </button>
                <span className="text-gray-300">·</span>
              </>
            )}
            <button
              onClick={() => onToggleHidden(row.placement_type)}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
              title="Hide this slot site-wide"
            >
              <EyeOff size={11} /> Hide
            </button>
          </div>
        )}
        {row.bookings.length > 1 && (
          <div className="mt-1 text-[10px] text-violet-600">+ {row.bookings.length - 1} more</div>
        )}
      </td>
    </tr>
  )
}

function StatusPill({ status }: { status: SlotRow['status'] }) {
  const styles = {
    on:     'bg-green-600 text-white',
    empty:  'bg-amber-500 text-white',
    paused: 'bg-red-600 text-white',
    hidden: 'bg-gray-700 text-white',
  }[status]
  const label = { on: 'ON', empty: 'EMPTY', paused: 'PAUSED', hidden: 'HIDDEN' }[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${styles}`}>
      {label}
    </span>
  )
}

// ── Form bits ───────────────────────────────────────────────────────────────

const selectCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

// ── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, tone, active, onClick }: {
  label:   string
  value:   number
  tone:    string
  active?: boolean
  onClick?: () => void
}) {
  const className = `text-left bg-white border rounded-2xl p-4 transition-all ${
    active
      ? 'border-2 ring-2 ring-offset-1'
      : 'border-gray-200 hover:border-gray-300'
  } ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}`
  const style: React.CSSProperties = active ? { borderColor: tone, boxShadow: `0 0 0 1px ${tone}33` } : {}
  const content = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tone }} />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
    </>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className={className} style={style} type="button">
        {content}
      </button>
    )
  }
  return <div className={className} style={style}>{content}</div>
}
