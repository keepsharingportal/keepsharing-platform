// Campaign-naming convention parser.
//
// Operators name campaigns in Meta Ads Manager. The canonical form is
// [advertiser-slug] at the START of the campaign name, but real-world
// naming drifts:
//
//   [wetumpka-smiles] May 2026         → 'wetumpka-smiles'   (canonical)
//   [Wetumpka Smiles] May 2026         → 'wetumpka-smiles'   (normalized casing)
//   [WETUMPKA_SMILES] May 2026         → 'wetumpka-smiles'   (normalized underscore)
//   May 2026 [wetumpka-smiles]         → 'wetumpka-smiles'   (trailing brackets)
//   May 2026 (wetumpka-smiles)         → 'wetumpka-smiles'   (parentheses)
//   May 2026                           → null
//
// We prefer LEADING brackets (most signal of intent), then trailing brackets,
// then leading or trailing parentheses. Two delimiters in one name resolve
// to the leading one. Multiple bracketed groups → first one wins.
//
// The normalization: lowercase, swap spaces/underscores for hyphens, strip
// other punctuation. Operators can name brackets in plain English
// ([Wetumpka Smiles]) and still get a clean slug — fewer typos, looser
// convention.

const BRACKET_PREFIX  = /^\s*\[([^\]]+)\]/
const BRACKET_SUFFIX  = /\[([^\]]+)\]\s*$/
const PAREN_PREFIX    = /^\s*\(([^)]+)\)/
const PAREN_SUFFIX    = /\(([^)]+)\)\s*$/

function normalize(raw: string): string | null {
  const slug = raw.trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || null
}

export function parseAdvertiserSlug(campaignName: string): string | null {
  // Precedence: leading bracket > trailing bracket > leading paren > trailing
  // paren. The leading bracket is the strongest convention signal — we keep
  // it as the first match so existing naming stays unambiguous.
  const leadBr = campaignName.match(BRACKET_PREFIX)
  if (leadBr) return normalize(leadBr[1])
  const trailBr = campaignName.match(BRACKET_SUFFIX)
  if (trailBr) return normalize(trailBr[1])
  const leadParen = campaignName.match(PAREN_PREFIX)
  if (leadParen) return normalize(leadParen[1])
  const trailParen = campaignName.match(PAREN_SUFFIX)
  if (trailParen) return normalize(trailParen[1])
  return null
}
