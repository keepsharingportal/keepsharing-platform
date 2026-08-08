// Server-side helper for fetching the active section sponsor for a column.
//
// "Active" means: is_active = true AND now() falls within [starts_at, ends_at].
// Returns null when no sponsor is active — components MUST render nothing in
// that case (no empty boxes, no placeholders).
//
// Sourced from ad_placements (placement_type='section_sponsor', context_slug=column)
// since migration 122. The SectionSponsor shape is preserved so existing
// render components (SectionSponsorMobile/Sidebar/Outro/Banner) don't need
// to change — we map the ad_placements row back to the legacy shape.

import type { SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'

export interface SectionSponsor {
  id:              string
  column_slug:     string
  advertiser_id:   string | null
  sponsor_label:   string
  sponsor_name:    string
  sponsor_message: string | null
  logo_url:        string | null
  cta_label:       string
  cta_url:         string | null
  accent_color:    string | null
  start_date:      string
  end_date:        string
  /** Longer paragraph beneath the tagline. Only used by richer sponsor
   *  layouts (Education Matters); the standard SectionSponsorMobile/
   *  Sidebar/Outro/Banner components ignore it, so populating it on
   *  other columns is harmless. Sourced from ad_placements.ad_description. */
  description:     string | null
  /** Optional hero image (photo) beside/below the logo — again only
   *  read by richer layouts. Sourced from ad_placements.ad_image_url. */
  image_url:       string | null
}

// Per-request memoization — when both the mobile strip and desktop sidebar
// render on the same article page, they share one DB read.
export const getActiveSectionSponsor = cache(async (
  supabase:   SupabaseClient,
  columnSlug: string,
): Promise<SectionSponsor | null> => {
  if (!columnSlug) return null

  const nowIso = new Date().toISOString()

  // Newest active sponsor wins if more than one is configured for the
  // column. starts_at/ends_at are timestamptz; we compare against now().
  const { data, error } = await supabase
    .from('ad_placements')
    .select('id, context_slug, advertiser_account_id, ad_eyebrow, ad_headline, ad_description, ad_link, ad_cta_label, ad_image_url, logo_url, sponsor_tagline, accent_color, starts_at, ends_at')
    .eq('placement_type', 'section_sponsor')
    .eq('context_slug',   columnSlug)
    .eq('is_active',      true)
    .lte('starts_at', nowIso)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  // Map ad_placements back to the SectionSponsor shape that the render
  // components expect. Keeps the public render code unchanged.
  const r = data as {
    id: string; context_slug: string | null; advertiser_account_id: string | null;
    ad_eyebrow: string | null; ad_headline: string | null; ad_description: string | null;
    ad_link: string | null; ad_cta_label: string | null; ad_image_url: string | null;
    logo_url: string | null; sponsor_tagline: string | null;
    accent_color: string | null; starts_at: string | null; ends_at: string | null
  }
  return {
    id:              r.id,
    column_slug:     r.context_slug ?? columnSlug,
    advertiser_id:   r.advertiser_account_id,
    sponsor_label:   r.ad_eyebrow ?? 'Sponsored by',
    sponsor_name:    r.ad_headline ?? '',
    sponsor_message: r.sponsor_tagline,
    logo_url:        r.logo_url,
    cta_label:       r.ad_cta_label ?? 'Learn More',
    cta_url:         r.ad_link,
    accent_color:    r.accent_color,
    start_date:      (r.starts_at ?? '').slice(0, 10),
    end_date:        (r.ends_at   ?? '').slice(0, 10),
    description:     r.ad_description,
    image_url:       r.ad_image_url,
  }
})
