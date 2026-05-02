import { createClient } from '@supabase/supabase-js'

export interface ActiveAd {
  id: string
  ad_image_url?: string | null
  ad_eyebrow?: string | null
  ad_headline?: string | null
  ad_description?: string | null
  ad_cta_label?: string | null
  ad_link?: string | null
  advertiser_id?: string | null
  advertiser_name?: string | null
  advertiser_slug?: string | null
}

export async function getActiveAds(
  placementType: string,
  contextSlug?: string | null,
  limit = 1,
): Promise<ActiveAd[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const now = new Date().toISOString()

  // Try direct query (more reliable than RPC during initial setup)
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
