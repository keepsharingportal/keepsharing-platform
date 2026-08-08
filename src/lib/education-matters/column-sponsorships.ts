// ── Column sponsorships — persistent-creative sponsor lookup ────────────
//
// One sponsor per column can be active for a date range. The layout
// picks the active sponsorship for the article's publish date and
// renders the strip + inline mention from that row. No per-article
// sponsor entry required — replaces the spotlight_data.sponsor_* path.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ColumnSponsorship {
  id:                    string
  column_slug:           string
  advertiser_account_id: string | null
  start_month:           string   // 'YYYY-MM-DD' — first of month
  end_month:             string   // 'YYYY-MM-DD' — last of month (inclusive)
  status:                'active' | 'ended' | 'pending'
  sponsor_name:          string
  sponsor_url:           string | null
  sponsor_tagline:       string | null
  sponsor_description:   string | null
  sponsor_logo_url:      string | null
  sponsor_image_url:     string | null
  sponsor_button_text:   string | null
  notes:                 string | null
  created_at:            string
  updated_at:            string
  // Joined shape used by the admin list view.
  advertiser?: { business_name: string; slug: string } | null
}

/** Active sponsorship for a column at a given date. `forDate` should be
 *  the article's publish date; drafts (no publish date) fall back to
 *  today so previews still render a sponsor when one is currently live. */
export async function getActiveSponsorship(
  supabase: SupabaseClient,
  columnSlug: string,
  forDate: Date | string | null,
): Promise<ColumnSponsorship | null> {
  const iso = normalizeDate(forDate)
  const { data, error } = await supabase
    .from('column_sponsorships')
    .select('*')
    .eq('column_slug', columnSlug)
    .eq('status', 'active')
    .lte('start_month', iso)
    .gte('end_month',   iso)
    .order('start_month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[column-sponsorships] getActiveSponsorship error:', error)
    return null
  }
  return (data ?? null) as ColumnSponsorship | null
}

/** All sponsorships (for the admin list). Joins the advertiser business
 *  name so the list can show WHO the sponsor is. */
export async function listSponsorships(
  supabase: SupabaseClient,
): Promise<ColumnSponsorship[]> {
  const { data, error } = await supabase
    .from('column_sponsorships')
    .select('*, advertiser:advertiser_accounts(business_name, slug)')
    .order('column_slug', { ascending: true })
    .order('start_month', { ascending: false })
  if (error) {
    console.error('[column-sponsorships] list error:', error)
    return []
  }
  return (data ?? []) as ColumnSponsorship[]
}

export async function getSponsorship(
  supabase: SupabaseClient,
  id: string,
): Promise<ColumnSponsorship | null> {
  const { data, error } = await supabase
    .from('column_sponsorships')
    .select('*, advertiser:advertiser_accounts(business_name, slug)')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[column-sponsorships] get error:', error)
    return null
  }
  return (data ?? null) as ColumnSponsorship | null
}

function normalizeDate(d: Date | string | null): string {
  if (!d) return new Date().toISOString().slice(0, 10)
  if (typeof d === 'string') return d.slice(0, 10)
  return d.toISOString().slice(0, 10)
}
