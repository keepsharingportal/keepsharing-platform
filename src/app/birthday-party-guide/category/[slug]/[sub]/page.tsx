// /birthday-party-guide/category/[slug]/[sub] — leaf-level sub-type
// page (e.g. "places-to-party/bowling"). Each sub is its own indexable
// URL with bespoke title + meta description for long-tail search
// intent like "Montgomery bowling birthday party".
//
// Layout:
//   Breadcrumbs (Home > Birthday > Bucket > Sub)
//   Hero strip using the parent bucket's gradient + sub label
//   Featured listings (canonical ListingCard 'featured')
//   Standard listings (canonical ListingCard 'standard')
//   Sibling subs chip-row to pivot inside the bucket
//   Other birthday hub cards at the bottom

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ListingCard, type ListingData } from '@/components/theme/ListingCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArrowLeft, Star, Building2 } from 'lucide-react'
import {
  BirthdayCategoryHubCards,
  subBySlug,
  bucketBySlug,
} from '@/components/birthday/BirthdayCategoryHubCards'
import type { Metadata } from 'next'

export const revalidate = 600

interface Props {
  params: Promise<{ slug: string; sub: string }>
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sub } = await params
  const match = subBySlug(slug, sub)
  if (!match) return { title: 'Birthday Sub-Category Not Found' }
  return {
    title:       match.sub.metaTitle ?? `${match.sub.label} — ${match.bucket.label} | Birthday Party Guide`,
    description: match.sub.blurb,
    alternates:  { canonical: `/birthday-party-guide/category/${slug}/${sub}` },
  }
}

const FEATURED_TIERS = ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight']

interface ListingRow {
  id:            string
  listing_tier:  string | null
  display_order: number | null
  guide_data:    Record<string, unknown> | null
  advertiser_accounts: {
    id:                     string
    slug:                   string
    business_name:          string
    card_hook:              string | null
    hero_photo_url:         string | null
    neighborhood:           string | null
    city_state_zip:         string | null
    website_url:            string | null
    office_phone:           string | null
    has_military_discount:  boolean | null
    is_veteran_owned:       boolean | null
    is_woman_owned:         boolean | null
    is_minority_owned:      boolean | null
    is_locally_owned:       boolean | null
  } | null
}

function toListingData(row: ListingRow): ListingData | null {
  const a = row.advertiser_accounts
  if (!a) return null
  const hookFallback = (row.guide_data?.description as string | undefined) ?? null
  return {
    id:                    a.id,
    slug:                  a.slug,
    business_name:         a.business_name,
    card_hook:             a.card_hook ?? hookFallback,
    hero_photo_url:        a.hero_photo_url,
    neighborhood:          a.neighborhood,
    city_state_zip:        a.city_state_zip,
    website_url:           a.website_url,
    office_phone:          a.office_phone,
    has_military_discount: a.has_military_discount,
    is_veteran_owned:      a.is_veteran_owned,
    is_woman_owned:        a.is_woman_owned,
    is_minority_owned:     a.is_minority_owned,
    is_locally_owned:      a.is_locally_owned,
  }
}

export default async function BirthdaySubCategoryPage({ params }: Props) {
  const { slug, sub } = await params
  const match = subBySlug(slug, sub)
  if (!match) notFound()
  const { bucket, sub: subCfg } = match

  const supabase = sb()

  const { data } = await supabase
    .from('guide_listings')
    .select(`
      id, listing_tier, display_order, guide_data,
      advertiser_accounts (
        id, slug, business_name, card_hook, hero_photo_url,
        neighborhood, city_state_zip, website_url, office_phone,
        has_military_discount, is_veteran_owned, is_woman_owned,
        is_minority_owned, is_locally_owned
      )
    `)
    .in('guide_type_slug', ['birthday-party', 'birthday-party-guide'])
    .in('category', subCfg.categories)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .limit(500)

  const rows = (data ?? []) as unknown as ListingRow[]

  // Dedup by advertiser_account_id so a vendor with multiple CSV
  // categories within the sub doesn't render twice.
  const seen = new Set<string>()
  const uniq = rows
    .map(toListingData)
    .filter((l): l is ListingData => l !== null)
    .filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true })

  const tierById = new Map<string, string | null>()
  for (const r of rows) if (r.advertiser_accounts) tierById.set(r.advertiser_accounts.id, r.listing_tier)
  const featured = uniq.filter(l => FEATURED_TIERS.includes(tierById.get(l.id) ?? ''))
  const standard = uniq.filter(l => !FEATURED_TIERS.includes(tierById.get(l.id) ?? ''))

  // Sibling subs for the in-page chip row (pivot to another sub without
  // a round trip to the bucket landing page).
  const siblingSubs = (bucket.subs ?? []).filter(s => s.slug !== subCfg.slug)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Birthday Party Guide', href: '/birthday-party-guide' },
              { label: bucket.label, href: `/birthday-party-guide/category/${bucket.slug}` },
              { label: subCfg.label },
            ]}
          />
        </div>
      </div>

      {/* Sub hero — reuses the parent bucket's gradient so visitors
          feel they're still inside the same bucket, just one level deeper. */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${bucket.gradient}`}>
        <div className="container py-10 md:py-14 text-white">
          <Link
            href={`/birthday-party-guide/category/${bucket.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/85 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> All {bucket.label}
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 mb-1.5">
            {bucket.label.toUpperCase()}
          </p>
          <h1 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-sm">
            {subCfg.label}
          </h1>
          <p className="text-white/85 mt-3 max-w-2xl leading-relaxed">{subCfg.blurb}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-bold">
            <Building2 className="h-3.5 w-3.5" />
            {uniq.length} {uniq.length === 1 ? 'listing' : 'listings'}
          </div>
        </div>
      </div>

      <main className="container py-10 lg:py-14 space-y-14">

        {featured.length > 0 && (
          <section>
            <div className="flex items-baseline gap-2 mb-5">
              <Star className="h-4 w-4 text-accent" />
              <h2 className="text-2xl font-bold text-foreground">Featured Partners</h2>
            </div>
            <div className="space-y-5">
              {featured.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  guideUrlSlug="birthday-party-guide"
                  guideContext="birthday-party"
                  variant="featured"
                />
              ))}
            </div>
          </section>
        )}

        {standard.length > 0 ? (
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-2xl font-bold text-foreground">
                {featured.length > 0 ? `More ${subCfg.label}` : 'All listings'}
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">{standard.length} listings</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {standard.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  guideUrlSlug="birthday-party-guide"
                  guideContext="birthday-party"
                  variant="standard"
                />
              ))}
            </div>
          </section>
        ) : featured.length === 0 ? (
          <section className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-14 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-1">No {subCfg.label.toLowerCase()} listings yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We&apos;re still building out this section. Know a business that belongs here?{' '}
              <Link href="/birthday-party-guide/share-yours" className="text-primary font-semibold hover:underline">Tell us about them.</Link>
            </p>
          </section>
        ) : null}

        {/* Sibling subs — chip-row pivot to a different sub-type
            without leaving the page concept */}
        {siblingSubs.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Other {bucket.label} options</h2>
            <div className="flex flex-wrap gap-2">
              {siblingSubs.map(s => (
                <Link
                  key={s.slug}
                  href={`/birthday-party-guide/category/${bucket.slug}/${s.slug}`}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="pt-10 border-t border-border/40">
          <BirthdayCategoryHubCards />
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
