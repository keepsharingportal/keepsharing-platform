// Helpers shared by the school typeahead + add form.
//
// toTitleCase normalizes user input into "School Name Style" — capitalizes
// each word, preserves all-caps acronyms (LAMP, BTW, MPS), and lowercases
// stopwords (of, the, and, …) when they aren't the first word.
//
// findNearDuplicates does a Levenshtein search against an existing roster
// so a user typing "Eastchace Elementary" gets nudged toward the real
// "Eastchase Elementary" before they create a duplicate.

const SMALL_WORDS = new Set([
  'of', 'the', 'and', 'in', 'on', 'at', 'for', 'to', 'a', 'an', 'or', 'by', 'vs',
])

// Words like "St.", "Mt.", "Dr." should be capitalized regardless of position
const ABBREVIATIONS = new Set(['st', 'st.', 'mt', 'mt.', 'dr', 'dr.', 'jr', 'jr.', 'sr', 'sr.'])

export function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      // Preserve all-caps acronyms 2-6 chars (LAMP, BTW, JROTC, STEM, MPS)
      if (/^[A-Z]{2,6}$/.test(word)) return word

      const lower = word.toLowerCase()

      // Abbreviations always capitalize, regardless of position
      if (ABBREVIATIONS.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1)
      }

      // Stopwords stay lowercase unless they're the first word
      if (i > 0 && SMALL_WORDS.has(lower)) return lower

      // Default: cap first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    // Collapse multiple spaces that might have crept in
    .replace(/\s+/g, ' ')
}

// Levenshtein edit distance — for catching typos before they become dupes.
// Limited to small inputs (school names ≤ 60 chars), so the O(m·n) cost
// is negligible.
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // Single-row DP — O(min(m, n)) memory
  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,         // deletion
        curr[j - 1] + 1,     // insertion
        prev[j - 1] + cost,  // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

export interface NearMatch<T> {
  item:     T
  distance: number
}

// Returns up to `limit` near-matches with edit distance ≤ maxDistance,
// sorted closest-first. Comparison is case-insensitive.
export function findNearDuplicates<T extends { name: string }>(
  needle: string,
  haystack: T[],
  opts: { maxDistance?: number; limit?: number } = {},
): NearMatch<T>[] {
  const maxDistance = opts.maxDistance ?? 2
  const limit       = opts.limit       ?? 3
  const target      = needle.trim().toLowerCase()
  if (target.length === 0) return []

  const matches: NearMatch<T>[] = []
  for (const item of haystack) {
    const itemLower = item.name.toLowerCase()
    // Exact case-insensitive match short-circuits to distance 0
    if (itemLower === target) {
      matches.push({ item, distance: 0 })
      continue
    }
    // Length filter — if names differ in length by more than maxDistance,
    // their edit distance is at least that, so skip the full computation
    if (Math.abs(itemLower.length - target.length) > maxDistance) continue
    const d = editDistance(target, itemLower)
    if (d <= maxDistance) matches.push({ item, distance: d })
  }
  return matches.sort((a, b) => a.distance - b.distance).slice(0, limit)
}
