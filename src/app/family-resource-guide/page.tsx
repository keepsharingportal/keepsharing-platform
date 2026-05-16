// /family-resource-guide
// The distilled essentials for River Region moms. Photo hero → three
// self-select lanes → best-of → mom knows best → seasons → 5 towns →
// directory with sidebar. Navigation + PublicFooter are provided by
// the family-resource-guide layout — don't render them again here.

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

import { FRGHero }            from '@/components/family-resource-guide/FRGHero'
import { SelfSelectLanes }    from '@/components/family-resource-guide/SelfSelectLanes'
import { TownsGrid }          from '@/components/family-resource-guide/TownsGrid'
import { BestOfFeatureRow }   from '@/components/family-resource-guide/BestOfFeatureRow'
import { LatestReads }        from '@/components/family-resource-guide/LatestReads'
import { MomKnowsBestRow }    from '@/components/family-resource-guide/MomKnowsBestRow'
import { YearRoundEvents }    from '@/components/family-resource-guide/YearRoundEvents'
import { GetListedCTA }       from '@/components/family-resource-guide/GetListedCTA'
import { SubmitTipWidget }    from '@/components/family-resource-guide/SubmitTipWidget'
import { VerticalSponsorBanner } from '@/components/verticals/VerticalSponsorBanner'

import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { FreeListing }     from '@/components/family-guide/FreeListing'
import type { GuideListing, ListingTier } from '@/components/family-guide/types'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Family Resource Guide | River Region Parents',
  description: 'The distilled essentials. River Region moms — local, new, or just trying to keep up — start here. Schools, pediatricians, parks, day trips, counselors, and more.',
}

// ── V1 approved category groups — only these render in the directory ─────────
const V1_PARENT_GROUPS = [
  'Schools & Learning',
  'Childcare',
  'Pediatric & Family Healthcare',
  'Things To Do',
  'Family Getaways',
  'Food & Dining',
  'Community & Faith',
  'Mom Life',
  'Family Services',
  'Shopping',
  'Sports & Recreation',
] as const

const GROUP_DESCRIPTIONS: Record<string, string> = {
  'Schools & Learning':           'Compare local school options, tutoring, learning support, and programs that help kids thrive.',
  'Childcare':                    "Find childcare centers, Mother's Day Out programs, and care options that fit your family's schedule.",
  'Pediatric & Family Healthcare':'Trusted doctors, dentists, urgent care, and family health providers.',
  'Things To Do':                 'Parks, libraries, indoor play, local attractions, and easy ideas for family time.',
  'Family Getaways':              'Day trips, weekend escapes, and nearby adventures worth the drive.',
  'Food & Dining':                'Kid-friendly meals, farmers markets, and local food stops families actually use.',
  'Community & Faith':            'Mom groups, churches, service opportunities, and local support.',
  'Mom Life':                     'Wellness, pregnancy, postpartum, and places that help moms breathe again.',
  'Family Services':              'Photographers, real estate, moving help, and trusted services for family life.',
  'Shopping':                     "Local children's boutiques, baby gear, consignment, and family-friendly shops.",
  'Sports & Recreation':          'Youth leagues, recreation programs, swimming, and active family options.',
}

interface CategoryWithListings {
  id:           string
  name:         string
  slug:         string
  parent_group: string | null
  display_order: number | null
  listings:     GuideListing[]
}

interface TownProfile {
  slug:             string
  name:             string
  county:           string | null
  vibe_one_line:    string | null
  hero_image_url:   string | null
  population:       number | null
  school_districts: string[] | null
}

interface AccRow {
  id: string
  slug: string
  business_name: string
  office_phone: string | null
  mobile_phone: string | null
  website_url: string | null
  address: string | null
  city_state_zip: string | null
  neighborhood: string | null
  hero_photo_url: string | null
  card_hook: string | null
}

