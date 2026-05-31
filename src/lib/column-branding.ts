// Server-side helper for fetching per-column editorial branding (logo
// + tagline) overrides. Returns null when no override has been set;
// public renders fall back to column-brand.ts defaults.
//
// Memoized per request so multiple components on the same article page
// share a single DB read.

import type { SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'

export interface ColumnBranding {
  column_slug: string
  logo_url:    string | null
  tagline:     string | null
}

export const getColumnBranding = cache(async (
  supabase:   SupabaseClient,
  columnSlug: string,
): Promise<ColumnBranding | null> => {
  if (!columnSlug) return null
  const { data, error } = await supabase
    .from('column_branding')
    .select('column_slug, logo_url, tagline')
    .eq('column_slug', columnSlug)
    .maybeSingle()
  if (error || !data) return null
  return data as ColumnBranding
})
