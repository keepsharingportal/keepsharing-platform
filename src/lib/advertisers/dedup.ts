// Dedup helpers for advertiser_accounts.
//
// Why fuzzy match: editors create the same business twice when importing
// from different sources ('Baptist Hospital' vs 'baptist hospital, inc.'
// vs 'Baptist Hospital — Birmingham'). Pure-string-equal misses every
// one of those; a small normalization + token-overlap test catches them
// without false positives like 'Baptist Hospital' vs 'Baptist Press'.
//
// Algorithm:
//   1. Normalize each name (lowercase, strip punctuation, drop common
//      corporate suffixes: 'llc', 'inc', 'co', 'corp', 'ltd', 'pllc',
//      and our domain words: 'hospital', 'clinic' — only when they're
//      a TRAILING token, otherwise we'd merge 'Children's Hospital'
//      with 'Children's Center'). Collapse multiple spaces.
//   2. Score each pair as (shared tokens) / (tokens in shorter name).
//      1.0 means one name's tokens are fully contained in the other.
//   3. Match threshold ≥ 0.75 with at least 2 shared meaningful tokens
//      (single-token matches like 'baptist' alone are too noisy).
//   4. Group connected matches via union-find so 3+ way dups land in
//      one cluster.

const CORPORATE_SUFFIXES = new Set([
  'llc', 'inc', 'incorporated', 'co', 'corp', 'corporation', 'ltd',
  'pllc', 'lp', 'llp', 'pc', 'plc',
])

// Domain words to drop ONLY when they sit at the end of the name. They
// rarely disambiguate and prevent merges between trivial variants
// ('Baptist Hospital' vs 'Baptist').
const TRAILING_DOMAIN_WORDS = new Set([
  'hospital', 'clinic', 'center', 'centre', 'group', 'practice',
  'services', 'company',
])

// Very short words that are noisy on their own ('the', 'of', 'and').
const STOPWORDS = new Set(['the', 'of', 'and', 'a', 'an', '&'])

export function normalize(name: string): string[] {
  const lowered = name.toLowerCase()
    .replace(/['']/g, '')          // strip apostrophes pre-tokenize
    .replace(/[^a-z0-9 ]+/g, ' ')   // everything else becomes space
    .replace(/\s+/g, ' ')
    .trim()
  let tokens = lowered.split(' ').filter(Boolean)
  // Drop trailing domain words ('center', 'group', 'services') but only
  // at the end — they're usually just descriptors when leading.
  while (tokens.length > 1 && TRAILING_DOMAIN_WORDS.has(tokens[tokens.length - 1])) {
    tokens.pop()
  }
  // Drop corporate suffixes anywhere — they never carry signal.
  tokens = tokens.filter(t => !CORPORATE_SUFFIXES.has(t))
  // Drop stopwords; if it leaves nothing, restore at least one token.
  const stripped = tokens.filter(t => !STOPWORDS.has(t))
  return stripped.length > 0 ? stripped : tokens
}

/** Pair similarity score: shared meaningful tokens divided by the shorter
 *  set's size. 1.0 = full containment; 0.5 = half overlap. */
export function similarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const set = new Set(b)
  let shared = 0
  for (const t of a) if (set.has(t)) shared++
  return shared / Math.min(a.length, b.length)
}

export interface DupCandidate {
  id:             string
  business_name:  string
  slug:           string
  tokens:         string[]
}

export interface DupCluster {
  /** Stable string key derived from the cluster's smallest id; useful for React. */
  key:     string
  members: DupCandidate[]
}

/** Find duplicate clusters across all rows. Returns groups of 2+ likely
 *  matches; singletons are filtered out. */
export function findClusters(rows: DupCandidate[], threshold = 0.75): DupCluster[] {
  // Union-find for grouping.
  const parent = new Map<string, string>()
  function find(x: string): string {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r) ?? r
    // Path compression.
    let cur = x
    while (parent.get(cur) !== r) {
      const next = parent.get(cur) ?? r
      parent.set(cur, r)
      cur = next
    }
    return r
  }
  function union(a: string, b: string) {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const r of rows) parent.set(r.id, r.id)

  // Compare every pair. O(n²); fine up to a few thousand advertisers.
  // If this ever gets slow, bucket by first-character or first-token to
  // skip obvious non-matches.
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j]
      // Need at least 2 shared meaningful tokens, ALWAYS. The earlier
      // 'unless one row has only 1 token' carve-out let single-token
      // rows like 'Camp' act as union-find bridges that pulled every
      // 'Camp Something' into one cluster of 20+ unrelated businesses.
      // With the strict ≥2 rule, single-token names can't auto-cluster
      // at all — editor merges those manually if needed.
      const sharedCount = countShared(a.tokens, b.tokens)
      if (sharedCount < 2) continue
      const score = similarity(a.tokens, b.tokens)
      if (score >= threshold) union(a.id, b.id)
    }
  }

  // Bucket rows by cluster root, drop singletons.
  const buckets = new Map<string, DupCandidate[]>()
  for (const r of rows) {
    const root = find(r.id)
    const bucket = buckets.get(root) ?? []
    bucket.push(r)
    buckets.set(root, bucket)
  }
  const out: DupCluster[] = []
  for (const [root, members] of buckets) {
    if (members.length < 2) continue
    // Sort each cluster: oldest-looking slug first (assumes seed order),
    // then alphabetical. The editor usually keeps the first one.
    members.sort((a, b) => a.business_name.localeCompare(b.business_name))
    out.push({ key: root, members })
  }
  // Biggest clusters first — the editor handles the worst messes first.
  out.sort((a, b) => b.members.length - a.members.length)
  return out
}

function countShared(a: string[], b: string[]): number {
  const set = new Set(b)
  let n = 0
  for (const t of a) if (set.has(t)) n++
  return n
}
