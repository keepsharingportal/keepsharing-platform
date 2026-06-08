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
  Plus, Search, ChevronLeft, ChevronRight,
  Download, Table2,
} from 'lucide-react'
import { BusinessesTableClient, type BusinessRow } from './BusinessesTableClient'
import { DirectoryCleanupBanner } from './DirectoryCleanupBanner'

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

  // Kept for the DirectoryCleanupBanner — surfaces 'how many directory
  // rows can I retire?' when the editor lands on ?kind=directory_only.
  const kindCounts = {
    directory_only: decorated.filter(a => (a.kind ?? 'directory_only') === 'directory_only').length,
  }

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
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
  const sortHref   = (o: 'active' | 'name') => makeHref({ sort: o, page: 1 })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page header (Portal: .page-header) ──────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold text-portal-text">Advertisers</h1>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">
            {totalAdvertisers} {totalAdvertisers === 1 ? 'business' : 'businesses'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/import" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            <Download size={14} /> Import
          </Link>
          <Link href="/admin/advertisers/layout-sheet" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            <Table2 size={14} /> Layout Sheet
          </Link>
          <Link href="/admin/advertisers/onboarding" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            Onboarding
          </Link>
          <Link href="/admin/advertisers/proposals" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            Proposals
          </Link>
          <Link href="/admin/advertisers/sponsor-inventory" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            Sponsor Inventory
          </Link>
          <Link href="/admin/advertisers/partner-ops" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            Partner Ops
          </Link>
          <Link
            href="/admin/advertisers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-[portal-navy] rounded-lg hover:opacity-90"
          >
            <Plus size={14} /> Add Advertiser
          </Link>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const href = tab === 'Active Advertisers' ? '/admin/advertisers'
              : tab === 'Pipeline'                    ? '/admin/advertisers/pipeline'
              :                                         '/admin/advertisers/duplicates'
            return (
              <a key={tab} href={href}
                className={`px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  tab === 'Active Advertisers'
                    ? 'text-[portal-blue] border-[portal-blue]'
                    : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
                }`}>
                {tab}
              </a>
            )
          })}
        </div>
      </div>

      {/* Directory-only cleanup tool — only when actually viewing directory rows. */}
      {kindFilter === 'directory_only' && (
        <DirectoryCleanupBanner directoryCount={kindCounts.directory_only} />
      )}

      {/* ── Search + sort ─────────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <form className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search businesses…"
            className="w-full text-[13px] pl-9 pr-3 py-2 border border-portal-border-2 rounded-lg outline-none focus:border-[portal-blue] bg-white text-portal-text placeholder:text-portal-muted"
          />
          {/* preserve non-default filter state on search */}
          {statusFilter !== 'active' && <input type="hidden" name="status" value={statusFilter} />}
          {sort !== 'active' && <input type="hidden" name="sort" value={sort} />}
          {kindFilter !== 'advertiser' && <input type="hidden" name="kind" value={kindFilter} />}
        </form>

        {/* Sort toggle */}
        <div className="inline-flex rounded-lg border border-portal-border-2 overflow-hidden text-[12px] font-semibold">
          <a
            href={sortHref('active')}
            className={`px-3 py-1.5 ${sort === 'active' ? 'bg-[portal-navy] text-white' : 'bg-white text-portal-sub hover:bg-portal-bg'}`}
          >
            Sort: Active
          </a>
          <a
            href={sortHref('name')}
            className={`px-3 py-1.5 border-l border-portal-border-2 ${sort === 'name' ? 'bg-[portal-navy] text-white' : 'bg-white text-portal-sub hover:bg-portal-bg'}`}
          >
            Sort: Name A→Z
          </a>
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
        <div className="bg-white border-t border-portal-border px-6 py-3 flex items-center justify-between text-[12px] shrink-0">
          <span className="text-portal-sub">
            Page {page} of {totalPages} · {totalAdvertisers} businesses
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-portal-border-2 bg-white text-portal-sub hover:bg-portal-bg ${page === 1 ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronLeft size={12} /> Prev
            </Link>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-portal-border-2 bg-white text-portal-sub hover:bg-portal-bg ${page === totalPages ? 'opacity-40 pointer-events-none' : ''}`}
            >
              Next <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

