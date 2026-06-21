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
  Trophy, Disc, Shield, Palette, UtensilsCrossed, TreePine, Trees,
  Mail,
} from 'lucide-react'

// A sub-type inside a bucket — gets its own SEO-friendly URL at
// /birthday-party-guide/category/{bucket}/{sub}. Each sub points at
// the CSV categories it represents (almost always one, but the model
// supports multiple in case the CSV ever drifts).
export interface CategorySub {
  slug:        string         // URL segment, e.g. 'bowling'
  label:       string         // Card title, e.g. 'Bowling'
  blurb:       string         // 1-sentence description for the sub-page
  metaTitle?:  string         // Optional override for <title> + H1; auto-derived if absent
  categories:  string[]       // CSV category names this sub maps to
  // Visual identity — drives the colorful sub-cards on the bucket
  // landing page. Each sub gets its own gradient + icon for the same
  // magazine-spread feel as the top-level hub cards.
  Icon:        React.ElementType
  gradient:    string
  iconTone:    string
}

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
  // Optional sub-types. When present, the parent landing page shows a
  // grid of smaller sub-cards above the listings AND each sub becomes
  // its own indexable page at /category/{bucket}/{sub}. Buckets with
  // only one natural meaning (Cakes, Party Planners, etc.) omit this.
  subs?:       CategorySub[]
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
    subs: [
      { slug: 'paper-goods-and-decor', label: 'Decor, Balloons & Favors',
        blurb: 'Themed decorations, balloon bouquets, party supplies, and themed favors for River Region birthday parties.',
        metaTitle: 'Birthday Decorations, Balloons & Party Supplies | Montgomery & River Region',
        categories: ['Paper Goods/Decoration/Invitations'],
        Icon: Sparkles,
        gradient: 'from-purple-500/85 via-purple-600/75 to-violet-700/70',
        iconTone: 'text-purple-50' },
      { slug: 'printed-invitations', label: 'Printed Invitations',
        blurb: 'Custom birthday invitations, print shops, and stationers serving the River Region.',
        metaTitle: 'Custom Birthday Invitations | Montgomery & River Region',
        categories: ['Printed Invitations'],
        Icon: Mail,
        gradient: 'from-indigo-500/85 via-indigo-600/75 to-blue-700/70',
        iconTone: 'text-indigo-50' },
    ],
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
    subs: [
      { slug: 'bowling', label: 'Bowling',
        blurb: 'Bowling alleys and centers hosting birthday parties across the River Region.',
        metaTitle: 'Bowling Birthday Parties | Montgomery, Prattville & River Region',
        categories: ['Places to Party - Bowling'],
        Icon: Disc,
        gradient: 'from-emerald-600/85 via-emerald-700/75 to-teal-800/70',
        iconTone: 'text-emerald-50' },
      { slug: 'gymnastics-and-dance', label: 'Gymnastics, Cheer & Dance',
        blurb: 'Gym, cheer, and dance studios that host birthday parties for River Region kids.',
        metaTitle: 'Gymnastics, Cheer & Dance Birthday Parties | Montgomery & River Region',
        categories: ['Places to Party - Cheer/Gymnastics/Dance'],
        Icon: Trophy,
        gradient: 'from-rose-500/85 via-rose-600/75 to-pink-700/70',
        iconTone: 'text-rose-50' },
      { slug: 'skating', label: 'Skating',
        blurb: 'Skating rinks and roller-skating birthday party venues in the River Region.',
        metaTitle: 'Skating Rink Birthday Parties | Montgomery & River Region',
        categories: ['Places to Party - Skating'],
        Icon: Disc,
        gradient: 'from-sky-500/85 via-sky-600/75 to-cyan-700/70',
        iconTone: 'text-sky-50' },
      { slug: 'martial-arts', label: 'Martial Arts',
        blurb: 'Martial arts studios that throw active, themed birthday parties.',
        metaTitle: 'Martial Arts Birthday Parties | Montgomery & River Region',
        categories: ['Places to Party - Martial Arts'],
        Icon: Shield,
        gradient: 'from-red-600/85 via-red-700/75 to-rose-800/70',
        iconTone: 'text-red-50' },
      { slug: 'art-studios', label: 'Art Studios',
        blurb: 'Paint, pottery, and creative studios hosting kid birthday parties.',
        metaTitle: 'Art Studio Birthday Parties | Montgomery & River Region',
        categories: ['Places to Party - Artistic'],
        Icon: Palette,
        gradient: 'from-violet-500/85 via-violet-600/75 to-purple-700/70',
        iconTone: 'text-violet-50' },
      { slug: 'restaurants', label: 'Restaurants',
        blurb: 'River Region restaurants that book birthday parties — pizza, themed dining, more.',
        metaTitle: 'Restaurant Birthday Parties | Montgomery & River Region',
        categories: ['Places to Party - Restaurants'],
        Icon: UtensilsCrossed,
        gradient: 'from-amber-500/85 via-amber-600/75 to-orange-700/70',
        iconTone: 'text-amber-50' },
      { slug: 'outdoors', label: 'Outdoor Venues',
        blurb: 'Outdoor venues for River Region birthday parties — splash pads, farms, adventure spots.',
        metaTitle: 'Outdoor Birthday Party Venues | Montgomery & River Region',
        categories: ['Places to Party - Outdoors'],
        Icon: TreePine,
        gradient: 'from-lime-600/85 via-green-700/75 to-emerald-800/70',
        iconTone: 'text-lime-50' },
      { slug: 'parks', label: 'Parks',
        blurb: 'Local parks with shelters and pavilions perfect for River Region birthday parties.',
        metaTitle: 'Park Birthday Party Venues | Montgomery & River Region',
        categories: ['Places to Party - Parks'],
        Icon: Trees,
        gradient: 'from-green-600/85 via-emerald-700/75 to-teal-800/70',
        iconTone: 'text-green-50' },
      { slug: 'other-venues', label: 'Other Venues',
        blurb: 'Other birthday party venues in the River Region that don’t fit the standard buckets.',
        metaTitle: 'Other Birthday Party Venues | Montgomery & River Region',
        categories: ['Places to Party - Miscellaneous'],
        Icon: MapPin,
        gradient: 'from-slate-600/85 via-slate-700/75 to-slate-900/70',
        iconTone: 'text-slate-100' },
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

export function subBySlug(bucketSlug: string, subSlug: string): { bucket: CategoryBucket; sub: CategorySub } | null {
  const bucket = bucketBySlug(bucketSlug)
  if (!bucket?.subs) return null
  const sub = bucket.subs.find(s => s.slug === subSlug)
  if (!sub) return null
  return { bucket, sub }
}

// Smaller, colorful sub-cards used on bucket landing pages. Same
// visual DNA as the top-level hub cards (gradient bg, watermark icon,
// label, count) but scaled down so the hierarchy is obvious: big hub
// cards on the portal, mini gradient cards inside each bucket page.
export function BirthdaySubCategoryCards({
  bucket, countsByCategory, currentSubSlug,
}: {
  bucket: CategoryBucket
  countsByCategory?: Record<string, number>
  // Optional — when set, highlights the active sub on the sub-page so
  // visitors see where they are in the bucket.
  currentSubSlug?: string
}) {
  if (!bucket.subs?.length) return null
  function subCount(sub: CategorySub): number {
    if (!countsByCategory) return 0
    return sub.categories.reduce((sum, c) => sum + (countsByCategory[c] ?? 0), 0)
  }
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-3">Browse {bucket.label} by type</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {bucket.subs.map(s => {
          const Icon = s.Icon
          const count = subCount(s)
          const isCurrent = currentSubSlug === s.slug
          return (
            <Link
              key={s.slug}
              href={`/birthday-party-guide/category/${bucket.slug}/${s.slug}`}
              className={`group relative overflow-hidden rounded-xl aspect-[3/2] flex flex-col justify-end hover:shadow-lg transition-shadow ${
                isCurrent ? 'ring-2 ring-offset-2 ring-primary/60' : ''
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
              <div className="absolute top-2.5 right-2.5 opacity-45 group-hover:opacity-65 transition-opacity">
                <Icon className={`h-7 w-7 ${s.iconTone}`} strokeWidth={1.5} />
              </div>
              <div className="relative p-3 z-10">
                <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm">
                  {s.label}
                </h3>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/90">
                    Explore <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                      {count}
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
