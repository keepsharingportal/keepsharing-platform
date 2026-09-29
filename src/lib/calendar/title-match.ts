// Title normalization + similarity — the pure half of duplicate detection.
//
// Split out of duplicates.ts so callers that only need to compare two strings
// don't transitively import @supabase/supabase-js. The display path (feed
// ranking, dedupe before render) has no business pulling a DB client into its
// module graph, and doing so also made these functions untestable outside a
// bundler.
//
// duplicates.ts re-exports both names, so every existing import keeps working.

// Words that don't help distinguish events. Stripped before similarity
// scoring so "The Annual Spring Fest" ≈ "Spring Fest".
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'at', 'in', 'on', 'for', 'with',
  'to', 'by', 'from', 'this', 'that', 'these', 'those', 'is', 'are',
  'annual', 'monthly', 'weekly', 'event', 'events',
])

/**
 * Normalize a title for comparison: lowercase, strip punctuation, drop
 * filler words, collapse whitespace. The result is a space-joined token
 * string suitable for Jaccard.
 */
export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // strip punctuation, keep letters/digits/whitespace
    .split(/\s+/)
    .filter(w => w.length > 0 && !FILLER_WORDS.has(w))
    .join(' ')
}

/**
 * Jaccard similarity on word sets. Returns 0..1 — 1 means identical word
 * sets, 0 means no overlap. We use this instead of full Levenshtein because
 * it's order-insensitive ("Library Storytime" ~= "Storytime at the Library")
 * and dramatically cheaper to compute over many candidates.
 */
export function titleSimilarity(a: string, b: string): number {
  const A = new Set(normalizeTitle(a).split(' ').filter(Boolean))
  const B = new Set(normalizeTitle(b).split(' ').filter(Boolean))
  if (A.size === 0 || B.size === 0) return 0
  let intersection = 0
  for (const w of A) if (B.has(w)) intersection++
  const union = A.size + B.size - intersection
  return union === 0 ? 0 : intersection / union
}
