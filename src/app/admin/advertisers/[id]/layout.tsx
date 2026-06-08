// Shared layout for the per-advertiser CRM view. Holds the sticky
// header (business name, tier, lifecycle badges, public link, primary
// action) and the tab strip across:
//   /admin/advertisers/[id]            — Overview
//   /admin/advertisers/[id]/ads        — Ad Placements (digital + print + QR + slots)
//   /admin/advertisers/[id]/listings   — Guide Listings
//   /admin/advertisers/[id]/analytics  — Analytics + monthly reports
//   /admin/advertisers/[id]/proposals  — Proposals + Agreements
//
// Tab counts are computed here once so the strip always shows current
// state. Each child route loads only its own data.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import {
  ArrowLeft, Building2, ExternalLink, Plus, Star, RotateCw,
} from 'lucide-react'
import { AdvertiserTabStrip } from './AdvertiserTabStrip'

const TIER_LABEL: Record<string, string> = {
  'tier-1-found':    'Tier 1 — Found',
  'tier-2-featured': 'Tier 2 — Featured',
  'tier-3-chosen':   'Tier 3 — Chosen',
  'tier-4-won':      'Tier 4 — Won',
}
const TIER_BADGE: Record<string, string> = {
  'tier-1-found':    'bg-gray-100 text-gray-700 ring-gray-200',
  'tier-2-featured': 'bg-sky-100 text-sky-800 ring-sky-200',
  'tier-3-chosen':   'bg-violet-100 text-violet-800 ring-violet-200',
  'tier-4-won':      'bg-amber-100 text-amber-800 ring-amber-200',
}
const LIFECYCLE_BADGE: Record<string, string> = {
  'active':      'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'onboarding':  'bg-sky-100 text-sky-800 ring-sky-200',
  'lead':        'bg-gray-100 text-gray-700 ring-gray-200',
  'renewal':     'bg-amber-100 text-amber-800 ring-amber-200',
  'dormant':     'bg-rose-100 text-rose-700 ring-rose-200',
}

interface Props {
  children: React.ReactNode
  params:   Promise<{ id: string }>
}

export default async function AdvertiserLayout({ children, params }: Props) {
  await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()

  // Single fetch for the masthead. Each tab refetches whatever else
  // it needs — the row itself is small enough that the redundant
  // hit isn't worth dedupe gymnastics.
  const { data: acct, error } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, package_tier, lifecycle_stage, loyalty_tier, logo_url')
    .eq('id', id)
    .maybeSingle()
  if (error || !acct) return notFound()

  // Tab counts — small parallel queries so the strip always reflects
  // current state. Count-only heads use head:true to skip rows.
  const [adsCountRes, printCountRes, listingsCountRes, proposalsFkRes, proposalsNameRes] = await Promise.all([
    supabase.from('ad_placements')        .select('id', { count: 'exact', head: true }).eq('advertiser_account_id', id),
    supabase.from('print_ad_placements')  .select('id', { count: 'exact', head: true }).eq('advertiser_account_id', id),
    supabase.from('guide_listings')       .select('id', { count: 'exact', head: true }).eq('advertiser_account_id', id),
    supabase.from('proposals')            .select('id', { count: 'exact', head: true }).eq('advertiser_account_id', id),
    supabase.from('proposals')            .select('id', { count: 'exact', head: true }).ilike('business_name', acct.business_name),
  ])
  // Print count rolls into the Ads tab badge so the editor sees the
  // combined 'placements that need attention' total. Print errors
  // (migration 129 not applied) silently contribute 0.
  const adsCount       = ((adsCountRes.count ?? 0)) + (printCountRes.error ? 0 : (printCountRes.count ?? 0))
  const listingsCount  = listingsCountRes.error ? 0 : (listingsCountRes.count ?? 0)
  // Pre-migration 132: FK column doesn't exist, fall back to name match.
  const proposalsCount = proposalsFkRes.error
    ? (proposalsNameRes.error ? 0 : (proposalsNameRes.count ?? 0))
    : (proposalsFkRes.count ?? 0)

  const a = acct as Record<string, unknown>
  const name        = String(a.business_name ?? 'Unknown')
  const slug        = String(a.slug ?? '')
  const tier        = String(a.package_tier ?? '')
  const lifecycle   = String(a.lifecycle_stage ?? 'active')
  const loyaltyTier = a.loyalty_tier ? String(a.loyalty_tier) : null
  const logoUrl     = a.logo_url ? String(a.logo_url) : null

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Sticky header + tabs ─────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <Link href="/admin/advertisers" className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={12} /> All Businesses
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover ring-1 ring-gray-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-gray-300" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{name}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {tier && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-1 ${TIER_BADGE[tier] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                      {TIER_LABEL[tier] ?? tier}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-1 ${LIFECYCLE_BADGE[lifecycle] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                    {lifecycle}
                  </span>
                  {loyaltyTier && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                      <Star size={8} className="inline mr-0.5" />{loyaltyTier}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {slug && (
                <Link
                  href={`/partners/${slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <ExternalLink size={12} /> Public Page
                </Link>
              )}
              <Link
                href={`/admin/ads/new?advertiser_id=${id}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90"
              >
                <Plus size={14} /> Assign to Slot
              </Link>
            </div>
          </div>
        </div>

        <AdvertiserTabStrip
          id={id}
          counts={{ ads: adsCount, listings: listingsCount, proposals: proposalsCount }}
        />
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  )
}

// Suppress unused-import lint when icons are referenced only in
// constants above. (TS sees them as live values; ESLint sometimes
// doesn't.)
void RotateCw
