// ── src/lib/queries/advertisers.ts ────────────────────────────────────────────
// Shared query helpers for advertiser_accounts.
// Centralizes lifecycle filtering, column selection, and ordering
// that were previously duplicated across 23+ admin pages.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdvertiserRow }  from '@/types/db'

// ── Column lists ──────────────────────────────────────────────────────────────

/** Columns for dashboard/intelligence views — lifecycle, flags, sponsor fields */
export const ADVERTISER_DASHBOARD_COLS = [
  'id', 'business_name', 'slug', 'package_tier',
  'lifecycle_stage', 'loyalty_tier',
  'upgrade_flagged_at', 'at_risk_flagged_at',
  'sponsor_category_slug', 'sponsor_guide_slug',
  'contract_start_date', 'contract_end_date',
  'created_at',
].join(', ')

/** Columns for the advertisers list page — adds contact info */
export const ADVERTISER_LIST_COLS = [
  'id', 'business_name', 'slug', 'package_tier',
  'lifecycle_stage', 'loyalty_tier',
  'upgrade_flagged_at', 'at_risk_flagged_at',
  'sponsor_category_slug',
  'contract_start_date', 'contract_end_date',
  'primary_contact_email', 'primary_contact_name',
  'website_url', 'onboarding_status',
  'created_at', 'updated_at',
].join(', ')

// ── Lifecycle groups ──────────────────────────────────────────────────────────

/** Lifecycle stages considered "active" — paying/engaged partners */
export const ACTIVE_LIFECYCLE_STAGES = [
  'active', 'renewal', 'upgrade-ready', 'sponsor-qualified',
] as const

/** Lifecycle stages in the revenue pipeline (pre-contract) */
export const PIPELINE_LIFECYCLE_STAGES = [
  'lead', 'consultation', 'proposal', 'onboarding',
] as const

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * All active advertisers for intelligence and revenue dashboards.
 * Returns accounts in active lifecycle stages, sorted by loyalty tier desc.
 */
export async function getActiveAdvertisers(
  db: SupabaseClient,
): Promise<AdvertiserRow[]> {
  const { data } = await db
    .from('advertiser_accounts')
    .select(ADVERTISER_DASHBOARD_COLS)
    .in('lifecycle_stage', [...ACTIVE_LIFECYCLE_STAGES])
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * All advertiser accounts (all lifecycle stages) for full-list admin views.
 */
export async function getAllAdvertisers(
  db: SupabaseClient,
): Promise<AdvertiserRow[]> {
  const { data } = await db
    .from('advertiser_accounts')
    .select(ADVERTISER_LIST_COLS)
    .order('business_name', { ascending: true })
    .limit(500)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * Advertisers flagged for tier upgrade.
 * Used by intelligence layer and revenue intelligence sections.
 */
export async function getUpgradeReadyAdvertisers(
  db: SupabaseClient,
): Promise<AdvertiserRow[]> {
  const { data } = await db
    .from('advertiser_accounts')
    .select(ADVERTISER_DASHBOARD_COLS)
    .or('lifecycle_stage.eq.upgrade-ready,upgrade_flagged_at.not.is.null')
    .order('upgrade_flagged_at', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * Advertisers flagged at-risk of churn or non-renewal.
 */
export async function getAtRiskAdvertisers(
  db: SupabaseClient,
): Promise<AdvertiserRow[]> {
  const { data } = await db
    .from('advertiser_accounts')
    .select(ADVERTISER_DASHBOARD_COLS)
    .not('at_risk_flagged_at', 'is', null)
    .order('at_risk_flagged_at', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * Active sponsors — accounts with a sponsor_category_slug or sponsor_guide_slug
 * in an active lifecycle stage. Used for sponsor gap analysis.
 */
export async function getActiveSponsors(
  db: SupabaseClient,
): Promise<AdvertiserRow[]> {
  const { data } = await db
    .from('advertiser_accounts')
    .select('id, business_name, sponsor_category_slug, sponsor_guide_slug, lifecycle_stage, package_tier')
    .in('lifecycle_stage', [...ACTIVE_LIFECYCLE_STAGES])
    .not('sponsor_category_slug', 'is', null)
    .limit(200)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * Advertisers with contracts renewing within `daysAhead` days.
 */
export async function getRenewingSoon(
  db: SupabaseClient,
  daysAhead = 60,
): Promise<AdvertiserRow[]> {
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10)
  const today  = new Date().toISOString().slice(0, 10)
  const { data } = await db
    .from('advertiser_accounts')
    .select(ADVERTISER_DASHBOARD_COLS)
    .gte('contract_end_date', today)
    .lte('contract_end_date', cutoff)
    .order('contract_end_date', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as AdvertiserRow[]
}

/**
 * Single advertiser by ID.
 */
export async function getAdvertiserById(
  db: SupabaseClient,
  id: string,
): Promise<AdvertiserRow | null> {
  const { data } = await db
    .from('advertiser_accounts')
    .select('*')
    .eq('id', id)
    .single()
  return (data ?? null) as unknown as AdvertiserRow | null
}

/**
 * Single advertiser by slug.
 */
export async function getAdvertiserBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<AdvertiserRow | null> {
  const { data } = await db
    .from('advertiser_accounts')
    .select('*')
    .eq('slug', slug)
    .single()
  return (data ?? null) as unknown as AdvertiserRow | null
}

/**
 * Build a Set of sponsored category slugs from a list of advertisers.
 * Utility for sponsor gap analysis — avoids re-querying.
 */
export function buildSponsoredCategorySet(advertisers: AdvertiserRow[]): Set<string> {
  return new Set(
    advertisers
      .filter(a => a.sponsor_category_slug)
      .map(a => a.sponsor_category_slug!)
  )
}
