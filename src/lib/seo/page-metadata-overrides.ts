// ── Per-page metadata override resolver ──────────────────────────────
//
// Loads any saved override for a given route path + brand and applies
// it on top of the page's coded metadata. Read by buildPageMetadata().
//
// Lookup precedence:
//   1. Exact brand-scoped match (route_path = X AND brand_slug = current)
//   2. Global match (route_path = X AND brand_slug IS NULL)
//   3. No override — return null
//
// Cached in memory for the duration of the request via React cache().

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

export interface PageMetadataOverride {
  ogTitle:            string | null
  ogDescription:      string | null
  ogImageUrl:         string | null
  twitterCardType:    'summary' | 'summary_large_image' | 'app' | 'player' | null
  twitterTitle:       string | null
  twitterDescription: string | null
  twitterImageUrl:    string | null
  pinterestImageUrl:  string | null
  pinterestDescription: string | null
  noindex:            boolean
  canonicalOverride:  string | null
}

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface RawRow {
  route_path:           string
  brand_slug:           string | null
  og_title:             string | null
  og_description:       string | null
  og_image_url:         string | null
  twitter_card_type:    string | null
  twitter_title:        string | null
  twitter_description:  string | null
  twitter_image_url:    string | null
  pinterest_image_url:  string | null
  pinterest_description: string | null
  noindex:              boolean
  canonical_override:   string | null
}

/** Returns the override for routePath + brandSlug, or null. Brand-scoped
 *  override wins over global; both fall back to null if neither exists. */
export const loadPageMetadataOverride = cache(async (
  routePath: string,
  brandSlug: string | null,
): Promise<PageMetadataOverride | null> => {
  // Normalize the path — strip trailing slash, lowercase.
  const path = routePath.replace(/\/$/, '').toLowerCase()
  if (!path) return null

  try {
    const sb = sbAdmin()
    let q = sb
      .from('page_metadata_overrides')
      .select('route_path, brand_slug, og_title, og_description, og_image_url, twitter_card_type, twitter_title, twitter_description, twitter_image_url, pinterest_image_url, pinterest_description, noindex, canonical_override')
      .ilike('route_path', path)

    if (brandSlug) {
      q = q.or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
    } else {
      q = q.is('brand_slug', null)
    }

    const { data } = await q.limit(2)
    const rows = (data ?? []) as RawRow[]
    if (rows.length === 0) return null

    // Prefer brand-scoped match if both global and scoped exist.
    const winner = rows.find(r => r.brand_slug === brandSlug) ?? rows[0]

    return {
      ogTitle:              winner.og_title,
      ogDescription:        winner.og_description,
      ogImageUrl:           winner.og_image_url,
      twitterCardType:      (winner.twitter_card_type as PageMetadataOverride['twitterCardType']) ?? null,
      twitterTitle:         winner.twitter_title,
      twitterDescription:   winner.twitter_description,
      twitterImageUrl:      winner.twitter_image_url,
      pinterestImageUrl:    winner.pinterest_image_url,
      pinterestDescription: winner.pinterest_description,
      noindex:              !!winner.noindex,
      canonicalOverride:    winner.canonical_override,
    }
  } catch {
    // Table missing (migration 191 not yet run) or other DB error — degrade
    // gracefully. Coded defaults still work.
    return null
  }
})

/** Returns all overrides for the admin index page. Single read, no
 *  filtering — admin UI handles the search/sort. */
export async function listAllPageMetadataOverrides(): Promise<Array<RawRow & { id: string; last_edited_at: string }>> {
  try {
    const sb = sbAdmin()
    const { data } = await sb
      .from('page_metadata_overrides')
      .select('*')
      .order('route_path', { ascending: true })
    return (data ?? []) as Array<RawRow & { id: string; last_edited_at: string }>
  } catch {
    return []
  }
}
