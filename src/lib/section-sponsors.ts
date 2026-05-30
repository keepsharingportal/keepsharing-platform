// Server-side helper for fetching the active section sponsor for a column.
//
// "Active" means: is_active = true AND today falls within [start_date, end_date].
// Returns null when no sponsor is active — components MUST render nothing in
// that case (no empty boxes, no placeholders).
//
// Used by the public article page, column landing page, and admin reporting.

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
}

// Per-request memoization — when both the mobile strip and desktop sidebar
// render on the same article page, they share one DB read.
export const getActiveSectionSponsor = cache(async (
  supabase:   SupabaseClient,
  columnSlug: string,
): Promise<SectionSponsor | null> => {
  if (!columnSlug) return null

  // ISO date for today — Supabase column is DATE so we compare YYYY-MM-DD.
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('column_sponsors')
    .select('*')
    .eq('column_slug', columnSlug)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date',   today)
    .order('start_date', { ascending: false })   // newest active wins if more than one
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as SectionSponsor
})
