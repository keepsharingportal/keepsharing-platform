// ── src/lib/queries/analytics.ts ─────────────────────────────────────────────
// Shared query helpers for analytics and tracking data.
// Canonical tracking tables: ad_placements (active), guide_listings (clicks).
// engagement_signals table is wired progressively — currently empty.
//
// NOTE: increment_listing_click RPC is missing from migrations.
// See stabilization plan migration 063. Until then, click counts on
// guide_listings will remain at 0 even when queries succeed.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient }  from '@supabase/supabase-js'
import type { AdPlacementRow }  from '@/types/db'

// ── Ad placement stats ────────────────────────────────────────────────────────

export interface AdPlacementStats {
  totalImpressions: number
  totalClicks:      number
  ctr:              number   // 0-100, percentage
  activePlacements: number
}

/**
 * Aggregate impression and click totals across all active ad placements.
 * Used by intelligence dashboard and the real ad analytics page (/admin/ads).
 */
export async function getAdPlacementStats(
  db: SupabaseClient,
): Promise<AdPlacementStats> {
  const { data } = await db
    .from('ad_placements')
    .select('id, impression_count, click_count, is_active')
    .eq('is_active', true)
    .limit(500)

  const rows = (data ?? []) as Array<{ impression_count: number; click_count: number }>
  const totalImpressions = rows.reduce((sum, r) => sum + (r.impression_count ?? 0), 0)
  const totalClicks      = rows.reduce((sum, r) => sum + (r.click_count ?? 0), 0)

  return {
    totalImpressions,
    totalClicks,
    ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
    activePlacements: rows.length,
  }
}

/**
 * Active ad placements with full metadata for the admin ad manager.
 */
export async function getActiveAdPlacements(
  db: SupabaseClient,
): Promise<AdPlacementRow[]> {
  const { data } = await db
    .from('ad_placements')
    .select('*')
    .eq('is_active', true)
    .order('impression_count', { ascending: false })
    .limit(200)
  return (data ?? []) as unknown as AdPlacementRow[]
}

// ── Listing click stats ───────────────────────────────────────────────────────

export interface ListingClickRow {
  id:                  string
  slug:                string
  business_name:       string
  click_count_phone:   number
  click_count_website: number
  advertiser_id:       string | null
}

/**
 * Guide listing click counts, sorted by total engagement.
 * NOTE: Counts remain 0 until migration 063 (increment_listing_click RPC) is applied.
 */
export async function getListingClickStats(
  db: SupabaseClient,
  guideSlugs?: string[],
): Promise<ListingClickRow[]> {
  let q = db
    .from('guide_listings')
    .select('id, slug, business_name, click_count_phone, click_count_website, advertiser_id')
    .eq('is_active', true)
    .order('click_count_phone', { ascending: false })
    .limit(200)

  if (guideSlugs && guideSlugs.length > 0) {
    q = q.in('guide_slug', guideSlugs)
  }

  const { data } = await q
  return (data ?? []) as unknown as ListingClickRow[]
}

// ── Newsletter subscriber counts ──────────────────────────────────────────────

export interface SubscriberCounts {
  total:             number
  byPublication:     Record<string, number>
  newLast24h:        number
  newLast7d:         number
}

/**
 * Newsletter subscriber counts, broken down by publication.
 * Returns list sizes only — no open rates (not tracked in this system).
 */
export async function getSubscriberCounts(
  db: SupabaseClient,
): Promise<SubscriberCounts> {
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data } = await db
    .from('newsletter_subscribers')
    .select('publication_slug, is_subscribed, created_at')
    .eq('is_subscribed', true)
    .limit(10000)

  const rows = (data ?? []) as Array<{ publication_slug: string; created_at: string }>
  const byPub: Record<string, number> = {}
  let newLast24h = 0
  let newLast7d  = 0

  for (const r of rows) {
    byPub[r.publication_slug] = (byPub[r.publication_slug] ?? 0) + 1
    if (r.created_at >= yesterday) newLast24h++
    if (r.created_at >= weekAgo)   newLast7d++
  }

  return {
    total: rows.length,
    byPublication: byPub,
    newLast24h,
    newLast7d,
  }
}

// ── Partner lead stats ────────────────────────────────────────────────────────

export interface PartnerLeadStats {
  last24h:       number
  last7d:        number
  conversionRate:number  // 0-100, percentage of converted leads
}

/**
 * Partner lead counts from the last 24h and 7 days.
 * Used by intelligence dashboard audience section.
 */
export async function getPartnerLeadStats(
  db: SupabaseClient,
): Promise<PartnerLeadStats> {
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data } = await db
    .from('partner_leads')
    .select('created_at, partner_marked_converted')
    .gte('created_at', weekAgo)
    .limit(500)

  const rows = (data ?? []) as Array<{ created_at: string; partner_marked_converted: boolean }>
  const last24h    = rows.filter(r => r.created_at >= yesterday).length
  const converted  = rows.filter(r => r.partner_marked_converted).length
  const rate       = rows.length > 0 ? Math.round((converted / rows.length) * 100) : 0

  return { last24h, last7d: rows.length, conversionRate: rate }
}
