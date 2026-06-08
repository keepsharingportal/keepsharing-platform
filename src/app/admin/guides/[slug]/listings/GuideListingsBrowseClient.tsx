'use client'

// Listings browse client — search, filters, sort, multi-select +
// bulk delete. Click any row to open its editor. Mirrors the
// /admin/advertisers BusinessesTableClient pattern for consistency.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Trash2, X, RefreshCw, AlertTriangle, Star, Link2, Globe, Phone,
} from 'lucide-react'

export interface GuideListingRow {
  id:                     string
  advertiser_account_id:  string | null
  listing_tier:           string | null
  category:               string | null
  subcategory:            string | null
  is_published:           boolean | null
  listing_year:           number | null
  display_order:          number | null
  business_name:          string
  office_phone:           string | null
  mobile_phone:           string | null
  website_url:            string | null
  contact_email:          string | null
  address:                string | null
  city_state_zip:         string | null
  neighborhood:           string | null
  card_hook:              string | null
  advertiser_slug:        string | null
}

interface Props {
  slug:              string
  guideName:         string
  rows:              GuideListingRow[]
  initialQuery:      string
  initialTier:       'all' | 'featured' | 'community' | 'enhanced'
  initialAssoc:      'all' | 'linked' | 'unlinked'
  initialPublished:  'all' | 'published' | 'draft'
  initialSort:       'name' | 'year' | 'tier'
}

const TIER_BADGE: Record<string, string> = {
  featured:    'bg-portal-amber-lt text-portal-amber',
  enhanced:    'bg-violet-100 text-violet-800',
  community:   'bg-gray-100 text-gray-600',
}

