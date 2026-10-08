// getActiveAds — the single query entrypoint for ad placements.
//
// Two modes:
//
//   1. LOCKED (default): returns the top N placements by display_priority.
//      Use for hero sponsors, section sponsors, newsletter sponsors — any
//      slot where one advertiser owns it.
//
//   2. ROTATION (rotate=true): weighted-random selection from all active
//      placements matching the query. Weight comes from the placement's
//      rotation_weight column (which maps to the advertiser's package
//      tier). Higher tier = proportionally more impressions.
//
//      Example: 4 advertisers in the pool with weights 4, 3, 2, 1. Total
//      weight = 10. Tier 4 gets 40% of impressions, Tier 1 gets 10%.
//
// Both modes respect: is_active, starts_at / ends_at date windows, and
// the context_slug filter (null context matches all).
//
// Used by every public page that renders ads — the caller never touches
// the ad_placements table directly.

import { createClient } from '@supabase/supabase-js'
import { currentBrandSlug } from './current-brand'

export interface ActiveAd {
  id:               string
  ad_image_url?:    string | null
  ad_eyebrow?:      string | null
  ad_headline?:     string | null
  ad_description?:  string | null
  ad_cta_label?:    string | null
  ad_link?:         string | null
  advertiser_id?:   string | null
  advertiser_name?: string | null
  advertiser_slug?: string | null
  rotation_weight?: number
  price_monthly?:   number | null
  /** Creative format from migration 125. Render branches on this. */
  creative_mode?:   'composed' | 'image' | null
}

interface GetActiveAdsOpts {
  rotate?: boolean
  /**
   * Brand slug to serve ads for. Omit on a public page — the brand is read
   * from the request automatically, which is the whole point: an ad server
   * that can silently serve the wrong market's inventory because one caller
   * forgot an argument is a billing problem, not a rendering one.
   *
   * Pass it explicitly only where there IS no request brand: the newsletter
   * renderer, a cron job, an admin preview of another brand.
   */
  market?: string | null
}

export async function getActiveAds(
  placementType: string,
  contextSlug?: string | null,
  limit = 1,
  opts?: GetActiveAdsOpts,
): Promise<ActiveAd[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Resolve the serving brand. An explicit opts.market wins; otherwise the
  // request's brand; outside a request (build, cron) we get null and fall
  // through to house ads only.
  const market = opts?.market !== undefined ? opts.market : await currentBrandSlug()

  // Site-wide / per-context slot disable (migration 107). The Slot Map
  // admin page lets editors flip a switch to hide a slot entirely even
  // when there are live bookings. Two layers of disable:
  //   1. Site-wide disable (context_slug IS NULL) for this placement_type
  //   2. Context-specific disable matching the requested contextSlug
  // Either match → short-circuit to empty. Falls through silently if the
  // table doesn't exist yet (migration not applied).
  const disableQuery = supabase
    .from('ad_slot_settings')
    .select('context_slug, disabled')
    .eq('placement_type', placementType)
    .eq('disabled', true)
  const { data: disableRows, error: disableErr } = await disableQuery
  if (!disableErr && disableRows && disableRows.length > 0) {
    const hasSiteWide = disableRows.some(r => r.context_slug === null)
    if (hasSiteWide) return []
    if (contextSlug) {
      const hasContext = disableRows.some(r => r.context_slug === contextSlug)
      if (hasContext) return []
    }
  }

  const now = new Date().toISOString()

  const query = supabase
    .from('ad_placements')
    .select(`
      id, ad_image_url, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      rotation_weight, price_monthly, creative_mode,
      advertiser:advertiser_account_id (id, business_name, slug)
    `)
    .eq('placement_type', placementType)
    .eq('is_active', true)
    .is('archived_at', null)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_priority', { ascending: false })

  if (contextSlug) {
    query.or(`context_slug.eq.${contextSlug},context_slug.is.null`)
  }

  // ── Market scoping ────────────────────────────────────────────────────
  // A placement serves its own brand, plus NULL-market house ads (our own
  // "advertise with us" filler), which every brand shows. A brand with no
  // inventory sold yet therefore renders house ads rather than another
  // market's advertisers — which is the state every new brand launches in.
  //
  // market === null means we couldn't resolve a brand at all (build-time
  // render, cron). House ads only: showing nobody is recoverable, showing
  // the wrong market's advertiser is not.
  if (market) {
    query.or(`market.eq.${market},market.is.null`)
  } else {
    query.is('market', null)
  }

  // For rotation we need ALL active candidates, then pick from them
  // weighted-randomly in JS. For locked, the DB's priority ordering is
  // enough — just limit.
  if (opts?.rotate) {
    query.limit(100) // reasonable cap on pool size
  } else {
    query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    // `market` arrives with migration 232. Until it is applied, every brand
    // shares one pool — which is the behaviour that existed before this
    // change, and the only brand with inventory is River Region, so it is
    // safe. Pass market=undefined to the legacy path to drop the filter
    // rather than returning nothing and blanking every ad slot on the site.
    if (/column .*market.* does not exist/i.test(error.message)) {
      return getActiveAdsLegacy(placementType, contextSlug, limit, undefined)
    }
    // Column doesn't exist yet (migration 093 not applied) — fall back to
    // the original simple query without the new columns.
    if (/column .* does not exist/i.test(error.message)) {
      return getActiveAdsLegacy(placementType, contextSlug, limit, market)
    }
    return []
  }

  if (!data || data.length === 0) return []

  const mapped = data.map((row) => {
    const advertiser = row.advertiser as unknown as { id: string; business_name: string; slug: string } | null
    return {
      id:               row.id,
      ad_image_url:     row.ad_image_url,
      ad_eyebrow:       row.ad_eyebrow,
      ad_headline:      row.ad_headline,
      ad_description:   row.ad_description,
      ad_cta_label:     row.ad_cta_label,
      ad_link:          row.ad_link,
      advertiser_id:    advertiser?.id ?? null,
      advertiser_name:  advertiser?.business_name ?? null,
      advertiser_slug:  advertiser?.slug ?? null,
      rotation_weight:  typeof row.rotation_weight === 'number' ? row.rotation_weight : 1,
      price_monthly:    typeof row.price_monthly === 'number' ? row.price_monthly : null,
      creative_mode:    (row.creative_mode as 'composed' | 'image' | null | undefined) ?? 'composed',
    }
  })

  // Locked mode — already sorted by priority from the DB
  if (!opts?.rotate) return mapped.slice(0, limit)

  // Rotation mode — weighted random selection
  return weightedRandomPick(mapped, limit)
}

