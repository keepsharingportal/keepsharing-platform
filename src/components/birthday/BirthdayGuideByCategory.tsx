// Birthday Guide by Category — the full categorized vendor directory.
// Replaces the count-only BirthdayCategoryBrowser tile block.
//
// Layout (mobile-first):
//   1. Section header + intro
//   2. Sticky category chip-bar — tap a chip to scroll to that group
//   3. One labeled section per category, with vendor cards in a grid
//
// Cards lean on the inline business identity that ships with
// guide_listings (business_name, office_phone, website_url, address,
// neighborhood, hero_photo_url, card_hook, guide_data.description).
// FEATURED listings sort first within each category and get a badge.

'use client'

import { useMemo, useState } from 'react'
import { SectionHeader } from './BudgetTiers'
import { ChevronDown, ChevronUp, MapPin, Phone, Globe, Star } from 'lucide-react'

interface Listing {
  id:              string
  business_name:   string | null
  category:        string | null
  listing_tier:    string | null
  office_phone:    string | null
  website_url:     string | null
  address:         string | null
  city_state_zip:  string | null
  neighborhood:    string | null
  hero_photo_url:  string | null
  card_hook:       string | null
  description:     string | null
  display_order:   number | null
}

// Group order — controls which category appears first in the page.
// Anything not listed here lands alphabetically after the known set.
const CATEGORY_ORDER = [
  'Cakes/Finger Foods',
  'Entertainment',
  'Equipment/Games Rentals',
  'Party Planners',
  'Paper Goods/Decoration/Invitations',
  'Printed Invitations',
  'Places to Party - Artistic',
  'Places to Party - Bowling',
  'Places to Party - Cheer/Gymnastics/Dance',
  'Places to Party - Martial Arts',
  'Places to Party - Skating',
  'Places to Party - Outdoors',
  'Places to Party - Parks',
  'Places to Party - Restaurants',
  'Places to Party - Miscellaneous',
  'Unique Gifts for Kids and Adults',
]

function tierOrder(t: string | null | undefined): number {
  if (t === 'featured') return 0
  if (t === 'enhanced') return 1
  return 2
}

function shortCategory(cat: string): string {
  return cat.replace('Places to Party - ', 'Places to Party · ')
}

function categoryAnchor(cat: string): string {
  return 'cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function telHref(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d]/g, '')
  return digits.length >= 7 ? `tel:${digits}` : null
}

