// Slugs for school bits.
//
// Kept here rather than inlined at the call site because three places need to
// agree on the answer: the backfill, the approval path that slugs new bits, and
// any admin tooling that wants to predict a URL before saving.

import { normalizeUnicodeText } from './text'

/** Longest slug we'll emit. Titles run to 80+ characters and the tail adds
 *  nothing a reader or a search engine uses. Cut on a word boundary. */
const MAX_LEN = 70

export function slugifyBitTitle(title: string): string {
  const base = normalizeUnicodeText(title ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    // Strip apostrophes rather than turning them into separators, so
    // "School's" becomes "schools" not "school-s".
    .replace(/['’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (base.length <= MAX_LEN) return base
  const cut = base.slice(0, MAX_LEN)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash > 30 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '')
}

/**
 * Make a slug unique against slugs already taken.
 *
 * Two schools genuinely do run "Spring Concert" stories, so collisions are
 * expected rather than exceptional. Disambiguates with the school name first
 * — which is meaningful to a reader — and only falls back to a counter when
 * that still isn't enough.
 */
export function uniqueBitSlug(
  title: string,
  schoolName: string | null | undefined,
  taken: Set<string>,
): string {
  const base = slugifyBitTitle(title) || 'school-bit'
  if (!taken.has(base)) return base

  const school = slugifyBitTitle(schoolName ?? '')
  if (school) {
    const withSchool = `${base}-${school}`.slice(0, 110).replace(/-+$/, '')
    if (!taken.has(withSchool)) return withSchool
  }

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  // Practically unreachable; better than returning a duplicate.
  return `${base}-${Date.now()}`
}