interface RawListingRow {
  id: string
  listing_tier: string
  category: string | null
  guide_data: Record<string, unknown> | null
  display_order: number
  advertiser_accounts: AccRow | null
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FamilyResourceGuidePage() {
  const supabase = await createClient()

  const [
    { data: guideType },
    { data: guideConfig },
    { data: guideMeta },
    { data: townsData },
    { data: bestOfData },
    { data: mkbData },
    { data: latestReadsData },
    { data: frgCategories },
    { data: listingsRaw },
    { data: sponsorRow },
  ] = await Promise.all([
    // Hero identity — canonical from guide_types. Query by url_slug since
    // that's the stable public identifier (the internal slug is the legacy
    // 'newcomer' value). The OR variant we had was returning null when
    // PostgREST's .maybeSingle() detected multiple ambiguous matches.
    supabase.from('guide_types')
      .select('slug, url_slug, display_name, pitch, hero_image_url, short_description')
      .eq('url_slug', 'family-resource-guide')
      .maybeSingle(),

    // Secondary hero image source — guide_configs.homepage_image_url is
    // what the admin "Homepage tile image" field saves to. Used as a
    // fallback if guide_types.hero_image_url is empty.
    supabase.from('guide_configs')
      .select('homepage_image_url, fallback_image_url')
      .in('guide_type_slug', ['newcomer', 'family-resource-guide'])
      .limit(1)
      .maybeSingle(),

    // Legacy hero copy fallback
    supabase.from('guide_meta')
      .select('hero_image_url, hero_eyebrow, hero_title, hero_subtitle, hero_issue_label')
      .eq('guide_slug', 'family-resource-guide')
      .maybeSingle(),

    // 5 towns
    supabase.from('town_profiles')
      .select('slug, name, county, vibe_one_line, hero_image_url, population, school_districts')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),

    // Best Of articles — fetch 7 so the layout fills as 1 lead + 6 grid
    // (3 perfect rows of 2). 'See all' link below picks up overflow.
    supabase.from('guide_articles')
      .select('id, slug, title, subtitle, excerpt, hero_image_url, published_at')
      .eq('column_slug', 'frg-best-of')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(7),

    // Latest 3 Mom Knows Best posts
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, profile_image_url, author_name, published_at')
      .eq('column_slug', 'mom-knows-best')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(3),

    // "Latest Reads" — everything else tagged to this guide that isn't
    // already featured in Best Of or Mom Knows Best. Accepts both the
    // legacy guide_slug='newcomer' and the friendly 'family-resource-guide'.
    supabase.from('guide_articles')
      .select('id, slug, title, subtitle, excerpt, hero_image_url, author_name, published_at, column_slug')
      .in('guide_slug', ['family-resource-guide', 'newcomer'])
      .not('column_slug', 'in', '(frg-best-of,mom-knows-best)')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(6),

    // Directory categories
    supabase.from('guide_categories')
      .select('id, name, slug, parent_group, display_order')
      .eq('guide_slug', 'family-resource-guide')
      .in('parent_group', [...V1_PARENT_GROUPS])
      .order('display_order'),

    // Listings (joined to advertiser_accounts for display)
    supabase.from('guide_listings')
      .select(`
        id, listing_tier, category, guide_data, display_order,
        advertiser_accounts (
          id, slug, business_name,
          office_phone, mobile_phone,
          website_url, address, city_state_zip, neighborhood,
          hero_photo_url, card_hook
        )
      `)
      .in('guide_type_slug', ['newcomer', 'newcomer-guide', 'family-resource-guide', 'family-resource'])
      .eq('is_published', true)
      .order('display_order'),

    // Active section sponsor (if any)
    supabase.from('ad_placements')
      .select('id, ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%family-resource%')
      .limit(1)
      .maybeSingle(),
  ])

  // ── Identity (admin-editable, with fallbacks) ────────────────────────────
  // Hero image fallback chain — every place an admin might have set one:
  //   1. guide_types.hero_image_url       — the main "Hero image" field
  //   2. guide_configs.homepage_image_url — admin "Homepage tile image"
  //   3. guide_configs.fallback_image_url — admin "Fallback image"
  //   4. guide_meta.hero_image_url        — legacy
  const heroImageUrl =
    guideType?.hero_image_url ||
    guideConfig?.homepage_image_url ||
    guideConfig?.fallback_image_url ||
    guideMeta?.hero_image_url ||
    null

  const heroTitle    = guideMeta?.hero_title    || guideType?.display_name      || 'Family Resource Guide'
  const heroSubtitle = guideMeta?.hero_subtitle || guideType?.pitch             ||
    'The distilled essentials. River Region moms — local, new, or just trying to keep up — start here.'
  const heroEyebrow  = guideMeta?.hero_eyebrow  || 'OFFICIAL RIVER REGION GUIDE'

