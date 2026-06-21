// Sticky right sidebar for the birthday category + sub-category pages.
// Four slots, in priority order on mobile (collapses below main):
//   1. Featured Pro spotlight — paid sponsor visibility
//   2. Browse Birthday Categories — pivot to another bucket
//   3. Current birthday deal (if any) — uses birthday_deals
//   4. List Your Business CTA — conversion / sponsorship pitch
//
// Each slot renders only when there's data, so a category with no
// featured pros / no active deal silently skips that slot.

import Link from 'next/link'
import { ArrowRight, Star, Tag, Sparkles } from 'lucide-react'
import { BIRTHDAY_CATEGORY_BUCKETS, type CategoryBucket } from './BirthdayCategoryHubCards'

export interface FeaturedSpotlight {
  slug:          string
  business_name: string
  card_hook:     string | null
  hero_photo_url:string | null
}

export interface SidebarDeal {
  id:            string
  business_name: string
  headline:      string
  offer:         string
  image_url:     string | null
  link_url:      string | null
}

interface Props {
  // Which bucket is currently being viewed — that one renders as
  // "you're here" in the categories list.
  currentBucketSlug?: string
  featuredSpotlights?: FeaturedSpotlight[]   // shown if non-empty (max 2)
  deal?:               SidebarDeal | null    // shown if non-null
}

export function BirthdayCategorySidebar({
  currentBucketSlug, featuredSpotlights = [], deal,
}: Props) {
  return (
    <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 lg:self-start">

      {/* 1. Featured Pro spotlight */}
      {featuredSpotlights.length > 0 && (
        <div className="bg-card border border-accent/40 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-accent/15 via-accent/8 to-transparent border-b border-accent/20 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-accent fill-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Featured Pros
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {featuredSpotlights.slice(0, 2).map(s => (
              <Link
                key={s.slug}
                href={`/birthday-party-guide/listings/${s.slug}`}
                className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {s.hero_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.hero_photo_url} alt={s.business_name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-bold text-foreground leading-tight truncate">{s.business_name}</h4>
                  {s.card_hook && (
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{s.card_hook}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. Browse Birthday Categories */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Birthday Categories
          </span>
        </div>
        <div className="p-2">
          {BIRTHDAY_CATEGORY_BUCKETS.map(b => {
            const isCurrent = b.slug === currentBucketSlug
            const Icon = b.Icon
            return (
              <Link
                key={b.slug}
                href={`/birthday-party-guide/category/${b.slug}`}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                  isCurrent
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-foreground hover:bg-muted/60 font-semibold'
                }`}
              >
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${b.gradient}`}>
                  <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </span>
                <span className="flex-1 truncate text-[13px]">{b.label}</span>
                {isCurrent && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/70 shrink-0">
                    Here
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* 3. Current Deal */}
      {deal && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-emerald-700" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Birthday Deal
            </span>
          </div>
          {deal.image_url && (
            <div className="aspect-[3/2] bg-muted overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.image_url} alt={deal.business_name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{deal.business_name}</div>
            <h4 className="font-bold text-sm text-foreground leading-snug">{deal.headline}</h4>
            <p className="text-[12px] text-muted-foreground leading-snug">{deal.offer}</p>
            {deal.link_url && (
              <a
                href={deal.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 hover:underline mt-1"
              >
                See deal <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 4. List Your Business CTA */}
      <Link
        href="/birthday-party-guide/sponsor"
        className="block bg-gradient-to-br from-[#ff7a59] via-[#ff8b6e] to-[#ff9d80] rounded-2xl p-5 text-white hover:shadow-lg transition-shadow"
      >
        <div className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-2">
          Is this your business?
        </div>
        <h4 className="text-lg font-black leading-tight mb-1">Get a Featured Profile</h4>
        <p className="text-[12px] text-white/90 leading-snug mb-3">
          Photos, blurb, top-of-page placement, and direct contact tools. River Region parents see your business first.
        </p>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-white">
          See listing options <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    </aside>
  )
}

// Helper for the category page server component — picks 2 random
// featured listings to spotlight in the sidebar. Caller passes the
// full list of in-guide featured rows; this just shuffles + slices.
export function pickSpotlights(all: FeaturedSpotlight[], n = 2): FeaturedSpotlight[] {
  const arr = [...all]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

// Re-export for downstream consumers that already import from this
// component file.
export type { CategoryBucket }
