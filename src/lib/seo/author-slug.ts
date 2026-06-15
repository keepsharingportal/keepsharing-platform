// ── Author slug helpers ─────────────────────────────────────────────────────
//
// guide_articles.author_name is free-text. We derive a stable slug from
// the name so authors get their own canonical URL — required for both
// Person JSON-LD attribution AND for E-E-A-T-driving "all stories by
// this writer" pages.
//
// Slug rules: lowercase, ASCII-only, hyphenated, max 80 chars. Drops
// honorifics + initials so "Dr. Jane M. Smith" → "jane-smith".

const HONORIFIC = /^(dr|mr|mrs|ms|prof|rev|sr|jr|capt)\.?$/i

export function authorNameToSlug(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = name.trim()
  if (!cleaned) return null
  const parts = cleaned
    .split(/\s+/)
    .filter(p => !HONORIFIC.test(p.replace(/[.,]/g, '')))
    .map(p => p.replace(/[^A-Za-z]/g, ''))     // strip middle initials/punctuation
    .filter(p => p.length > 1)                 // drop single-letter remnants
  if (parts.length === 0) return null
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || null
}

/** Best-effort recovery — given a slug like "jane-smith", reconstruct a
 *  display name like "Jane Smith". Used when we render an author page
 *  before any article has been clicked through. */
export function slugToAuthorTitleCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
