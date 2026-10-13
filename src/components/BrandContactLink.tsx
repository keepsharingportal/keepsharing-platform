'use client'

// The brand's public inbox, as a link.
//
// ── Why this is a component ─────────────────────────────────────────────────
// `hello@riverregionparents.com` was hardcoded in a dozen reader- and
// advertiser-facing surfaces. One deployment serves six brand domains, so
// every one of those links invited another brand's readers into River
// Region's inbox — and the next page someone writes would have copied the
// same literal.
//
// A brand with no address set renders nothing at all. That is deliberate: an
// unanswered inbox is worse than no link, and borrowing a sibling brand's is
// worse than both. Set addresses at /admin/settings/brands and every call
// site here starts working at once.
//
// It is a client component so it can be dropped into either tree — a client
// component renders fine inside a server one, and the brand wording comes
// from BrandCopyProvider rather than an awaited server lookup.

import { useBrandCopy } from './BrandCopyProvider'

export function BrandContactLink({
  className,
  subject,
  children,
  role,
}: {
  className?: string
  /** Which inbox. 'editorial' for submissions and story tips, 'sales' for
   *  sponsorships and listings. Falls back to the brand's general address,
   *  then renders nothing. */
  role?: 'editorial' | 'sales'
  /** Prefills the mail subject. */
  subject?: string
  /** Link text. Defaults to the address itself. */
  children?: React.ReactNode
}) {
  const copy = useBrandCopy()
  const contactEmail =
    (role === 'editorial' ? copy.contactEmailEditorial : null) ??
    (role === 'sales'     ? copy.contactEmailSales     : null) ??
    copy.contactEmail
  if (!contactEmail) return null

  const href = subject
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    : `mailto:${contactEmail}`

  return (
    <a href={href} className={className}>
      {children ?? contactEmail}
    </a>
  )
}

/** The address as a bare string, for copy that names it inline rather than
 *  linking it. Returns null when the brand has none — callers must handle
 *  that rather than substituting a default. */
export function useBrandContactEmail(role?: 'editorial' | 'sales'): string | null {
  const copy = useBrandCopy()
  return (role === 'editorial' ? copy.contactEmailEditorial : null)
      ?? (role === 'sales'     ? copy.contactEmailSales     : null)
      ?? copy.contactEmail
}
