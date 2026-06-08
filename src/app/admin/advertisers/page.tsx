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
import { normalize, findClusters, type DupCandidate } from '@/lib/advertisers/dedup'
import {
  Plus, Search, ChevronLeft, ChevronRight, DollarSign,
  Download, Table2, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { BusinessesTableClient, type BusinessRow } from './BusinessesTableClient'

const PAGE_SIZE = 50
const TABS = ['Active Advertisers', 'Pipeline', 'Duplicates']

// Lifecycle taxonomy — splits the universe into Active vs Inactive vs
// All. Pipeline lifecycle stages (lead/consultation/proposal/onboarding)
// surface on the Pipeline tab, not here.
const ACTIVE_STAGES   = new Set(['active', 'renewal', 'upgrade-ready', 'sponsor-qualified'])
const INACTIVE_STAGES = new Set(['dormant', 'reactivation', 'churned', 'lost'])

interface Props {
  searchParams: Promise<{ page?: string; q?: string; status?: string; sort?: string; kind?: string }>
}

export const metadata: Metadata = { title: 'Advertisers — Admin' }
export const dynamic  = 'force-dynamic'

export default async function AdvertisersPage({ searchParams }: Props) {
  await requireAdmin()
  const params = await searchParams
  const page         = Math.max(1, parseInt(params.page ?? '1', 10))
  const query        = params.q?.trim() ?? ''
  const statusFilter = (params.status ?? 'active') as 'active' | 'inactive' | 'all'
  const sort         = (params.sort   ?? 'active') as 'active' | 'name'
  // Default to 'advertiser' so the CRM view is paying customers + leads,
  // not the hundreds of directory-only guide entries. Migration 133
  // marks guide-imported rows as kind='directory_only'.
  const kindFilter   = (params.kind   ?? 'advertiser') as 'advertiser' | 'directory_only' | 'all'

  const supabase = createAdminClient()

  // Pull every account + every placement; the join shape is too wide
  // for Postgres aggregations to feel clean, so we tally in memory.
  // Catalog size is at most a few hundred businesses with a few thousand
  // placements — well within "just process it" territory.
  const [accountsRes, placementsRes] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, slug, package_tier, lifecycle_stage, loyalty_tier, contract_start_date, contract_end_date, contact_name, contact_email, contact_phone, business_url, kind')
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
    kind: 'advertiser' | 'directory_only' | null;
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

  // Duplicate cluster count — surfaces a banner at the top of the page
  // pushing the editor to clean these up. Bucketed by kind so the
  // banner shows the count relevant to the CURRENT filter — counting
  // directory-only dups here when she's viewing 'Advertisers' would
  // be misleading noise.
  function candidatesForKind(kind: 'advertiser' | 'directory_only'): DupCandidate[] {
    return accounts
      .filter(a => (a.kind ?? 'directory_only') === kind)
      .map(a => ({
        id:            a.id,
        business_name: a.business_name,
        slug:          a.slug ?? '',
        tokens:        normalize(a.business_name),
      }))
  }
  const dupClustersAdvertiser = findClusters(candidatesForKind('advertiser')).length
  const dupClustersDirectory  = findClusters(candidatesForKind('directory_only')).length
  const dupClusterCount =
    kindFilter === 'advertiser'     ? dupClustersAdvertiser  :
    kindFilter === 'directory_only' ? dupClustersDirectory   :
                                      dupClustersAdvertiser + dupClustersDirectory

  // Search + status + kind filter applied in memory.
  const filtered = decorated.filter(a => {
    if (query && !a.business_name.toLowerCase().includes(query.toLowerCase())) return false
    const stage = a.lifecycle_stage ?? ''
    if (statusFilter === 'active'   && !ACTIVE_STAGES.has(stage))   return false
    if (statusFilter === 'inactive' && !INACTIVE_STAGES.has(stage)) return false
    if (kindFilter !== 'all') {
      const rowKind = a.kind ?? 'directory_only'
      if (rowKind !== kindFilter) return false
    }
    return true
  }).sort((a, b) => {
    if (sort === 'name') return a.business_name.localeCompare(b.business_name)
    // Default: most-active first (most engaged businesses up top), then
    // alphabetical as the tiebreak.
    if (b.activePlacements !== a.activePlacements) return b.activePlacements - a.activePlacements
    return a.business_name.localeCompare(b.business_name)
  })

  // Per-tab counts for the chips above the table.
  const counts = {
    active:   decorated.filter(a => ACTIVE_STAGES.has(a.lifecycle_stage ?? '')).length,
    inactive: decorated.filter(a => INACTIVE_STAGES.has(a.lifecycle_stage ?? '')).length,
    all:      decorated.length,
  }
  // Per-kind counts (use the same query but bypass the kind filter so the
  // chips always show absolute totals regardless of which is active).
  const kindCounts = {
    advertiser:     decorated.filter(a => (a.kind ?? 'directory_only') === 'advertiser').length,
    directory_only: decorated.filter(a => (a.kind ?? 'directory_only') === 'directory_only').length,
    all:            decorated.length,
  }

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalRevenue  = filtered.reduce((s, a) => s + a.monthlyRevenue, 0)
  const totalAdvertisers = filtered.length

  function makeHref(overrides: Partial<{
    page: number; q: string;
    status: 'active' | 'inactive' | 'all';
    sort:   'active' | 'name';
    kind:   'advertiser' | 'directory_only' | 'all';
  }>): string {
    const sp = new URLSearchParams()
    const p = overrides.page    ?? page
    const q = overrides.q       ?? query
    const s = overrides.status  ?? statusFilter
    const o = overrides.sort    ?? sort
    const k = overrides.kind    ?? kindFilter
    if (p !== 1)             sp.set('page',   String(p))
    if (q)                   sp.set('q',      q)
    if (s !== 'active')      sp.set('status', s)
    if (o !== 'active')      sp.set('sort',   o)
    if (k !== 'advertiser')  sp.set('kind',   k)
    const qs = sp.toString()
    return `/admin/advertisers${qs ? '?' + qs : ''}`
  }
  const buildHref  = (p: number) => makeHref({ page: p })
  const statusHref = (s: 'active' | 'inactive' | 'all') => makeHref({ status: s, page: 1 })
  const sortHref   = (o: 'active' | 'name') => makeHref({ sort: o, page: 1 })
  const kindHref   = (k: 'advertiser' | 'directory_only' | 'all') => makeHref({ kind: k, page: 1 })

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

      {/* ── Duplicate cleanup nag ────────────────────────
          Surfaced here because every dup cluster turns into a 'fuzzy
          match' prompt in the CSV importer every month. Cleaning these
          once saves the editor that friction permanently. */}
      {dupClusterCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 shrink-0">
          <Link
            href={kindFilter === 'advertiser' ? '/admin/advertisers/duplicates' : `/admin/advertisers/duplicates?kind=${kindFilter}`}
            className="flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <AlertTriangle size={14} className="text-amber-700 shrink-0" />
              <span>
                <span className="font-bold">{dupClusterCount}</span> likely-duplicate cluster{dupClusterCount === 1 ? '' : 's'} found
                <span className="text-amber-700"> — merge them to stop repeating &ldquo;use existing or create new?&rdquo; prompts every CSV import.</span>
              </span>
            </div>
            <span className="text-xs font-bold text-amber-900 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all whitespace-nowrap">
              Review &amp; merge <ArrowRight size={11} />
            </span>
          </Link>
        </div>
      )}

      {/* ── Kind chips (Advertiser vs Directory-only vs All) ─────
          Sits above the status row because it controls the bigger
          'which slice of the database am I looking at' decision.
          Default = Advertiser so the CRM view is paying customers,
          not the hundreds of guide-only entries. */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 flex-wrap shrink-0">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mr-1">View:</span>
        {(['advertiser', 'directory_only', 'all'] as const).map(k => {
          const on = kindFilter === k
          const label =
            k === 'advertiser'     ? 'Advertisers' :
            k === 'directory_only' ? 'Directory only' :
                                     'All'
          const tone =
            k === 'advertiser'     ? 'bg-primary'   :
            k === 'directory_only' ? 'bg-gray-500'  :
                                     'bg-gray-900'
          return (
            <a key={k} href={kindHref(k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                on ? `${tone} text-white` : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
              }`}>
              {label}
              <span className={`text-[10px] ${on ? 'opacity-80' : 'text-gray-400'}`}>{kindCounts[k]}</span>
            </a>
          )
        })}
        <span className="text-[10px] text-gray-400 ml-2 leading-tight">
          Directory-only = listed in a guide but never a paid customer. Guide imports land here by default.
        </span>
      </div>

      {/* ── Search + status chips + sort + totals ──────── */}
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
            placeholder="Search businesses…"
            className="w-full text-sm pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
          {statusFilter !== 'active' && <input type="hidden" name="status" value={statusFilter} />}
          {sort !== 'active' && <input type="hidden" name="sort" value={sort} />}
          {kindFilter !== 'advertiser' && <input type="hidden" name="kind" value={kindFilter} />}
        </form>

        {/* Sort toggle — 'Active' for daily use (most engaged up top),
            'Name' for cleanup passes where alphabetical scan finds dups. */}
        <div className="inline-flex rounded-full border border-gray-200 overflow-hidden text-xs font-bold">
          <a
            href={sortHref('active')}
            className={`px-3 py-1.5 ${sort === 'active' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Sort: Active
          </a>
          <a
            href={sortHref('name')}
            className={`px-3 py-1.5 border-l border-gray-200 ${sort === 'name' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Sort: Name A→Z
          </a>
        </div>

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
        <BusinessesTableClient
          rows={paginated as unknown as BusinessRow[]}
          query={query}
        />
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