function websiteHref(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function locationLine(l: Listing): string {
  const bits: string[] = []
  if (l.neighborhood) bits.push(l.neighborhood)
  else if (l.address) bits.push(l.address)
  if (l.city_state_zip) bits.push(l.city_state_zip)
  return bits.join(' · ')
}

export function BirthdayGuideByCategory({ listings, totalCount }: {
  listings: Listing[]
  totalCount: number
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Listing[]>()
    for (const l of listings) {
      const key = l.category ?? 'Uncategorized'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    // Sort within each category: featured first, then alphabetical.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const t = tierOrder(a.listing_tier) - tierOrder(b.listing_tier)
        if (t !== 0) return t
        return (a.business_name ?? '').localeCompare(b.business_name ?? '')
      })
    }
    // Sort categories by CATEGORY_ORDER, then alphabetical for the rest.
    const all = Array.from(map.entries())
    all.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a[0])
      const bi = CATEGORY_ORDER.indexOf(b[0])
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a[0].localeCompare(b[0])
    })
    return all
  }, [listings])

  if (listings.length === 0) {
    return (
      <div>
        <SectionHeader
          eyebrow="Local Guide"
          title="The Big Birthday Guide"
          kicker="The full vendor directory lands here once the editor runs the latest CSV import."
        />
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-[13px] text-slate-600">
          No vendors imported yet. Admin → Content → <code>Guide Listings Import</code> picks up
          <code> imports/guides/birthday-party-guide.csv</code>.
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        eyebrow={`${totalCount} vendors`}
        title="The Big Birthday Guide"
        kicker="Every venue, cake, entertainer, and rental in the River Region — sorted by what you're shopping for. Tap a chip to jump."
      />

      {/* Chip nav — sticky on mobile inside the section */}
      <div className="sticky top-12 z-30 -mx-2 sm:mx-0 mb-5 bg-[#fffaf5]/95 backdrop-blur py-2 px-2 sm:px-0 border-b border-black/5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {grouped.map(([cat, list]) => (
            <a
              key={cat}
              href={`#${categoryAnchor(cat)}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(categoryAnchor(cat))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-full bg-white border border-black/10 text-slate-700 hover:bg-[#ff7a59] hover:text-white hover:border-[#ff7a59] transition-colors"
            >
              {shortCategory(cat)} <span className="text-slate-400">({list.length})</span>
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map(([cat, list]) => (
          <CategoryGroup key={cat} category={cat} listings={list} />
        ))}
      </div>
    </div>
  )
}

function CategoryGroup({ category, listings }: { category: string; listings: Listing[] }) {
  // Collapse very long groups (>6) past the first batch — saves scroll.
  const COLLAPSE_THRESHOLD = 6
  const [expanded, setExpanded] = useState(listings.length <= COLLAPSE_THRESHOLD)
  const visible = expanded ? listings : listings.slice(0, COLLAPSE_THRESHOLD)
  const hiddenCount = listings.length - visible.length

  return (
    <section id={categoryAnchor(category)} className="scroll-mt-20">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[16px] sm:text-[18px] font-black text-slate-900">{shortCategory(category)}</h3>
        <span className="text-[11px] font-semibold text-slate-500">{listings.length} {listings.length === 1 ? 'listing' : 'listings'}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(l => <ListingCard key={l.id} listing={l} />)}
      </div>
      {hiddenCount > 0 && (
        <button type="button" onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-[#ff7a59] border border-[#ff7a59]/30 rounded-lg hover:bg-[#fff0eb]">
          Show {hiddenCount} more <ChevronDown size={12} />
        </button>
      )}
      {expanded && listings.length > COLLAPSE_THRESHOLD && (
        <button type="button" onClick={() => setExpanded(false)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700">
          Collapse <ChevronUp size={11} />
        </button>
      )}
    </section>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const tel  = telHref(listing.office_phone)
  const site = websiteHref(listing.website_url)
  const loc  = locationLine(listing)
  const blurb = listing.card_hook ?? listing.description ?? null
  const featured = listing.listing_tier === 'featured'

  return (
    <article className={`bg-white rounded-xl border ${featured ? 'border-[#ff7a59]/40 ring-1 ring-[#ff7a59]/10' : 'border-black/5'} shadow-sm p-4 flex flex-col h-full`}>
      {listing.hero_photo_url && (
        <div className="aspect-[3/2] -mx-4 -mt-4 mb-3 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.hero_photo_url} alt={listing.business_name ?? ''} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-[14px] font-bold text-slate-900 leading-snug">{listing.business_name ?? '(unnamed)'}</h4>
        {featured && (
          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-[#ff7a59] rounded">
            <Star size={9} /> Featured
          </span>
        )}
      </div>
      {loc && (
        <div className="text-[11px] text-slate-500 mb-2 inline-flex items-center gap-1">
          <MapPin size={10} /> {loc}
        </div>
      )}
      {blurb && (
        <p className="text-[12px] text-slate-600 leading-relaxed mb-3 line-clamp-3">{blurb}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5">
        {tel && (
          <a href={tel}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 rounded hover:bg-slate-200">
            <Phone size={10} /> {listing.office_phone}
          </a>
        )}
        {site && (
          <a href={site} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#ff7a59] rounded hover:opacity-90">
            <Globe size={10} /> Visit website
          </a>
        )}
      </div>
    </article>
  )
}
