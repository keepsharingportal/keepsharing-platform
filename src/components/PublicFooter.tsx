// Public-site footer. Server component — it fetches the
// nav_visibility data on render so editors can rename, hide, add
// custom links, or flip "open in new tab" without a deploy. The
// override map is cached for 30 seconds at the helper level, so this
// isn't a per-request DB hit in practice.

import Link from 'next/link'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { Mail } from 'lucide-react'
import {
  FOOTER_EXPLORE, FOOTER_CONNECT, FOOTER_LEGAL, mergeNavItems,
  type NavItem,
} from '@/lib/site-nav/items'
import { getNavRenderData } from '@/lib/site-nav/visibility'
import { MARKETS, type MarketDef } from '@/lib/markets'
import type { BrandChrome } from '@/lib/brands'

// Brand chrome the footer needs. Passed as a prop so this component is
// safe to import from any page in the App Router (including 'use client'
// pages, which can pass static RRP defaults). The async brand resolver
// (loadBrandContext from src/lib/brand-context.ts) uses next/headers and
// is therefore server-only — importing it here would force every consumer
// to be server-side too.
interface FooterBrandProps {
  brandSlug?: string
  chrome?:    BrandChrome
}

// Lucide-react in this version doesn't ship Facebook / Instagram icons.
// Inline brand SVGs keep us off another dependency for two icons.
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.57v1.88h2.78l-.44 2.91h-2.33V22c4.78-.75 8.43-4.91 8.43-9.93z" />
    </svg>
  )
}
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}

const DEFAULT_BRAND_SLUG = 'rrp'
const RRP_CHROME_FALLBACK: BrandChrome = {
  tagline:                 'The Go-To Resource for River Region Families',
  logoUrl:                 null,
  primaryColorHex:         '#ef6442',
  accentColorHex:          '#1a2744',
  tertiaryColorHex:        '#f3bf24',
  backgroundColorHex:      '#fbfaf8',
  foregroundColorHex:      '#2b2420',
  contactEmail:            'hello@riverregionparents.com',
  socialFacebook:          null,
  socialInstagram:         null,
  homepageRotationColumns: [],
  wordmarkEyebrow:         null,
  wordmarkPrimary:         null,
  wordmarkAccent:          null,
}

interface FooterLinkProps {
  item: NavItem
  openInNewTab?: boolean
}

function FooterLink({ item, openInNewTab }: FooterLinkProps) {
  const isExternal = !!item.external || openInNewTab
  if (isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors"
      >
        {item.label}
      </a>
    )
  }
  return (
    <Link href={item.href} className="hover:text-primary transition-colors">
      {item.label}
    </Link>
  )
}

export async function PublicFooter(props: FooterBrandProps = {}) {
  const { overrides, customs } = await getNavRenderData()
  // Brand chrome comes from the caller. Server-component pages that want
  // brand-aware rendering call loadBrandContext()+chromeForBrand() and
  // pass the result. 'use client' pages fall back to the RRP defaults.
  const brandSlug = props.brandSlug ?? DEFAULT_BRAND_SLUG
  const market: MarketDef = MARKETS.find(m => m.slug === brandSlug) ?? MARKETS[0]
  const chrome = props.chrome ?? RRP_CHROME_FALLBACK
  const displayName = market.displayName
  // Wordmark split: last word in primary color, matching Navigation.
  const lastSpace = displayName.lastIndexOf(' ')
  const wordmarkBase = lastSpace > 0 ? displayName.slice(0, lastSpace) + ' ' : displayName
  const wordmarkAccent = lastSpace > 0 ? displayName.slice(lastSpace + 1) : ''
  const year = new Date().getFullYear()
  // Used in the muted "hyper-local hub" line.
  const audienceLead = 'community connection'

  // For each column, pull in the matching catalog items + any custom
  // items the admin nested under the column's parent_key. The footer
  // columns don't have a parent dropdown in the catalog, so we use
  // their group-label as the parent_key the admin will assign for
  // custom items targeting that column.
  const exploreCustoms = customs.filter(c => c.parentKey === 'footer.explore')
  const connectCustoms = customs.filter(c => c.parentKey === 'footer.connect')
  const legalCustoms   = customs.filter(c => c.parentKey === 'footer.legal')

  const explore = mergeNavItems(FOOTER_EXPLORE, overrides, exploreCustoms)
  const connect = mergeNavItems(FOOTER_CONNECT, overrides, connectCustoms)
  const legal   = mergeNavItems(FOOTER_LEGAL,   overrides, legalCustoms)

  function newTabFor(key: string): boolean {
    return overrides.get(key)?.openInNewTab ?? false
  }

  return (
    <footer className="bg-muted pt-14 pb-8 border-t mt-12 font-sans">
      <div className="container">

        {/* Newsletter strip */}
        <div className="rounded-2xl bg-primary/8 border border-primary/15 px-6 py-6 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="shrink-0">
            <p className="font-bold text-foreground text-base leading-tight">Get the weekly {displayName} newsletter</p>
            <p className="text-sm text-muted-foreground mt-0.5">Events, stories, and local tips — free every week.</p>
          </div>
          <div className="w-full md:max-w-sm">
            <NewsletterSignup variant="inline" source="footer" />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex flex-col mb-6">
              <div className="leading-none mb-2">
                <span className="text-3xl font-black tracking-tight text-foreground whitespace-nowrap">
                  {wordmarkBase}
                  {wordmarkAccent && (
                    <span style={{ color: chrome.primaryColorHex }}>{wordmarkAccent}</span>
                  )}
                </span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{chrome.tagline}</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              Your hyper-local hub for {audienceLead} in {market.city}, {market.state}.
            </p>
            <div className="flex items-center gap-3 text-muted-foreground">
              {chrome.contactEmail && (
                <a
                  href={`mailto:${chrome.contactEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm hover:text-foreground transition-colors"
                  aria-label={`Email ${displayName}`}
                >
                  <Mail size={14} /> {chrome.contactEmail}
                </a>
              )}
              {chrome.socialFacebook && (
                <a
                  href={chrome.socialFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  aria-label="Facebook"
                >
                  <FacebookIcon />
                </a>
              )}
              {chrome.socialInstagram && (
                <a
                  href={chrome.socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </a>
              )}
            </div>
          </div>

          {explore.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {explore.map(item => (
                  <li key={item.key}>
                    <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {connect.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {connect.map(item => (
                  <li key={item.key}>
                    <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {year} {displayName}. All rights reserved.</p>
          {legal.length > 0 && (
            <div className="flex gap-4">
              {legal.map(item => (
                <span key={item.key} className="hover:text-foreground transition-colors">
                  <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
