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
}

interface GetActiveAdsOpts {
  rotate?: boolean
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

  const now = new Date().toISOString()

  const query = supabase
    .from('ad_placements')
    .select(`
      id, ad_image_url, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      rotation_weight, price_monthly,
      advertiser:advertiser_account_id (id, business_name, slug)
    `)
    .eq('placement_type', placementType)
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_priority', { ascending: false })

  if (contextSlug) {
    query.or(`context_slug.eq.${contextSlug},context_slug.is.null`)
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
    // Column doesn't exist yet (migration 093 not applied) — fall back to
    // the original simple query without the new columns.
    if (/column .* does not exist/i.test(error.message)) {
      return getActiveAdsLegacy(placementType, contextSlug, limit)
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
