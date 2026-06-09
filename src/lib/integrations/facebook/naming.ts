// Campaign-naming convention parser.
//
// Operators name campaigns in Meta Ads Manager as:
//   [advertiser-slug] Free-form Description
//
// We extract the bracketed slug at the START of the name only — anything
// later in the name might be a tag, not an attribution. The slug is
// matched against advertiser_accounts.slug to bind the campaign to
// an advertiser. Bracket forms tolerated:
//
//   [wetumpka-smiles] May 2026         → 'wetumpka-smiles'
//   [Wetumpka Smiles] May 2026         → 'wetumpka-smiles'  (normalized)
//   [WETUMPKA_SMILES] May 2026         → 'wetumpka-smiles'  (normalized)
//   May 2026 [wetumpka-smiles] left    → null  (not leading)
//   May 2026                           → null
//
// The normalization: lowercase, swap spaces/underscores for hyphens. This
// means operators can name brackets in plain English ([Wetumpka Smiles])
// and still get a clean slug — fewer typos, looser convention.

const BRACKET_PREFIX = /^\s*\[([^\]]+)\]/

export function parseAdvertiserSlug(campaignName: string): string | null {
  const m = campaignName.match(BRACKET_PREFIX)
  if (!m) return null
  const raw = m[1].trim()
  if (!raw) return null
  return raw
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