  // ── Listings ─────────────────────────────────────────────────────────────
  const listings: GuideListing[] = ((listingsRaw ?? []) as unknown as RawListingRow[]).map(row => {
    const acc = row.advertiser_accounts
    const gd  = (row.guide_data ?? {}) as Record<string, unknown>
    return {
      id:              row.id,
      slug:            acc?.slug ?? row.id,
      business_name:   acc?.business_name ?? '',
      listing_tier:    (row.listing_tier ?? 'free') as ListingTier,
      category:        row.category ?? undefined,
      description:     (gd.description as string) ?? null,
      editorial_blurb: (gd.editorialBlurb as string) ?? acc?.card_hook ?? null,
      hours_summary:   (gd.hours as string) ?? null,
      phone:           acc?.office_phone ?? acc?.mobile_phone ?? null,
      website:         acc?.website_url ?? null,
      address:         acc?.address ?? null,
      city:            acc?.neighborhood ?? acc?.city_state_zip?.split(',')[0]?.trim() ?? null,
      cover_image_url: acc?.hero_photo_url ?? null,
      display_order:   row.display_order,
    }
  })

  // ── Match listings to categories ─────────────────────────────────────────
  const categoriesRaw = (frgCategories ?? []) as Array<{ id: string; name: string; slug: string; parent_group: string | null; display_order: number | null }>
  const categories: CategoryWithListings[] = categoriesRaw.map(cat => ({
    ...cat,
    listings: listings.filter(l => {
      if (!l.category) return false
      const norm = normalizeForMatch(l.category)
      return norm === normalizeForMatch(cat.name) || norm === cat.slug
    }),
  }))

  // ── Group categories by parent_group for sectioning ──────────────────────
  const groups = V1_PARENT_GROUPS.map(group => ({
    name:       group,
    categories: categories.filter(c => c.parent_group === group && c.listings.length > 0),
    total:      categories.filter(c => c.parent_group === group).reduce((s, c) => s + c.listings.length, 0),
  })).filter(g => g.total > 0)

  // ── Towns ────────────────────────────────────────────────────────────────
  const towns = (townsData ?? []) as TownProfile[]

  // ── Best Of articles ─────────────────────────────────────────────────────
  const bestOf = (bestOfData ?? []) as Array<{
    id: string; slug: string; title: string; subtitle: string | null; excerpt: string | null
    hero_image_url: string | null; published_at: string | null
  }>

  // ── Mom Knows Best posts ─────────────────────────────────────────────────
  const mkb = (mkbData ?? []) as Array<{
    id: string; slug: string; title: string; excerpt: string | null
    hero_image_url: string | null; profile_image_url: string | null
    author_name: string | null; published_at: string | null
  }>

  // ── Latest Reads (everything else tagged to FRG) ─────────────────────────
  const latestReads = (latestReadsData ?? []) as Array<{
    id: string; slug: string; title: string; subtitle: string | null; excerpt: string | null
    hero_image_url: string | null; author_name: string | null; published_at: string | null
    column_slug: string | null
  }>

