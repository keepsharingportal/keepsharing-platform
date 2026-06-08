'use client'

// Client-side table for /admin/advertisers. Server passes a paginated
// row set; this component owns the checkbox selection state and the
// bulk-action bar. Delete flows through a two-phase confirm so the
// editor sees what would cascade BEFORE the actual delete commits.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail, Phone, Megaphone, Star, Trash2, X, RefreshCw, AlertTriangle,
} from 'lucide-react'

export interface BusinessRow {
  id:                  string
  business_name:       string
  slug:                string | null
  package_tier:        string | null
  lifecycle_stage:     string | null
  loyalty_tier:        string | null
  contract_start_date: string | null
  contract_end_date:   string | null
  contact_name:        string | null
  contact_email:       string | null
  contact_phone:       string | null
  activePlacements:    number
  monthlyRevenue:      number
}

interface CascadePreview {
  ad_placements:       number | null
  print_ad_placements: number | null
  advertiser_contacts: number | null
  short_links:         number | null
  guide_listings:      number | null
  proposals:           number | null
}

interface Props {
  rows: BusinessRow[]
  /** When the editor's search is active, surface it in the empty state. */
  query?: string
}

const LIFECYCLE_BADGE: Record<string, { className: string; label: string }> = {
  active:       { className: 'bg-emerald-100 text-emerald-800', label: 'Active' },
  renewal:      { className: 'bg-amber-100 text-amber-800',     label: 'Renewal' },
  upgrade:      { className: 'bg-violet-100 text-violet-800',   label: 'Upgrade' },
  onboarding:   { className: 'bg-sky-100 text-sky-800',         label: 'Onboarding' },
  lead:         { className: 'bg-gray-100 text-gray-700',       label: 'Lead' },
  consultation: { className: 'bg-blue-100 text-blue-800',       label: 'Consultation' },
  proposal:     { className: 'bg-indigo-100 text-indigo-800',   label: 'Proposal' },
  dormant:      { className: 'bg-rose-100 text-rose-700',       label: 'Dormant' },
  churned:      { className: 'bg-rose-100 text-rose-700',       label: 'Churned' },
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BusinessesTableClient({ rows, query }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, startTransition]  = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [preview, setPreview]        = useState<CascadePreview | null>(null)
  const [previewIds, setPreviewIds]  = useState<string[]>([])
  const [error, setError]            = useState<string | null>(null)
  const [deleting, setDeleting]      = useState(false)

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  const someSelected = !allSelected && rows.some(r => selected.has(r.id))

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))
  }
  function clear() { setSelected(new Set()) }

  async function onDeleteClicked() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    setError(null)
    // Phase 1: preview cascade counts. Server inspects what would
    // cascade-delete (placements, contacts, links etc.) without
    // touching anything.
    const res = await fetch('/api/admin/advertisers/bulk-delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids, preview: true }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json?.error ?? `HTTP ${res.status}`)
      return
    }
    setPreview(json.cascaded as CascadePreview)
    setPreviewIds(ids)
    setConfirmOpen(true)
  }

  async function onConfirmDelete() {
    if (previewIds.length === 0) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/advertisers/bulk-delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: previewIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setConfirmOpen(false)
      setPreview(null)
      setPreviewIds([])
      clear()
      startTransition(() => router.refresh())
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        {query ? <>No businesses match &ldquo;{query}&rdquo;.</> : 'No businesses in this view.'}
      </div>
    )
  }

  return (
    <>
      {/* ── Bulk action bar ──────────────────────────────── */}
      {selected.size > 0 && (
        <div className="bg-gray-900 text-white px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10">
          <span className="text-sm font-bold">
            {selected.size} {selected.size === 1 ? 'business' : 'businesses'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDeleteClicked}
              disabled={busy || deleting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-40"
            >
              <Trash2 size={12} /> Delete selected
            </button>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 text-sm text-rose-800 inline-flex items-center gap-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
          <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-4 py-3 font-semibold w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected }}
                onChange={toggleAll}
                aria-label="Select all"
                className="cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 font-semibold">Business</th>
            <th className="px-4 py-3 font-semibold">Primary contact</th>
            <th className="px-4 py-3 font-semibold">Stage</th>
            <th className="px-4 py-3 font-semibold text-right">Active ads</th>
            <th className="px-4 py-3 font-semibold text-right">Monthly</th>
            <th className="px-4 py-3 font-semibold">Contract</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(a => {
            const isSelected = selected.has(a.id)
            return (
              <tr
                key={a.id}
                className={`border-b border-gray-100 ${isSelected ? 'bg-amber-50/60' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(a.id)}
                    aria-label={`Select ${a.business_name}`}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/advertisers/${a.id}`}
                    className="font-bold text-gray-900 hover:text-primary inline-flex items-center gap-1.5"
                  >
                    {a.business_name}
                  </Link>
                  {a.loyalty_tier && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      <Star size={9} className="fill-amber-500 text-amber-500" /> {a.loyalty_tier}
                    </span>
                  )}
                  {a.package_tier && (
                    <span className="ml-2 text-[10px] text-gray-500">{a.package_tier}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {a.contact_name && <p className="font-semibold text-gray-900">{a.contact_name}</p>}
                  {a.contact_email && (
                    <a href={`mailto:${a.contact_email}`} className="text-primary hover:underline inline-flex items-center gap-0.5">
                      <Mail size={10} /> {a.contact_email}
                    </a>
                  )}
                  {a.contact_phone && (
                    <p className="text-gray-500 inline-flex items-center gap-0.5"><Phone size={10} /> {a.contact_phone}</p>
                  )}
                  {!a.contact_name && !a.contact_email && !a.contact_phone && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                  <StageBadge stage={a.lifecycle_stage} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${a.activePlacements > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                    <Megaphone size={11} /> {a.activePlacements}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">
                  {a.monthlyRevenue > 0 ? (
                    <span className="font-bold text-gray-900">${a.monthlyRevenue.toLocaleString()}</span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {a.contract_start_date || a.contract_end_date ? (
                    <span>{fmtDate(a.contract_start_date)} → {fmtDate(a.contract_end_date)}</span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── Delete confirm modal ─────────────────────────── */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !deleting && setConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 my-12 space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                Delete {previewIds.length} business{previewIds.length === 1 ? '' : 'es'}?
              </h3>
              <button onClick={() => !deleting && setConfirmOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            </header>

            <p className="text-sm text-gray-700">
              This cannot be undone. The following related rows will also be deleted by cascade:
            </p>

            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <CascadeLine label="Digital ad placements" value={preview.ad_placements} />
              <CascadeLine label="Print ad placements" value={preview.print_ad_placements} />
              <CascadeLine label="Contacts"             value={preview.advertiser_contacts} />
              <CascadeLine label="QR / tracked links"  value={preview.short_links} />
              <CascadeLine label="Guide listings"      value={preview.guide_listings} />
              <CascadeLine label="Proposals"           value={preview.proposals} />
            </div>

            {(preview.ad_placements ?? 0) === 0 &&
             (preview.print_ad_placements ?? 0) === 0 &&
             (preview.advertiser_contacts ?? 0) === 0 &&
             (preview.short_links ?? 0) === 0 &&
             (preview.guide_listings ?? 0) === 0 &&
             (preview.proposals ?? 0) === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                Safe to delete — none of the selected rows have related activity.
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 inline-flex items-center gap-2">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-full hover:bg-rose-700 disabled:opacity-40"
              >
                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : `Delete ${previewIds.length}`}
              </button>
              <button
                type="button"
                onClick={() => !deleting && setConfirmOpen(false)}
                disabled={deleting}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CascadeLine({ label, value }: { label: string; value: number | null }) {
  // null = table doesn't exist in this environment (migration pending);
  // render dim 'not tracked' so the editor knows we just don't know.
  if (value == null) {
    return (
      <div className="flex items-center justify-between text-gray-400">
        <span>{label}</span>
        <span className="text-[10px] italic">not tracked here</span>
      </div>
    )
  }
  if (value === 0) {
    return (
      <div className="flex items-center justify-between text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums">0</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between text-gray-900 font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function StageBadge({ stage }: { stage: string | null }) {
  const cfg = LIFECYCLE_BADGE[stage ?? ''] ?? { className: 'bg-gray-100 text-gray-700', label: stage ?? '—' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
