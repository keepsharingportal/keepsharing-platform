import 'server-only'
import type { NextRequest } from 'next/server'
import { brandFromHost, publicOriginForBrand } from '@/lib/markets'

// Where a payment flow should send the customer back to.
//
// ── Why this is not NEXT_PUBLIC_SITE_URL ────────────────────────────────────
// The checkout routes built their Stripe success_url and cancel_url from
// `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'`.
// That is one value for a deployment serving six brand domains, so a Greater
// Pensacola advertiser who paid was returned to River Region's site — a
// confusing end to a transaction, and on a page that may not even recognise
// their token.
//
// ── Why the request's own host, not the brand's publicHost ──────────────────
// Greater Pensacola is served today from gpp.keepsharing.com while its
// publicHost is greaterpensacolaparents.com, a domain that is not pointed
// yet. Redirecting to publicHost would strand the advertiser on a dead host
// at the worst possible moment. So the request's own origin wins when it
// belongs to a brand we recognise — it is both brand-correct and reachable,
// since the customer is literally browsing it.
//
// ── Why the Origin header is validated ──────────────────────────────────────
// A Stripe redirect URL is attacker-controlled input if taken on trust: send
// a forged Origin and the success page becomes an open redirect. So the host
// must resolve to a known brand via brandFromHost (which also accepts the
// <slug>.<parent> staging pattern). Anything unrecognised falls back to the
// brand resolved from the request, never to a hardcoded one.

export interface CheckoutOrigin {
  /** Absolute origin, no trailing slash. */
  origin: string
  /** The brand it belongs to. */
  brand:  string
}

/**
 * Resolve the origin for a payment redirect.
 *
 * Prefers the request's own host, provided it maps to a brand. Falls back to
 * that brand's canonical public origin, and only then to the deployment-wide
 * env var — which is correct for a single-brand deployment and is the last
 * resort rather than the default.
 */
export function checkoutOrigin(req: NextRequest): CheckoutOrigin {
  const originHeader = req.headers.get('origin')
  const hostHeader   = req.headers.get('host')

  // The brand is whichever of these the proxy would have resolved.
  const candidateHost = (() => {
    if (originHeader) {
      try { return new URL(originHeader).host } catch { /* malformed; ignore */ }
    }
    return hostHeader
  })()

  // The candidate must resolve to a brand ON ITS OWN. Validating the Host
  // header and then using the Origin header is how a forged Origin becomes
  // an open redirect: `Origin: https://evil.example.com` with a legitimate
  // Host would otherwise be echoed straight into Stripe's success_url.
  const candidateBrand = brandFromHost(candidateHost)
  const brand = candidateBrand ?? brandFromHost(hostHeader)

  // A recognised host: keep the customer exactly where they are.
  if (candidateBrand && candidateHost) {
    const proto = req.headers.get('x-forwarded-proto')
      ?? (candidateHost.startsWith('localhost') || candidateHost.startsWith('127.0.0.1') ? 'http' : 'https')
    return { origin: `${proto}://${candidateHost}`.replace(/\/$/, ''), brand: candidateBrand }
  }

  // Unrecognised host (or none): the brand's canonical origin.
  if (brand) return { origin: publicOriginForBrand(brand).replace(/\/$/, ''), brand }

  // Single-brand deployment or local dev.
  const fallback = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return { origin: fallback.replace(/\/$/, ''), brand: 'rrp' }
}
