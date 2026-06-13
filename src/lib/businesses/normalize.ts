// Shared business-name normalization + similarity scoring. Same algorithm
// the ad-match diagnostic uses (token-set Jaccard with synonyms + subset
// boost + first-token boost) — extracted here so the backfill, the
// admin merge tool, and the ad-match page all use the same rules.

const STOP_WORDS = new Set(['the', 'of', 'and', '&'])
const SYNONYMS: Record<string, string> = {
  'st':         'saint',
  'st.':        'saint',
  'blvd':       'boulevard',
  'blvd.':      'boulevard',
  'rd':         'road',
  'rd.':        'road',
  'dr':         'doctor',
  'dr.':        'doctor',
  'co':         'company',
  'co.':        'company',
  'corp':       'corporation',
  'corp.':      'corporation',
  'inc':        '',
  'inc.':       '',
  'llc':        '',
  'llc.':       '',
  'l.l.c.':     '',
  'incorporated': '',
  'jr':         'junior',
  'jr.':        'junior',
  'sr':         'senior',
  'sr.':        'senior',
}

export function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .split(/\s+/)
    .map(t => {
      const trimmed = t.replace(/\.$/, '')
      if (trimmed in SYNONYMS) return SYNONYMS[trimmed]
      return SYNONYMS[t] ?? t
    })
    .filter(t => t && !STOP_WORDS.has(t))
}

/** Lowercase + punctuation-stripped string used for indexing. Idempotent. */
export function normalizedName(name: string): string {
  return tokens(name).join(' ')
}

/** Token-set Jaccard + subset + first-token boosts. Returns 0..1. */
export function similarity(a: string, b: string): number {
  const aTokens = tokens(a)
  const bTokens = tokens(b)
  const at = new Set(aTokens)
  const bt = new Set(bTokens)
  if (at.size === 0 || bt.size === 0) return 0
  let inter = 0
  for (const t of at) if (bt.has(t)) inter++
  const union = at.size + bt.size - inter
  let score  = inter / union

  // Subset boost — every token of the smaller set present in the larger.
  const smaller = at.size <= bt.size ? at : bt
  const larger  = at.size >  bt.size ? at : bt
  let subset = true
  for (const t of smaller) if (!larger.has(t)) { subset = false; break }
  if (subset) score = Math.min(1, score + 0.15)

  // First-token boost — names typically lead with the brand.
  if (aTokens.length > 0 && bTokens.length > 0 && aTokens[0] === bTokens[0]) {
    score = Math.min(1, score + 0.05)
  }

  return score
}

/** Address similarity — looser than name. Compares normalized street numbers
 *  and street-name tokens. Returns 0..1. Used as a tiebreaker when names
 *  alone are ambiguous (e.g. multiple "Adams Drugs" at different addresses). */
export function addressSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0
  const aNorm = normalizedName(a)
  const bNorm = normalizedName(b)
  if (aNorm === bNorm) return 1
  // Pull street numbers + first 2 tokens of street name
  const at = aNorm.split(' ')
  const bt = bNorm.split(' ')
  if (at[0] !== bt[0]) return 0  // different street number — different address
  // Same number → check street name tokens
  let inter = 0
  const aSet = new Set(at.slice(1))
  const bSet = new Set(bt.slice(1))
  for (const t of aSet) if (bSet.has(t)) inter++
  const union = aSet.size + bSet.size - inter
  return union > 0 ? inter / union : 0
}
