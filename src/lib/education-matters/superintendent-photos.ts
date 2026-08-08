// ── Superintendent photos batch loader ────────────────────────────────
//
// Loads all four district superintendents' seo_authors rows in a single
// query and returns a lookup keyed by column_slug. Used by any page
// that renders multiple Education Matters cards (homepage Latest
// Stories, district hub) so the shared ArticleCard can put the real
// superintendent's face on branded EM cards instead of just a logo.
//
// Single DB round-trip; the map is trivially small (4 entries) so
// it's cheap to pass down through Server Components as a prop.

import type { SupabaseClient } from '@supabase/supabase-js'
import { EDUCATION_DISTRICTS } from './districts'

export interface SuperintendentPhotoEntry {
  displayName: string
  jobTitle:    string | null
  photoUrl:    string | null
}

/** Map<column_slug, entry>. Missing entries are simply absent (the
 *  card gracefully falls back to logo → typography). */
export type SuperintendentPhotoMap = Record<string, SuperintendentPhotoEntry>

export async function loadSuperintendentPhotos(
  sb: SupabaseClient,
): Promise<SuperintendentPhotoMap> {
  const authorSlugs = EDUCATION_DISTRICTS.map(d => d.superintendent.authorSlug)
  if (authorSlugs.length === 0) return {}

  const { data, error } = await sb
    .from('seo_authors')
    .select('author_slug, display_name, job_title, headshot_url')
    .in('author_slug', authorSlugs)

  if (error || !data) return {}

  const bySlug: Record<string, { displayName: string; jobTitle: string | null; photoUrl: string | null }> = {}
  for (const row of data as Array<{ author_slug: string; display_name: string | null; job_title: string | null; headshot_url: string | null }>) {
    bySlug[row.author_slug] = {
      displayName: row.display_name?.trim() || '',
      jobTitle:    row.job_title?.trim() || null,
      photoUrl:    row.headshot_url?.trim() || null,
    }
  }

  // Map from column slug (what the card knows) → superintendent entry.
  const out: SuperintendentPhotoMap = {}
  for (const d of EDUCATION_DISTRICTS) {
    const entry = bySlug[d.superintendent.authorSlug]
    if (entry) out[d.slug] = entry
  }
  return out
}
