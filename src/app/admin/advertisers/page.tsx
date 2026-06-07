// /admin/advertisers — primary list view, reads from advertiser_accounts.
//
// One row per business (the umbrella). For each: primary contact, lifecycle
// status, contract dates, and rollup stats from the related ad_placements
// rows (active count + monthly recurring price). The legacy 'advertisers'
// table that tracked print-magazine deals isn't queried here — that data
// lived in a parallel schema that never linked to the business records
// editors create today. Until print bookings get a proper home, this page
// is the digital-side source of truth.

import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import {
  Plus, Search, ChevronLeft, ChevronRight, Megaphone, DollarSign,
  Mail, Phone, Star, Download, Table2,
} from 'lucide-react'

const PAGE_SIZE = 25
const TABS = ['Active Advertisers', 'Pipeline', 'Duplicates']

// Lifecycle taxonomy — splits the universe into Active vs Inactive vs
// All. Pipeline lifecycle stages (lead/consultation/proposal/onboarding)
// surface on the Pipeline tab, not here.
const ACTIVE_STAGES   = new Set(['active', 'renewal', 'upgrade-ready', 'sponsor-qualified'])
const INACTIVE_STAGES = new Set(['dormant', 'reactivation', 'churned', 'lost'])

interface Props {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

export const metadata: Metadata = { title: 'Advertisers — Admin' }
export const dynamic  = 'force-dynamic'

export default async function AdvertisersPage({ searchParams }: Props) {
  await requireAdmin()
  const params = await searchParams
  const page         = Math.max(1, parseInt(params.page ?? '1', 10))
  const query        = params.q?.trim() ?? ''
  const statusFilter = (params.status ?? 'active') as 'active' | 'inactive' | 'all'

  const supabase = createAdminClient()

  // Pull every account + every placement; the join shape is too wide
  // for Postgres aggregations to feel clean, so we tally in memory.
  // Catalog size is at most a few hundred businesses with a few thousand
  // placements — well within "just process it" territory.
  const [accountsRes, placementsRes] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, slug, package_tier, lifecycle_stage, loyalty_tier, contract_start_date, contract_end_date, contact_name, contact_email, contact_phone, business_url')
      .order('business_name', { ascending: true }),
    supabase
      .from('ad_placements')
      .select('advertiser_account_id, is_active, archived_at, price_monthly, ends_at'),
  ])

  type Account = {
    id: string; business_name: string; slug: string | null;
    package_tier: string | null; lifecycle_stage: string | null;
    loyalty_tier: string | null;
    contract_start_date: string | null; contract_end_date: string | null;
    contact_name: string | null; contact_email: string | null; contact_phone: string | null;
    business_url: string | null;
  }
  const accounts = (accountsRes.data ?? []) as Account[]

  // Rollup placements per advertiser. Active = is_active && !archived_at.
  type PlacementRow = {
    advertiser_account_id: string | null;
    is_active: boolean | null;
    archived_at: string | null;
    price_monthly: number | null;
    ends_at: string | null
  }
  const rollupMap = new Map<string, { activePlacements: number; monthlyRevenue: number; totalPlacements: number }>()
  for (const p of (placementsRes.data ?? []) as PlacementRow[]) {
    if (!p.advertiser_account_id) continue
    const entry = rollupMap.get(p.advertiser_account_id) ?? { activePlacements: 0, monthlyRevenue: 0, totalPlacements: 0 }
    entry.totalPlacements++
    const isActive = !!p.is_active && !p.archived_at
    if (isActive) {
      entry.activePlacements++
      entry.monthlyRevenue += p.price_monthly ?? 0
    }
    rollupMap.set(p.advertiser_account_id, entry)
  }

  // Decorate accounts with their rollup. Sort: most active placements
  // first (most-engaged advertisers up top), then alphabetical.
  const decorated = accounts.map(a => {
    const r = rollupMap.get(a.id) ?? { activePlacements: 0, monthlyRevenue: 0, totalPlacements: 0 }
    return { ...a, ...r }
  })

  // Search + status filter applied in memory.
  const filtered = decorated.filter(a => {
    if (query && !a.business_name.toLowerCase().includes(query.toLowerCase())) return false
    const stage = a.lifecycle_stage ?? ''
    if (statusFilter === 'active'   && !ACTIVE_STAGES.has(stage))   return false
    if (statusFilter === 'inactive' && !INACTIVE_STAGES.has(stage)) return false
    return true
  }).sort((a, b) => {
    if (b.activePlacements !== a.activePlacements) return b.activePlacements - a.activePlacements
    return a.business_name.localeCompare(b.business_name)
  })

  // Per-tab counts for the chips above the table.
  const counts = {
    active:   decorated.filter(a => ACTIVE_STAGES.has(a.lifecycle_stage ?? '')).length,
    inactive: decorated.filter(a => INACTIVE_STAGES.has(a.lifecycle_stage ?? '')).length,
    all:      decorated.length,
  }

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalRevenue  = filtered.reduce((s, a) => s + a.monthlyRevenue, 0)
  const totalAdvertisers = filtered.length

  const buildHref  = (p: number) =>
    `/admin/advertisers?page=${p}${query ? `&q=${encodeURIComponent(query)}` : ''}${statusFilter !== 'active' ? `&status=${statusFilter}` : ''}`
  const statusHref = (s: 'active' | 'inactive' | 'all') =>
    `/admin/advertisers${query ? `?q=${encodeURIComponent(query)}` : ''}${s !== 'active' ? `${query ? '&' : '?'}status=${s}` : ''}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Advertisers</h1>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200">
            {totalAdvertisers} {totalAdvertisers === 1 ? 'business' : 'businesses'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/import" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={14} /> Import
          </Link>
          <Link href="/admin/advertisers/layout-sheet" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Table2 size={14} /> Layout Sheet
          </Link>
          <Link href="/admin/advertisers/onboarding" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Onboarding
          </Link>
          <Link href="/admin/advertisers/proposals" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Proposals
          </Link>
          <Link href="/admin/advertisers/sponsor-inventory" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Sponsor Inventory
          </Link>
          <Link href="/admin/advertisers/partner-ops" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Partner Ops
          </Link>
          <Link
            href="/admin/advertisers/new"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus size={14} /> Add Advertiser
          </Link>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const href = tab === 'Active Advertisers' ? '/admin/advertisers'
              : tab === 'Pipeline'                    ? '/admin/advertisers/pipeline'
              :                                         '/admin/advertisers/duplicates'
            return (
              <a key={tab} href={href}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === 'Active Advertisers'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
                }`}>
                {tab}
              </a>
            )
          })}
        </div>
      </div>

      {/* ── Search + status chips + totals ──────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-1">
          {(['active', 'inactive', 'all'] as const).map(s => {
            const on = statusFilter === s
            const label = s === 'active' ? 'Active' : s === 'inactive' ? 'Inactive' : 'All'
            const tone = s === 'active' ? 'bg-emerald-600' : s === 'inactive' ? 'bg-gray-500' : 'bg-gray-900'
            return (
              <a key={s} href={statusHref(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  on ? `${tone} text-white` : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {label}
                <span className={`text-[10px] ${on ? 'opacity-80' : 'text-gray-400'}`}>{counts[s]}</span>
              </a>
            )
          })}
        </div>
        <form className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search advertisers…"
            className="w-full text-sm pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
          {statusFilter !== 'active' && <input type="hidden" name="status" value={statusFilter} />}
        </form>
        <div className="text-sm text-gray-600 inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
            <DollarSign size={13} /> ${totalRevenue.toLocaleString()} /mo
          </span>
          <span className="text-gray-400">·</span>
          <span>{totalAdvertisers} {totalAdvertisers === 1 ? 'business' : 'businesses'}</span>
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {paginated.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {query ? <>No advertisers match &quot;{query}&quot;.</> : 'No advertisers in this view.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                <th className="px-6 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Primary contact</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold text-right">Active ads</th>
                <th className="px-4 py-3 font-semibold text-right">Monthly</th>
                <th className="px-4 py-3 font-semibold">Contract</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(a => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link href={`/admin/advertisers/${a.id}`} className="font-bold text-gray-900 hover:text-primary inline-flex items-center gap-1.5">
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Page {page} of {totalPages} · {totalAdvertisers} businesses
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${page === 1 ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronLeft size={12} /> Prev
            </Link>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${page === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
            >
              Next <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

const STAGE_LABELS: Record<string, { label: string; cls: string }> = {
  'lead':              { label: 'Lead',             cls: 'bg-gray-100 text-gray-700 ring-gray-200' },
  'consultation':      { label: 'Consultation',     cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
  'proposal':          { label: 'Proposal',         cls: 'bg-violet-100 text-violet-800 ring-violet-200' },
  'onboarding':        { label: 'Onboarding',       cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'active':            { label: 'Active',           cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  'renewal':           { label: 'Renewal',          cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'upgrade-ready':     { label: 'Upgrade Ready',    cls: 'bg-violet-100 text-violet-800 ring-violet-200' },
  'sponsor-qualified': { label: 'Sponsor Qualified', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  'dormant':           { label: 'Dormant',          cls: 'bg-rose-100 text-rose-700 ring-rose-200' },
  'reactivation':      { label: 'Reactivation',     cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
}
function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <span className="text-gray-400">—</span>
  const meta = STAGE_LABELS[stage] ?? { label: stage, cls: 'bg-gray-100 text-gray-700 ring-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${meta.cls}`}>
      {meta.label}
    </span>
  )
}