export function GuideListingsBrowseClient(props: Props) {
  const router = useRouter()
  const [query, setQuery]         = useState(props.initialQuery)
  const [tier, setTier]           = useState(props.initialTier)
  const [assoc, setAssoc]         = useState(props.initialAssoc)
  const [pub, setPub]             = useState(props.initialPublished)
  const [sort, setSort]           = useState(props.initialSort)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, startTransition]   = useTransition()
  const [error, setError]         = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = props.rows.filter(r => {
      if (q && ![r.business_name, r.category, r.subcategory, r.address, r.city_state_zip]
        .filter(Boolean)
        .some(s => (s as string).toLowerCase().includes(q))) return false
      if (tier !== 'all' && (r.listing_tier ?? 'community') !== tier) return false
      if (assoc === 'linked'   && r.advertiser_account_id == null) return false
      if (assoc === 'unlinked' && r.advertiser_account_id != null) return false
      if (pub === 'published'  && !r.is_published) return false
      if (pub === 'draft'      &&  r.is_published) return false
      return true
    })
    out = [...out].sort((a, b) => {
      if (sort === 'year') return (b.listing_year ?? 0) - (a.listing_year ?? 0)
      if (sort === 'tier') {
        const t = (r: GuideListingRow) => r.listing_tier === 'featured' ? 0 : r.listing_tier === 'enhanced' ? 1 : 2
        const diff = t(a) - t(b)
        if (diff !== 0) return diff
        return a.business_name.localeCompare(b.business_name)
      }
      return a.business_name.localeCompare(b.business_name)
    })
    return out
  }, [props.rows, query, tier, assoc, pub, sort])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const someSelected = !allSelected && filtered.some(r => selected.has(r.id))

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map(r => r.id)))
  }
  function clear() { setSelected(new Set()) }

  async function onConfirmDelete() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/guide-listings/bulk-delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setConfirmOpen(false)
      clear()
      startTransition(() => router.refresh())
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Filters + search */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by business, category, address…"
            className="w-full text-sm pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
        </div>

        <FilterChips
          label="Tier"
          value={tier}
          onChange={v => setTier(v as typeof tier)}
          options={[
            { v: 'all',       label: 'All' },
            { v: 'featured',  label: 'Featured' },
            { v: 'enhanced',  label: 'Enhanced' },
            { v: 'community', label: 'Community' },
          ]}
        />

        <FilterChips
          label="Link"
          value={assoc}
          onChange={v => setAssoc(v as typeof assoc)}
          options={[
            { v: 'all',      label: 'All' },
            { v: 'linked',   label: 'Linked' },
            { v: 'unlinked', label: 'Unlinked' },
          ]}
        />

        <FilterChips
          label="Status"
          value={pub}
          onChange={v => setPub(v as typeof pub)}
          options={[
            { v: 'all',       label: 'All' },
            { v: 'published', label: 'Published' },
            { v: 'draft',     label: 'Draft' },
          ]}
        />

        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5 bg-white cursor-pointer"
        >
          <option value="name">Sort: Name A→Z</option>
          <option value="year">Sort: Year (newest)</option>
          <option value="tier">Sort: Tier (featured first)</option>
        </select>

        <span className="text-xs text-gray-500 ml-auto">
          {filtered.length} of {props.rows.length} showing
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-gray-900 text-white px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10 shrink-0">
          <span className="text-sm font-bold">
            {selected.size} {selected.size === 1 ? 'listing' : 'listings'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
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
        <div className="bg-portal-red-lt border-b border-portal-red/30 px-6 py-2 text-sm text-portal-red inline-flex items-center gap-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {query ? <>No listings match &ldquo;{query}&rdquo;.</> : 'No listings yet in this guide.'}
          </div>
        ) : (
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
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Year</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">CRM</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isSelected = selected.has(r.id)
                const tierKey = r.listing_tier ?? 'community'
                return (
                  <tr key={r.id} className={`border-b border-gray-100 ${isSelected ? 'bg-portal-amber-lt/60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(r.id)}
                        aria-label={`Select ${r.business_name}`}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/guides/${props.slug}/listings/${r.id}/edit`}
                        className="font-bold text-gray-900 hover:text-portal-blue inline-flex items-center gap-1.5"
                      >
                        {r.business_name}
                        {r.listing_tier === 'featured' && (
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                        )}
                      </Link>
                      {(r.address || r.city_state_zip || r.neighborhood) && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[300px]">
                          {[r.address, r.neighborhood, r.city_state_zip].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {!r.is_published && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mt-0.5">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.category ?? '—'}
                      {r.subcategory && <span className="block text-[10px] text-gray-400">{r.subcategory}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 rounded ${TIER_BADGE[tierKey] ?? TIER_BADGE.community}`}>
                        {tierKey}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 tabular-nums">{r.listing_year ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 space-y-0.5">
                      {(r.office_phone || r.mobile_phone) && (
                        <p className="inline-flex items-center gap-1"><Phone size={9} className="text-gray-400" /> {r.office_phone ?? r.mobile_phone}</p>
                      )}
                      {r.website_url && (
                        <p className="inline-flex items-center gap-1 truncate max-w-[200px]"><Globe size={9} className="text-gray-400" /> {r.website_url.replace(/^https?:\/\//, '')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.advertiser_account_id ? (
                        <Link
                          href={`/admin/advertisers/${r.advertiser_account_id}`}
                          className="inline-flex items-center gap-1 text-portal-blue hover:underline font-semibold"
                        >
                          <Link2 size={10} /> Linked
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unlinked</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !deleting && setConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 my-12 space-y-3">
            <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600" />
              Delete {selected.size} listing{selected.size === 1 ? '' : 's'}?
            </h3>
            <p className="text-sm text-gray-700">
              The listing rows go away. Linked advertiser_accounts (if any) are not touched — those live in CRM.
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-full hover:bg-rose-700 disabled:opacity-40"
              >
                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
              <button
                type="button"
                onClick={() => !deleting && setConfirmOpen(false)}
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

function FilterChips<V extends string>({ label, value, onChange, options }: {
  label:   string
  value:   V
  onChange: (v: V) => void
  options: ReadonlyArray<{ v: V; label: string }>
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 overflow-hidden text-[11px]">
      <span className="bg-gray-50 px-2 py-1 font-bold uppercase tracking-wider text-gray-500">{label}</span>
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-2 py-1 font-semibold ${value === o.v ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
