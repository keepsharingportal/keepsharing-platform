// Where a brand's inbound submissions land.
//
// The From half of transactional mail is handled by brand-sender.ts. This is
// the other half: the internal TO address for a form submission, an advertise
// inquiry, a prize notification.
//
// Every one of those routes read a single env var and fell back to a literal
// River Region address:
//
//   process.env.SUBMISSIONS_EDITOR_EMAIL ?? 'jason@riverregionparents.com'
//
// which is wrong in two different directions once a second brand is live. A
// Greater Pensacola school-bit submission landed in River Region's editorial
// inbox, and because the env var is per-deployment and this deployment serves
// six brands, there is no value you can set that routes them correctly.
//
// ── The fallback is deliberate, and differs from the public surfaces ────────
// On a public page an unconfigured brand renders NOTHING: an unmonitored
// mailbox loses a reader's photo silently, and showing River Region's address
// to a Pensacola parent is worse than showing none. See
// BrandContactLink.tsx.
//
// An internal notification is the opposite. Dropping it loses a lead with no
// trace, so an unconfigured brand falls through to the platform inbox — the
// owner reads every brand's mail anyway today. What must never happen is a
// silent fallback the reader can't see, so every subject line is prefixed
// with the brand it came from.
//
// Precedence, both roles:
//   1. the brand's own role inbox   (brand chrome / admin/settings/brands)
//   2. the brand's general inbox    (ditto)
//   3. the route's env override     (SUBMISSIONS_EDITOR_EMAIL, …)
//   4. the platform inbox           (PLATFORM_EDITOR_EMAIL, then the literal)
//
// Configure a brand at /admin/settings/brands and it leaves this file behind.

import { chromeForBrand, loadBrand } from '@/lib/brands'
import { marketShort } from '@/lib/markets'

/** Last-resort inbox. Reads every brand's mail today. */
const PLATFORM_INBOX = process.env.PLATFORM_EDITOR_EMAIL ?? 'jason@riverregionparents.com'

export type InboxRole = 'editorial' | 'sales'

/**
 * The inbox a submission for `marketSlug` should land in.
 *
 * @param role        Which desk. Editorial gets content submissions; sales
 *                    gets advertise inquiries and sponsorships. River Region
 *                    routes these to different people, so collapsing them
 *                    sends ad money to the editor.
 * @param envOverride The route's existing env var, honoured ahead of the
 *                    platform default so nothing that works today breaks.
 */
export async function inboxForBrand(
  marketSlug:  string | null | undefined,
  role:        InboxRole,
  envOverride?: string | null,
): Promise<string> {
  if (marketSlug) {
    const brand = await loadBrand(marketSlug)
    if (brand) {
      const chrome = chromeForBrand(brand)
      const own = role === 'sales' ? chrome.contactEmailSales : chrome.contactEmailEditorial
      if (own)                  return own
      if (chrome.contactEmail)  return chrome.contactEmail
    }
  }
  return (envOverride?.trim() || PLATFORM_INBOX)
}

/**
 * Subject prefix naming the brand, e.g. "[GPP] ".
 *
 * Mandatory on anything routed by the fallback above: when two brands share
 * one inbox, "New school bit submission" does not say whose. Cheap enough to
 * put on every brand's mail so the prefix never becomes a signal that
 * something is misconfigured.
 */
export function subjectTag(marketSlug: string | null | undefined): string {
  if (!marketSlug) return ''
  const short = marketShort(marketSlug)
  return short ? `[${short}] ` : ''
}
