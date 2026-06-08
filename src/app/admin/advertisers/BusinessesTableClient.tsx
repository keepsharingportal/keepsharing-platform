'use client'

// Client-side table for /admin/advertisers. Server passes a paginated
// row set; this component owns the checkbox selection state and the
// bulk-action bar. Delete flows through a two-phase confirm so the
// editor sees what would cascade BEFORE the actual delete commits.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Megaphone, Star, Trash2, X, RefreshCw, AlertTriangle, GitMerge, Loader2,
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

// Portal badge palette — light bg + matching dark text. Mirrors the
// portal.css .badge-* classes (green/amber/red/blue/gray).
const LIFECYCLE_BADGE: Record<string, { className: string; label: string }> = {
  active:       { className: 'bg-portal-green-lt text-portal-green', label: 'Active' },
  renewal:      { className: 'bg-portal-amber-lt text-portal-amber', label: 'Renewal' },
  upgrade:      { className: 'bg-portal-blue-lt text-portal-blue', label: 'Upgrade' },
  onboarding:   { className: 'bg-portal-blue-lt text-portal-blue', label: 'Onboarding' },
  lead:         { className: 'bg-portal-bg text-portal-sub', label: 'Lead' },
  consultation: { className: 'bg-portal-blue-lt text-portal-blue', label: 'Consultation' },
  proposal:     { className: 'bg-portal-blue-lt text-portal-blue', label: 'Proposal' },
  dormant:      { className: 'bg-portal-red-lt text-portal-red', label: 'Dormant' },
  churned:      { className: 'bg-portal-red-lt text-portal-red', label: 'Churned' },
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
  // Merge-selected modal state. Editor picks one of the selected rows
  // as the survivor (or leaves the default — the one with the most
  // activity), can optionally rename the survivor's business_name on
  // commit, then merge. Re-uses the existing /api/admin/advertisers/merge
  // endpoint (which already supports survivorName).
  const [mergeOpen, setMergeOpen]      = useState(false)
  const [mergeSurvivorId, setMergeSurvivorId] = useState<string>('')
  const [mergeSurvivorName, setMergeSurvivorName] = useState<string>('')
  const [merging, setMerging]          = useState(false)

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

  // Merge selected → into one survivor. Seeded with the row carrying
  // the most activity (best heuristic for 'which is the canonical
  // record'). Editor can change the radio pick or rename the survivor.
  function onMergeClicked() {
    if (selected.size < 2) return
    const selectedRows = rows.filter(r => selected.has(r.id))
    const best = [...selectedRows].sort((a, b) => b.activePlacements - a.activePlacements)[0]
    setMergeSurvivorId(best?.id ?? selectedRows[0]?.id ?? '')
    setMergeSurvivorName(best?.business_name ?? '')
    setError(null)
    setMergeOpen(true)
  }
  async function onConfirmMerge() {
    const ids = Array.from(selected)
    if (!mergeSurvivorId || ids.length < 2) return
    const mergeIds = ids.filter(id => id !== mergeSurvivorId)
    if (mergeIds.length === 0) return
    const survivor = rows.find(r => r.id === mergeSurvivorId)
    const rename = mergeSurvivorName.trim() && survivor && mergeSurvivorName.trim().toLowerCase() !== survivor.business_name.toLowerCase()
    setMerging(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/advertisers/merge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          survivorId:    mergeSurvivorId,
          mergeIds,
          survivorName:  rename ? mergeSurvivorName.trim() : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setMergeOpen(false)
      clear()
      startTransition(() => router.refresh())
    } finally {
      setMerging(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-portal-sub">
        {query ? <>No businesses match &ldquo;{query}&rdquo;.</> : 'No businesses in this view.'}
      </div>
    )
  }

  return (
    <>
      {/* ── Bulk action bar (Portal: navy strip) ───────── */}
      {selected.size > 0 && (
        <div className="bg-[portal-navy] text-white px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10">
          <span className="text-[13px] font-semibold">
            {selected.size} {selected.size === 1 ? 'business' : 'businesses'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMergeClicked}
              disabled={busy || merging || selected.size < 2}
              title={selected.size < 2 ? 'Pick at least 2 rows to merge' : 'Merge selected into one survivor'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#D97706] hover:opacity-90 rounded-lg disabled:opacity-40"
            >
              <GitMerge size={12} /> Merge selected
            </button>
            <button
              type="button"
              onClick={onDeleteClicked}
              disabled={busy || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#DC2626] hover:opacity-90 rounded-lg disabled:opacity-40"
            >
              <Trash2 size={12} /> Delete selected
            </button>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#FEE2E2] border-b border-[#FCA5A5] px-6 py-2.5 text-[13px] text-[#991B1B] inline-flex items-center gap-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* ── Table (Portal: .data-table) ──────────────── */}
      <table className="w-full text-[13px]">
        <thead className="bg-portal-row-hover sticky top-0 border-b-2 border-portal-border">
          <tr className="text-left text-[11px] uppercase tracking-[0.4px] text-portal-sub">
            <th className="px-3 py-2.5 font-semibold w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected }}
                onChange={toggleAll}
                aria-label="Select all"
                className="cursor-pointer"
              />
            </th>
            <th className="px-3 py-2.5 font-semibold">Business</th>
            <th className="px-3 py-2.5 font-semibold">Stage</th>
            <th className="px-3 py-2.5 font-semibold text-right">Active ads</th>
            <th className="px-3 py-2.5 font-semibold text-right">Monthly</th>
            <th className="px-3 py-2.5 font-semibold">Contract</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(a => {
            const isSelected = selected.has(a.id)
            return (
              <tr
                key={a.id}
                className={`border-b border-portal-border ${isSelected ? 'bg-portal-blue-lt/40' : 'hover:bg-portal-row-hover'}`}
              >
                <td className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(a.id)}
                    aria-label={`Select ${a.business_name}`}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/advertisers/${a.id}`}
                    className="font-semibold text-portal-text hover:text-portal-blue inline-flex items-center gap-1.5"
                  >
                    {a.business_name}
                  </Link>
                  {a.loyalty_tier && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#92400E]">
                      <Star size={9} className="fill-[#D97706] text-[#D97706]" /> {a.loyalty_tier}
                    </span>
                  )}
                  {a.package_tier && (
                    <span className="ml-2 text-[10px] text-portal-muted">{a.package_tier}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <StageBadge stage={a.lifecycle_stage} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${a.activePlacements > 0 ? 'text-[#166534]' : 'text-portal-muted'}`}>
                    <Megaphone size={11} /> {a.activePlacements}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[12px]">
                  {a.monthlyRevenue > 0 ? (
                    <span className="font-semibold text-portal-text">${a.monthlyRevenue.toLocaleString()}</span>
                  ) : <span className="text-portal-muted">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-portal-sub">
                  {a.contract_start_date || a.contract_end_date ? (
                    <span>{fmtDate(a.contract_start_date)} → {fmtDate(a.contract_end_date)}</span>
                  ) : <span className="text-portal-muted">—</span>}
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
              <h3 className="text-base font-bold text-portal-text inline-flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                Delete {previewIds.length} business{previewIds.length === 1 ? '' : 'es'}?
              </h3>
              <button onClick={() => !deleting && setConfirmOpen(false)} className="text-portal-muted hover:text-portal-text">
                <X size={14} />
              </button>
            </header>

            <p className="text-sm text-portal-text">
              This cannot be undone. The following related rows will also be deleted by cascade:
            </p>

            <div className="bg-portal-bg rounded-xl p-3 text-sm space-y-1">
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
              <div className="bg-portal-green-lt border border-emerald-200 rounded-lg p-3 text-xs text-portal-green">
                Safe to delete — none of the selected rows have related activity.
              </div>
            )}

            {error && (
              <div className="bg-portal-red-lt border border-portal-red/30 rounded-lg p-3 text-xs text-portal-red inline-flex items-center gap-2">
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
                className="px-3 py-2 text-sm text-portal-sub hover:text-portal-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge confirm modal ──────────────────────────── */}
      {mergeOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => !merging && setMergeOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 my-12 space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-base font-bold text-portal-text inline-flex items-center gap-2">
                <GitMerge size={16} className="text-amber-600" />
                Merge {selected.size} businesses into one
              </h3>
              <button onClick={() => !merging && setMergeOpen(false)} className="text-portal-muted hover:text-portal-text">
                <X size={14} />
              </button>
            </header>

            <p className="text-sm text-portal-text">
              Pick the row to KEEP. Every ad placement, contact, listing, and proposal from the other rows gets
              repointed at the survivor; the others are deleted.
            </p>

            <div className="max-h-64 overflow-y-auto border border-portal-border rounded-lg divide-y divide-gray-100">
              {rows.filter(r => selected.has(r.id)).map(r => {
                const isSurvivor = r.id === mergeSurvivorId
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${isSurvivor ? 'bg-portal-green-lt/60' : 'hover:bg-portal-bg'}`}
                  >
                    <input
                      type="radio"
                      name="merge-survivor"
                      checked={isSurvivor}
                      onChange={() => {
                        setMergeSurvivorId(r.id)
                        setMergeSurvivorName(r.business_name)
                      }}
                      className="mt-1 cursor-pointer accent-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-sm font-bold text-portal-text truncate">{r.business_name}</p>
                        {isSurvivor && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                            Keep
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-portal-sub mt-0.5">
                        {r.activePlacements} active ad{r.activePlacements === 1 ? '' : 's'}
                        {r.contact_email && ` · ${r.contact_email}`}
                        {r.contact_phone && ` · ${r.contact_phone}`}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1">
                Final business name
              </label>
              <input
                type="text"
                value={mergeSurvivorName}
                onChange={e => setMergeSurvivorName(e.target.value)}
                placeholder="Canonical business name…"
                className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white"
              />
              <p className="text-[11px] text-portal-sub mt-1 leading-snug">
                Defaults to the picked survivor&apos;s name. Edit to give the merged record a cleaner canonical
                name (e.g. drop punctuation, fix capitalization).
              </p>
            </div>

            {error && (
              <div className="bg-portal-red-lt border border-portal-red/30 rounded-lg p-3 text-xs text-portal-red inline-flex items-center gap-2">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onConfirmMerge}
                disabled={merging || !mergeSurvivorId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-40"
              >
                {merging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                {merging ? 'Merging…' : `Merge ${selected.size - 1} into selected`}
              </button>
              <button
                type="button"
                onClick={() => !merging && setMergeOpen(false)}
                disabled={merging}
                className="px-3 py-2 text-sm text-portal-sub hover:text-portal-text"
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
      <div className="flex items-center justify-between text-portal-muted">
        <span>{label}</span>
        <span className="text-[10px] italic">not tracked here</span>
      </div>
    )
  }
  if (value === 0) {
    return (
      <div className="flex items-center justify-between text-portal-muted">
        <span>{label}</span>
        <span className="tabular-nums">0</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between text-portal-text font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function StageBadge({ stage }: { stage: string | null }) {
  const cfg = LIFECYCLE_BADGE[stage ?? ''] ?? { className: 'bg-portal-bg text-portal-sub', label: stage ?? '—' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
