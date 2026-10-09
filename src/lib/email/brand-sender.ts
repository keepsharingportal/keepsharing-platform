// Per-brand email identity.
//
// Every transactional email in the app was addressed from "River Region
// Parents <hello@riverregionparents.com>" with River-Region-worded copy. A
// Greater Pensacola parent who fills in a form and gets a reply signed River
// Region Parents has no idea who is writing to them — and unlike a wrong word
// on a page, nobody can see it happen.
//
// ── The constraint that shapes this ─────────────────────────────────────────
// Resend will only send from a domain verified in the account. Today that is
// riverregionparents.com. Sending as hello@greaterpensacolaparents.com before
// that domain is verified does not produce a mislabelled email — it produces
// NO email, silently, which is worse than the problem being fixed.
//
// So the two halves of a From: header move independently:
//
//   display name  →  always the serving brand. Costs nothing, needs no DNS,
//                    and is the part a human actually reads in their inbox.
//   address       →  stays on the verified domain until a brand-specific one
//                    is configured AND verified.
//
// "Greater Pensacola Parents <hello@riverregionparents.com>" is a slightly
// odd pairing, and it is the right trade: correct brand, delivered mail. To
// upgrade a brand once its domain is verified in Resend, set
// EMAIL_FROM_GPP="Greater Pensacola Parents <hello@greaterpensacolaparents.com>"
// and this picks it up with no code change.

import { MARKETS, publicOriginForBrand, type MarketDef } from '@/lib/markets'
import { brandifyCopy } from '@/lib/brandify'

const DEFAULT_ADDRESS = 'hello@riverregionparents.com'

export interface BrandSender {
  market:      MarketDef
  /** Ready for Resend's `from` field. */
  from:        string
  /** Brand's own public origin, for links in the body. */
  siteUrl:     string
  /** Rewrites River-Region-worded copy for this brand. Identity on RRP. */
  brandify:    (text: string) => string
}

/** Pull the bare address out of either "Name <a@b.com>" or "a@b.com". */
function addressOf(value: string | undefined | null): string | null {
  if (!value) return null
  const angled = value.match(/<([^>]+)>/)
  const bare   = (angled ? angled[1] : value).trim()
  return bare.includes('@') ? bare : null
}

/**
 * Email identity for a market.
 *
 * @param marketSlug  Which brand is sending. Null/unknown falls back to RRP,
 *                    which is the safe default: River Region is the brand
 *                    whose domain is verified and whose copy is already
 *                    written.
 * @param envFallback The route's existing env override, e.g.
 *                    process.env.SUBMISSIONS_FROM_EMAIL. Its ADDRESS is
 *                    honoured (that is the deliverability-critical half);
 *                    its display name is replaced by the brand's.
 */
export function brandSender(
  marketSlug:  string | null | undefined,
  envFallback?: string | null,
): BrandSender {
  const market = MARKETS.find(m => m.slug === marketSlug) ?? MARKETS[0]

  // A fully-specified per-brand sender wins outright — that is the escape
  // hatch for a brand whose own domain is verified.
  const perBrand = process.env[`EMAIL_FROM_${market.slug.toUpperCase()}`]
  if (perBrand && perBrand.includes('@')) {
    return {
      market,
      from:     perBrand,
      siteUrl:  publicOriginForBrand(market.slug) || 'https://riverregionparents.com',
      brandify: (t: string) => brandifyCopy(t, market),
    }
  }

  const address = addressOf(envFallback) ?? DEFAULT_ADDRESS

  return {
    market,
    from:     `${market.displayName} <${address}>`,
    siteUrl:  publicOriginForBrand(market.slug) || 'https://riverregionparents.com',
    brandify: (t: string) => brandifyCopy(t, market),
  }
}
