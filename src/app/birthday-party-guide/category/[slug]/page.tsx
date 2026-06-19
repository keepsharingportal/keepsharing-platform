// /birthday-party-guide/category/[slug] — landing page for one
// birthday category bucket (e.g. "cakes-and-treats" → all listings
// with category IN ['Cakes/Finger Foods']). The bucket → CSV
// categories map lives in BirthdayCategoryHubCards so both the portal
// hub cards and this page agree on the rollup.
//
// Layout:
//   Hero strip — gradient + bucket label + count + breadcrumb back
//   Featured listings (tier-1/2/3 + 'featured') — canonical ListingCard 'featured' variant
//   All other listings — canonical ListingCard 'standard' variant grid
//   Hub cards again at bottom so parents can pivot to another category

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ListingCard, type ListingData } from '@/components/theme/ListingCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArrowLeft, Star, Building2 } from 'lucide-react'
import { BirthdayCategoryHubCards, bucketBySlug } from '@/components/birthday/BirthdayCategoryHubCards'
import type { Metadata } from 'next'

export const revalidate = 600

interface Props {
  params: Promise<{ slug: string }>
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const bucket = bucketBySlug(slug)
  if (!bucket) return { title: 'Birthday Category Not Found' }
  return {
    title:       `${bucket.label} — Birthday Party Guide | River Region Parents`,
    description: bucket.blurb,
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

export default async function BirthdayCategoryPage({ params }: Props) {
  const { slug } = await params
  const bucket = bucketBySlug(slug)
  if (!bucket) notFound()

  const supabase = sb()

  // Listings in this bucket — joined to advertiser_accounts. Featured-
  // tier rows surface first; we de-dup by advertiser_account_id later
  // (a vendor can appear in multiple CSV categories within the bucket
  // and we don't want to render them twice on the same page).
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
    .in('category', bucket.categories)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .limit(500)

  const rows = (data ?? []) as unknown as ListingRow[]

  // Dedup by advertiser_account_id so the same vendor never renders
  // twice when the bucket pulls multiple CSV categories.
  const seen = new Set<string>()
  const uniq = rows
    .map(toListingData)
    .filter((l): l is ListingData => l !== null)
    .filter(l => {
      if (seen.has(l.id)) return false
      seen.add(l.id); return true
    })

  // Re-attach tier so we can split featured vs standard.
  const tierById = new Map<string, string | null>()
  for (const r of rows) if (r.advertiser_accounts) tierById.set(r.advertiser_accounts.id, r.listing_tier)
  const featured = uniq.filter(l => FEATURED_TIERS.includes(tierById.get(l.id) ?? ''))
  const standard = uniq.filter(l => !FEATURED_TIERS.includes(tierById.get(l.id) ?? ''))

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Birthday Party Guide', href: '/birthday-party-guide' },
              { label: bucket.label },
            ]}
          />
        </div>
      </div>

      {/* Category hero strip */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${bucket.gradient}`}>
        <div className="container py-10 md:py-14 text-white">
          <Link
            href="/birthday-party-guide"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/85 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> Birthday Party Guide
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 mb-1.5">
            {bucket.eyebrow}
          </p>
          <h1 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-sm">
            {bucket.label}
          </h1>
          <p className="text-white/85 mt-3 max-w-2xl leading-relaxed">{bucket.blurb}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-bold">
            <Building2 className="h-3.5 w-3.5" />
            {uniq.length} {uniq.length === 1 ? 'listing' : 'listings'}
          </div>
        </div>
      </div>

      <main className="container py-10 lg:py-14 space-y-14">

        {/* Featured listings */}
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

        {/* Standard / free listings */}
        {standard.length > 0 ? (
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-2xl font-bold text-foreground">
                {featured.length > 0 ? `More ${bucket.label}` : 'All listings'}
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
            <h3 className="text-lg font-bold text-foreground mb-1">No {bucket.label.toLowerCase()} yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We&apos;re still building out this category. Know a business that belongs here?{' '}
              <Link href="/birthday-party-guide/share-yours" className="text-primary font-semibold hover:underline">Tell us about them.</Link>
            </p>
          </section>
        ) : null}

        {/* Pivot — same hub cards at the bottom */}
        <section className="pt-10 border-t border-border/40">
          <BirthdayCategoryHubCards />
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