  // ── Sponsor ──────────────────────────────────────────────────────────────
  const sponsorAd = sponsorRow as {
    id:          string
    ad_headline: string | null
    advertiser:  { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor = sponsorAd?.advertiser?.business_name
    ? {
        businessName: sponsorAd.advertiser.business_name,
        slug:         sponsorAd.advertiser.slug ?? null,
        headline:     sponsorAd.ad_headline   ?? null,
        placementId:  sponsorAd.id,
      }
    : null

  // ── Stats ─────────────────────────────────────────────────────────────────
  const listingsCount = listings.length
  const townsCount    = towns.length
  const bestOfCount   = bestOf.length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── LAYER 1: Hero ── */}
      <FRGHero
        heroImageUrl={heroImageUrl}
        eyebrow={heroEyebrow}
        title={heroTitle}
        subtitle={heroSubtitle}
        listingsCount={listingsCount}
        townsCount={townsCount}
        bestOfCount={bestOfCount}
      />

      <main className="container py-10 md:py-14 space-y-14">

        {/* ── LAYER 2: Self-select lanes ── */}
        <SelfSelectLanes
          towns={{ count: townsCount }}
          bestOf={{ count: bestOfCount }}
          services={{ count: listingsCount }}
        />

        {/* ── Sponsor banner ── */}
        <VerticalSponsorBanner
          verticalName="the Family Resource Guide"
          verticalSlug="family-resource-guide"
          sponsorLabel="Proudly Presented By"
          sponsor={sponsor}
        />

        {/* ── Best Of editorial — the high-value content goes first ── */}
        <BestOfFeatureRow articles={bestOf} />

        {/* ── Latest Reads — every other FRG-tagged article ── */}
        <LatestReads articles={latestReads} />

        {/* ── Mom Knows Best cross-pollination ── */}
        {mkb.length > 0 && <MomKnowsBestRow posts={mkb} />}

        {/* ── Year-round events — seasonal rhythm of family life ── */}
        <YearRoundEvents />

        {/* ── The 5 Towns — orientation content, lower in the page ── */}
        {towns.length > 0 && <TownsGrid towns={towns} />}

        {/* ── Directory with sidebar ── */}
        <section id="directory" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">The Directory</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                Find a service
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{listingsCount.toLocaleString()} listings across {groups.length} categories.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

            {/* Main directory column */}
            <div className="min-w-0 space-y-10">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
                  <BookOpen className="h-7 w-7 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground mb-1">Directory is loading</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Listings come from your active partner accounts. Add the first one at{' '}
                    <Link href="/advertise" className="text-primary hover:underline">Advertise</Link>.
                  </p>
                </div>
              ) : (
                groups.map(group => {
                  const groupId = normalizeForMatch(group.name)
                  return (
                    <section key={group.name} id={groupId} className="scroll-mt-24">
                      <div className="flex items-end justify-between gap-3 mb-4 pb-2 border-b border-border/40">
                        <div className="min-w-0">
                          <h3 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                            {group.name}
                          </h3>
                          {GROUP_DESCRIPTIONS[group.name] && (
                            <p className="text-xs text-muted-foreground mt-0.5">{GROUP_DESCRIPTIONS[group.name]}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {group.total} listing{group.total !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-8">
                        {group.categories.map(cat => {
                          const featured = cat.listings.filter(l => l.listing_tier === 'featured')
                          const enhanced = cat.listings.filter(l => l.listing_tier === 'enhanced')
                          const free     = cat.listings.filter(l => l.listing_tier === 'free')
                          if (cat.listings.length === 0) return null
                          return (
                            <div key={cat.id}>
                              {(group.categories.length > 1) && (
                                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 mb-3">
                                  {cat.name}
                                </p>
                              )}
                              <div className="flex flex-col gap-4">
                                {featured.map(l => <FeaturedListing key={l.id} listing={l} guideUrlSlug="family-resource-guide" />)}
                                {enhanced.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {enhanced.map(l => <EnhancedListing key={l.id} listing={l} guideUrlSlug="family-resource-guide" />)}
                                  </div>
                                )}
                                {free.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    {free.map(l => <FreeListing key={l.id} listing={l} guideUrlSlug="family-resource-guide" />)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })
              )}
            </div>

            {/* Sticky sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">

              {/* Filter — anchor links to category groups */}
              <div className="rounded-2xl border border-border/40 bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Jump to
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map(g => (
                    <Link
                      key={g.name}
                      href={`#${normalizeForMatch(g.name)}`}
                      className="text-[11px] font-semibold px-2 py-1 rounded-full bg-muted/40 text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {g.name} <span className="text-muted-foreground">({g.total})</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* About this guide */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">About this guide</p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  We curate this list with help from local moms, partners, and editorial review. New to the region?
                  The <Link href="#towns" className="text-primary hover:underline font-semibold">5 Towns</Link> section
                  is a good first stop.
                </p>
              </div>

              {/* Submit a tip */}
              <SubmitTipWidget />

              {/* Get listed */}
              <GetListedCTA variant="sidebar" />
            </aside>
          </div>
        </section>

        {/* ── Get Listed banner ── */}
        <GetListedCTA variant="banner" />

        {/* ── Newsletter ── */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/8 border border-border/30 p-8 md:p-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">The River Region Weekly</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            One email. The week, distilled.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-5 leading-relaxed">
            New Best-Of lists, town highlights, weekend events, and Mom Knows Best posts —
            delivered every Friday morning.
          </p>
          <Link
            href="/newsletter/subscribe"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Subscribe <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </>
  )
}
