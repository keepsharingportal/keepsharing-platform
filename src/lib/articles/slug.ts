// Article slug + URL helpers — single source of truth so every link
// across the site produces a consistent, URL-safe path. Before this,
// each component duplicated `/articles/${slug}` and assumed the slug
// was already clean. When the DB held a non-canonical slug (e.g., the
// admin form letting through a title with spaces and capitalization),
// the resulting URL was percent-encoded and brittle:
//
//   /articles/The%20Importance%20of%20Connecting%20with%20Your%20Community
//
// `slugifyForUrl` normalizes to:
//
//   /articles/the-importance-of-connecting-with-your-community
//
// `articleHref` is the canonical builder — column-routed when the
// article belongs to a column, otherwise the bare /articles/[slug].
//
// Use `findArticleSlugRow` on the detail-page query side to tolerate
// DB rows that haven't been migrated to clean slugs yet — it tries the
// raw URL slug first (the common case), then falls back to matching
// any row whose slugified form equals the URL slug.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Convert any text into a safe lowercase URL segment. Idempotent —
 *  calling it on an already-clean slug returns the same string. */
export function slugifyForUrl(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip everything that isn't safe
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse repeats
    .replace(/(^-|-$)/g, '')         // trim leading/trailing hyphens
    .slice(0, 80)
}

/** True if the slug is already canonical (calling slugifyForUrl is a no-op). */
export function isCanonicalSlug(slug: string): boolean {
  return slug === slugifyForUrl(slug)
}

/** Subset of an article needed to build its URL. */
export interface ArticleHrefInput {
  slug:         string | null | undefined
  title?:       string | null
  column_slug?: string | null
}

/** Canonical URL for any article. Column articles route to
 *  /columns/[column]/[slug] (with the column prefix stripped from the
 *  slug, matching existing convention). Everything else routes to
 *  /articles/[slug]. The slug is always slugified defensively. */
export function articleHref(article: ArticleHrefInput): string {
  // Slug source — prefer .slug, fall back to title-derived if slug is empty
  const rawSlug = article.slug?.trim() || article.title?.trim() || ''
  const safeSlug = slugifyForUrl(rawSlug)
  if (!safeSlug) return '/articles'  // last-resort, never blank

  const col = article.column_slug
  if (col && col !== 'feature' && col !== 'school-bits') {
    // Strip the column prefix from the slug if present — matches existing
    // routing convention used by /columns/[column]/[slug]
    const stripped = safeSlug.replace(new RegExp(`^${col}-`), '')
    return `/columns/${col}/${stripped}`
  }
  return `/articles/${safeSlug}`
}

/** Detail-page lookup that tolerates non-canonical slugs in the DB.
 *  Tries an exact match first (cheap, common case). If that misses,
 *  pulls the candidate set and finds the row whose slugified form
 *  matches the URL slug — handles legacy rows where slug contains
 *  spaces or capitals.
 *
 *  Returns the matched row or null. Caller can `.maybeSingle()`-style
 *  decide what to do with null.
 *
 *  cols — string of columns to SELECT (passed through to supabase) */
export async function findArticleBySlug<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  urlSlug: string,
  cols = '*',
): Promise<T | null> {
  // Try the literal slug first
  const literal = await supabase
    .from('guide_articles')
    .select(cols)
    .eq('slug', urlSlug)
    .eq('published', true)
    .maybeSingle()
  if (literal.data) return literal.data as unknown as T

  // Fallback — look for any published row whose slugified slug matches.
  // We can't push slugify into Postgres without a stored generated
  // column, so do it in JS over a small candidate set. ILIKE narrows
  // the search space when the bad slug roughly matches the URL.
  const wildcard = urlSlug.replace(/-/g, '%')
  const candidates = await supabase
    .from('guide_articles')
    .select(cols)
    .eq('published', true)
    .ilike('slug', `%${wildcard}%`)
    .limit(50)
  for (const row of (candidates.data ?? []) as Array<{ slug?: string | null }>) {
    if (row.slug && slugifyForUrl(row.slug) === urlSlug) {
      return row as unknown as T
    }
  }
  return null
}
