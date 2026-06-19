// Birthday Guide by Category — uses the canonical ListingCard design
// shared with every other guide (Summer Camp, Private School, etc).
// Each item carries an already-shaped `listing` payload (built in the
// page server component from the advertiser_accounts join) so this
// component stays presentational.
//
// Layout (mobile-first):
//   1. Section header + intro
//   2. Sticky chip-bar — tap to jump to a category
//   3. One labeled section per category with a 1-3 column grid of
//      standard ListingCards. Featured tier sorts first inside the
//      category and uses the featured variant.

'use client'

import { useMemo, useState } from 'react'
import { SectionHeader } from './BudgetTiers'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ListingCard } from '@/components/theme'
import type { ListingData } from '@/components/theme/ListingCard'

interface GuideRow {
  id:            string
  category:      string | null
  listing_tier:  string | null
  display_order: number | null
  listing:       ListingData
}

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
  if (!t) return 2
  if (t === 'featured' || t.startsWith('tier-1') || t.startsWith('tier-2') || t.startsWith('tier-3')) return 0
  if (t === 'enhanced') return 1
  return 2
}

function shortCategory(cat: string): string {
  return cat.replace('Places to Party - ', 'Places to Party · ')
}

function categoryAnchor(cat: string): string {
  return 'cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function BirthdayGuideByCategory({ rows, totalCount }: {
  rows: GuideRow[]
  totalCount: number
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, GuideRow[]>()
    for (const r of rows) {
      const key = r.category ?? 'Uncategorized'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const t = tierOrder(a.listing_tier) - tierOrder(b.listing_tier)
        if (t !== 0) return t
        return a.listing.business_name.localeCompare(b.listing.business_name)
      })
    }
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
  }, [rows])

  if (rows.length === 0) {
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

      <div className="space-y-10">
        {grouped.map(([cat, list]) => (
          <CategoryGroup key={cat} category={cat} list={list} />
        ))}
      </div>
    </div>
  )
}

function CategoryGroup({ category, list }: { category: string; list: GuideRow[] }) {
  const COLLAPSE_THRESHOLD = 6
  const [expanded, setExpanded] = useState(list.length <= COLLAPSE_THRESHOLD)
  const visible = expanded ? list : list.slice(0, COLLAPSE_THRESHOLD)
  const hiddenCount = list.length - visible.length

  return (
    <section id={categoryAnchor(category)} className="scroll-mt-20">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[16px] sm:text-[18px] font-black text-slate-900">{shortCategory(category)}</h3>
        <span className="text-[11px] font-semibold text-slate-500">{list.length} {list.length === 1 ? 'listing' : 'listings'}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(r => (
          <ListingCard
            key={r.id}
            listing={r.listing}
            guideUrlSlug="birthday-party-guide"
            guideContext="birthday-party"
            variant={tierOrder(r.listing_tier) === 0 ? 'featured' : 'standard'}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button type="button" onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-[#ff7a59] border border-[#ff7a59]/30 rounded-lg hover:bg-[#fff0eb]">
          Show {hiddenCount} more <ChevronDown size={12} />
        </button>
      )}
      {expanded && list.length > COLLAPSE_THRESHOLD && (
        <button type="button" onClick={() => setExpanded(false)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700">
          Collapse <ChevronUp size={11} />
        </button>
      )}
    </section>
  )
}
