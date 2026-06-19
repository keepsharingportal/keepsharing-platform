// BirthdayCategoryHubCards — color-block category nav mirroring the
// GuideHubCards pattern used elsewhere (was on /family-resource-guide).
// Same visual treatment: gradient bg with watermark icon, eyebrow,
// label, blurb, "Explore →" affordance. Categories collapse the 16
// raw CSV labels into 7 shoppable buckets so the wall stays clean.
//
// Each bucket maps to one or more guide_listings.category values via
// CATEGORY_BUCKETS below (also consumed by the category landing page
// at /birthday-party-guide/category/[slug] to drive its query).

import Link from 'next/link'
import {
  Cake, Music, Calendar, Sparkles, MapPin, ClipboardList, Gift,
  ArrowRight, BookOpen,
} from 'lucide-react'

export interface CategoryBucket {
  slug:        string
  label:       string
  eyebrow:     string
  blurb:       string
  Icon:        React.ElementType
  gradient:    string
  iconTone:    string
  // CSV categories that roll up into this bucket. The landing page
  // queries `guide_listings.category IN (...)` against this list.
  categories:  string[]
}

export const BIRTHDAY_CATEGORY_BUCKETS: CategoryBucket[] = [
  {
    slug:       'cakes-and-treats',
    label:      'Cakes & Treats',
    eyebrow:    'SWEETS & FINGER FOODS',
    blurb:      'Custom cakes, cupcake stations, ice cream cakes, and treats made by local bakers and shops.',
    Icon:       Cake,
    gradient:   'from-pink-500/85 via-rose-500/75 to-rose-700/70',
    iconTone:   'text-pink-50',
    categories: ['Cakes/Finger Foods'],
  },
  {
    slug:       'entertainment',
    label:      'Entertainment',
    eyebrow:    'KEEP THE PARTY GOING',
    blurb:      'Magicians, DJs, mobile gym buses, princess parties, and characters who come to you.',
    Icon:       Music,
    gradient:   'from-amber-500/85 via-orange-500/75 to-orange-700/70',
    iconTone:   'text-amber-50',
    categories: ['Entertainment'],
  },
  {
    slug:       'rentals-and-games',
    label:      'Rentals & Games',
    eyebrow:    'EQUIPMENT & INFLATABLES',
    blurb:      'Bounce houses, water slides, tables, chairs, tents, carnival games, and concession machines.',
    Icon:       Calendar,
    gradient:   'from-emerald-600/85 via-emerald-700/75 to-teal-800/70',
    iconTone:   'text-emerald-50',
    categories: ['Equipment/Games Rentals'],
  },
  {
    slug:       'decor-and-invitations',
    label:      'Decor & Invitations',
    eyebrow:    'PAPER, BALLOONS, FAVORS',
    blurb:      'Themed decorations, balloon bouquets, custom invitations, and the party supply stops.',
    Icon:       Sparkles,
    gradient:   'from-purple-600/85 via-purple-700/75 to-indigo-800/70',
    iconTone:   'text-purple-50',
    categories: ['Paper Goods/Decoration/Invitations', 'Printed Invitations'],
  },
  {
    slug:       'places-to-party',
    label:      'Places to Party',
    eyebrow:    'VENUES & DESTINATIONS',
    blurb:      'Bowling, gymnastics, art studios, skating, martial arts, restaurants, and outdoor spots.',
    Icon:       MapPin,
    gradient:   'from-blue-600/85 via-blue-700/75 to-blue-900/70',
    iconTone:   'text-blue-100',
    categories: [
      'Places to Party - Artistic',
      'Places to Party - Bowling',
      'Places to Party - Cheer/Gymnastics/Dance',
      'Places to Party - Martial Arts',
      'Places to Party - Outdoors',
      'Places to Party - Parks',
      'Places to Party - Restaurants',
      'Places to Party - Skating',
      'Places to Party - Miscellaneous',
    ],
  },
  {
    slug:       'party-planners',
    label:      'Party Planners',
    eyebrow:    'DONE-FOR-YOU EVENTS',
    blurb:      'Local pros who plan the whole thing — theme, setup, activities, and cleanup handled.',
    Icon:       ClipboardList,
    gradient:   'from-slate-700/85 via-slate-800/75 to-slate-900/70',
    iconTone:   'text-slate-100',
    categories: ['Party Planners'],
  },
  {
    slug:       'unique-gifts',
    label:      'Unique Gifts',
    eyebrow:    'SOMETHING DIFFERENT',
    blurb:      'Gift shops with one-of-a-kind finds for kids and the parents on your guest list.',
    Icon:       Gift,
    gradient:   'from-fuchsia-600/85 via-fuchsia-700/75 to-pink-800/70',
    iconTone:   'text-fuchsia-50',
    categories: ['Unique Gifts for Kids and Adults'],
  },
]

export function bucketBySlug(slug: string): CategoryBucket | null {
  return BIRTHDAY_CATEGORY_BUCKETS.find(b => b.slug === slug) ?? null
}

export function BirthdayCategoryHubCards({ countsByCategory }: {
  // Optional: { csvCategory → count } so each card can render its size.
  // Page component computes from the same guide_listings query that
  // feeds everything else, no separate round trip.
  countsByCategory?: Record<string, number>
}) {
  function bucketCount(b: CategoryBucket): number {
    if (!countsByCategory) return 0
    return b.categories.reduce((sum, c) => sum + (countsByCategory[c] ?? 0), 0)
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#ff7a59] mb-1.5">
            <BookOpen className="h-3 w-3" />
            Browse the Birthday Guide
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
            Find What Your Party Needs
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-xs">
          Tap a category to see every local vendor we've tracked down — featured pros first.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {BIRTHDAY_CATEGORY_BUCKETS.map(b => {
          const Icon = b.Icon
          const count = bucketCount(b)
          return (
            <Link
              key={b.slug}
              href={`/birthday-party-guide/category/${b.slug}`}
              className="group relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[4/3] flex flex-col justify-end hover:shadow-lg transition-shadow"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${b.gradient}`} />

              <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-40 group-hover:opacity-60 transition-opacity">
                <Icon className={`h-10 w-10 md:h-14 md:w-14 ${b.iconTone}`} strokeWidth={1.5} />
              </div>

              <div className="relative p-4 md:p-5 z-10">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 mb-1.5">
                  {b.eyebrow}
                </p>
                <h3 className="text-lg md:text-xl font-black text-white leading-tight mb-1.5 drop-shadow-sm">
                  {b.label}
                </h3>
                <p className="hidden md:block text-xs text-white/85 leading-snug line-clamp-2 mb-3">
                  {b.blurb}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white group-hover:gap-1.5 transition-all">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                      {count} {count === 1 ? 'listing' : 'listings'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
