'use client'

// Brand wording for client components.
//
// ── Why this exists ─────────────────────────────────────────────────────────
// Server components resolve the brand with loadBrandContext(), which imports
// `server-only` and next/headers. A client component that imports it fails
// the build, so the usual workaround is to thread the wording down as props.
// That works for a leaf with one parent. It does not work for something like
// NewsletterSignup, which has ten call sites, several of them client
// components with call sites of their own — the prop has to be plumbed
// through every intermediate component that has no other use for it.
//
// One provider in the root layout instead. The server resolves the brand
// once, hands these four strings to the client tree, and any client component
// reads them with useBrandCopy().
//
// ── What belongs here ──────────────────────────────────────────────────────
// Brand *wording* only — the strings that appear in copy. Not the Brand row,
// not config, not anything a reader never sees. Keep it small: everything in
// here is serialized into the HTML of every page.

import { createContext, useContext } from 'react'

export interface BrandCopy {
  /** "River Region Parents" */
  displayName:  string
  /** "River Region" — the bare label, for headings and adjectival use */
  regionLabel:  string
  /** "the River Region" / "Greater Pensacola" — with its article when the
   *  brand's label takes one. See theRegion() in lib/brandify. */
  regionPhrase: string
  /** "Montgomery" — the primary city */
  city:         string
  /** "AL" — the state code, for address lines */
  state:        string
  /** The brand's public inbox, or null when the publisher has not set one.
   *  Null means omit the contact link — a hardcoded address routes one
   *  brand's readers into another brand's inbox. */
  contactEmail: string | null
  /** The brand's public phone, or null. Same omit-rather-than-borrow rule. */
  contactPhone: string | null
  /** Editorial inbox (school news, submissions), or null. */
  contactEmailEditorial: string | null
  /** Sales inbox (sponsorships, listings), or null. */
  contactEmailSales:     string | null
  /** The towns the brand covers, most-recognizable first. Empty for a brand
   *  that has not filled them in — render nothing rather than another
   *  brand's towns. */
  towns:        string[]
  /** The tenure claim this brand has earned ("over 30 years"), or null.
   *  Sales copy drops the clause when it is null — see MarketDef. */
  tenureClaim:  string | null
  /** True only for the brand whose advertiser testimonials these are. A
   *  real quote from a Montgomery pediatrician is not evidence for a
   *  Pensacola advertiser, and relabelling it would fabricate one. */
  ownsTestimonials: boolean
}

// No default: a client component rendered outside the provider should fail
// loudly in development rather than quietly print River Region's wording on
// another brand's site.
const BrandCopyContext = createContext<BrandCopy | null>(null)

export function BrandCopyProvider({ value, children }: { value: BrandCopy; children: React.ReactNode }) {
  return <BrandCopyContext.Provider value={value}>{children}</BrandCopyContext.Provider>
}

/**
 * Brand wording inside a client component.
 *
 * Throws when no provider is above it, which only happens if a client tree is
 * mounted outside the root layout. That is a bug worth surfacing: the silent
 * alternative is shipping one brand's name on another brand's domain.
 */
export function useBrandCopy(): BrandCopy {
  const v = useContext(BrandCopyContext)
  if (!v) throw new Error('useBrandCopy() requires <BrandCopyProvider> — it is mounted in the root layout')
  return v
}