// Weighted random without replacement. Picks `n` items from the pool where
// each item's probability of selection is proportional to its weight.
function weightedRandomPick(pool: ActiveAd[], n: number): ActiveAd[] {
  if (pool.length <= n) return pool

  const remaining = [...pool]
  const picks: ActiveAd[] = []

  for (let i = 0; i < n && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, ad) => s + (ad.rotation_weight ?? 1), 0)
    let r = Math.random() * totalWeight
    let picked = remaining.length - 1 // fallback to last

    for (let j = 0; j < remaining.length; j++) {
      r -= (remaining[j].rotation_weight ?? 1)
      if (r <= 0) { picked = j; break }
    }

    picks.push(remaining[picked])
    remaining.splice(picked, 1)
  }

  return picks
}

// Legacy fallback for databases where migration 093 hasn't been applied yet.
// Identical to the original getActiveAds — no rotation_weight or pricing.
async function getActiveAdsLegacy(
  placementType: string,
  contextSlug?: string | null,
  limit = 1,
  market?: string | null,
): Promise<ActiveAd[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const now = new Date().toISOString()

  const query = supabase
    .from('ad_placements')
    .select(`
      id, ad_image_url, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      advertiser:advertiser_account_id (id, business_name, slug)
    `)
    .eq('placement_type', placementType)
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_priority', { ascending: false })
    .limit(limit)

  if (contextSlug) {
    query.or(`context_slug.eq.${contextSlug},context_slug.is.null`)
  }
  // Same market rule as the main query — see there for why NULL is house-wide.
  // Three states, not two: `undefined` means the column itself is absent
  // (migration 232 not applied) so there is nothing to filter on; `null`
  // means we have the column but no resolvable brand, so house ads only.
  if (market === undefined) {
    // no filter
  } else if (market) {
    query.or(`market.eq.${market},market.is.null`)
  } else {
    query.is('market', null)
  }

  const { data } = await query
  if (!data) return []

  return data.map((row) => {
    const advertiser = row.advertiser as unknown as { id: string; business_name: string; slug: string } | null
    return {
      id:               row.id,
      ad_image_url:     row.ad_image_url,
      ad_eyebrow:       row.ad_eyebrow,
      ad_headline:      row.ad_headline,
      ad_description:   row.ad_description,
      ad_cta_label:     row.ad_cta_label,
      ad_link:          row.ad_link,
      advertiser_id:    advertiser?.id ?? null,
      advertiser_name:  advertiser?.business_name ?? null,
      advertiser_slug:  advertiser?.slug ?? null,
    }
  })
}
