import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GuideVerticalLayout } from '@/components/guides/GuideVerticalLayout'
import type { PlaybookSection, AnchorArticle, StartCard } from '@/components/guides/GuidePageLayout'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { FreeListing } from '@/components/family-guide/FreeListing'
import type { GuideListing, GuideCategory, ListingTier } from '@/components/family-guide/types'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Family Resource Guide | River Region Parents',
  description: 'Everything River Region families need — schools, pediatricians, parks, neighborhoods, and the local network that knows where to send you.',
}

// ── V1 approved parent groups — only these render in the directory ─────────────
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

// ── Group descriptions shown under each section header ────────────────────────
const GROUP_DESCRIPTIONS: Record<string, string> = {
  'Schools & Learning':          'Compare local school options, tutoring, learning support, and programs that help kids thrive.',
  'Childcare':                   "Find childcare centers, Mother's Day Out programs, and care options that fit your family's schedule.",
  'Pediatric & Family Healthcare':'Start with trusted doctors, dentists, urgent care, and family health providers.',
  'Things To Do':                'Parks, libraries, indoor play, local attractions, and easy ideas for family time.',
  'Family Getaways':             'Day trips, weekend escapes, and nearby adventures worth the drive.',
  'Food & Dining':               'Kid-friendly meals, farmers markets, and local food stops families actually use.',
  'Community & Faith':           'Find connection through mom groups, churches, service opportunities, and local support.',
  'Mom Life':                    'Wellness, self-care, pregnancy, postpartum, and places that help moms breathe again.',
  'Family Services':             'Photographers, real estate, moving help, and trusted services for family life.',
  'Shopping':                    "Local children's boutiques, baby gear, consignment, and family-friendly shops.",
  'Sports & Recreation':         'Youth leagues, recreation programs, golf, tennis, swimming, and active family options.',
}

// ── Empty-state copy per group — varied so it doesn't feel copy-pasted ────────
const GROUP_EMPTY_STATES: Record<string, { headline: string; sub: string; cta: string }> = {
  'Schools & Learning':          { headline: "School profiles are being added now.",      sub: "This section is open for founding partners.",              cta: 'List Your School' },
  'Childcare':                   { headline: "We're adding childcare centers now.",        sub: "Want your center listed? Get in early.",                   cta: 'Get Listed Early' },
  'Pediatric & Family Healthcare':{ headline: "Trusted providers being added here.",      sub: "Know a great local practice? Tell us.",                    cta: 'Recommend a Provider' },
  'Things To Do':                { headline: "Local activities coming soon.",              sub: "Be among the first to reach River Region families.",        cta: 'Get Listed' },
  'Family Getaways':             { headline: "Day trip recommendations coming soon.",      sub: "Know a hidden gem families should know about?",            cta: 'Share a Recommendation' },
  'Food & Dining':               { headline: "Family-friendly spots being added now.",     sub: "This category is open for founding partners.",             cta: 'Get Listed Early' },
  'Community & Faith':           { headline: "Community resources coming soon.",           sub: "Submit a group, church, or organization.",                 cta: 'Submit a Resource' },
  'Mom Life':                    { headline: "Wellness providers being added here.",        sub: "Be the first in this section.",                            cta: 'Claim This Section' },
  'Family Services':             { headline: "Family service providers coming soon.",       sub: "This category is open for founding partners.",             cta: 'Get Listed Early' },
  'Shopping':                    { headline: "Local children's shops being added now.",     sub: "Want your boutique listed? Get in early.",                 cta: 'Get Listed Early' },
  'Sports & Recreation':         { headline: "Youth programs and leagues coming soon.",     sub: "This category is open for founding partners.",             cta: 'Get Listed' },
}

// ── FRG Directory slot ────────────────────────────────────────────────────────

type CategoryWithListings = GuideCategory & { listings: GuideListing[] }

function anchorId(name: string): string {
  return `dir-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function FRGDirectory({
  categories,
  urlSlug,
}: {
  categories: CategoryWithListings[]
  urlSlug: string
}) {
  const allListings = categories.flatMap(c => c.listings ?? [])

  // Build group map in V1 display order — only V1 parent groups reach this component
  const groupMap = new Map<string, CategoryWithListings[]>()
  for (const group of V1_PARENT_GROUPS) groupMap.set(group, [])
  for (const cat of categories) {
    const group = cat.parent_group ?? cat.name
    if (groupMap.has(group)) groupMap.get(group)!.push(cat)
  }
  // Remove groups with no categories seeded (shouldn't happen post-045, but safe)
  const groups = [...groupMap.keys()].filter(g => (groupMap.get(g)?.length ?? 0) > 0)

  // ── Section header (shared between empty and populated states) ──────────────
  const sectionHeader = (
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Local Directory</p>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Browse Local Resources by Category</h2>
          {allListings.length > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              {allListings.length} listing{allListings.length !== 1 ? 's' : ''} across {groups.length} categories
            </p>
          )}
        </div>
        <Link
          href={`/advertise/${urlSlug}`}
          className="text-sm font-bold text-primary hover:underline whitespace-nowrap flex items-center gap-1.5 shrink-0"
        >
          List your business <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )

  // ── Fully empty state ─────────────────────────────────────────────────────────
  // Shown only when zero listings exist across all categories.
  if (allListings.length === 0) {
    return (
      <div>
        {sectionHeader}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => {
            const es = GROUP_EMPTY_STATES[group]
            return (
              <div
                key={group}
                className="border border-dashed border-border rounded-2xl p-6 flex flex-col gap-2 bg-white"
              >
                <h3 className="font-bold text-foreground">{group}</h3>
                {GROUP_DESCRIPTIONS[group] && (
                  <p className="text-xs text-muted-foreground leading-snug">
                    {GROUP_DESCRIPTIONS[group]}
                  </p>
                )}
                {es && (
                  <p className="text-xs font-semibold text-primary/80 mt-1">{es.headline}</p>
                )}
                <Link
                  href={`/advertise/${urlSlug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-1"
                >
                  {es?.cta ?? 'Get listed here'} <ArrowRight size={11} />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Category navigation anchors ──────────────────────────────────────────────
  const categoryNav = (
    <div className="flex flex-wrap gap-2.5 mb-10 p-4 bg-muted/40 rounded-2xl border border-border/50">
      {groups.map(group => {
        const count = groupMap.get(group)!.flatMap(c => c.listings ?? []).length
        return (
          <a
            key={group}
            href={`#${anchorId(group)}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-background rounded-full border border-border/60 text-sm font-semibold hover:border-primary/50 hover:text-primary transition-colors"
          >
            {group}
            <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-bold text-muted-foreground">
              {count}
            </span>
          </a>
        )
      })}
    </div>
  )

  // ── Populated directory ──────────────────────────────────────────────────────
  return (
    <div>
      {sectionHeader}
      {categoryNav}

      <div className="flex flex-col gap-14">
        {groups.map(groupName => {
          const cats = groupMap.get(groupName)!
          const featured = cats.flatMap(c => (c.listings ?? []).filter(l => l.listing_tier === 'featured'))
          const enhanced = cats.flatMap(c => (c.listings ?? []).filter(l => l.listing_tier === 'enhanced'))
          const free     = cats.flatMap(c => (c.listings ?? []).filter(l => l.listing_tier === 'free'))
          const total    = featured.length + enhanced.length + free.length
          const groupDesc = GROUP_DESCRIPTIONS[groupName] ?? null
          const es        = GROUP_EMPTY_STATES[groupName]

          return (
            <section key={groupName} id={anchorId(groupName)} className="scroll-mt-24">
              {/* Group section header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4 border-b border-border/50">
                <div>
                  <div className="flex items-center flex-wrap gap-3">
                    <h3 className="text-xl font-bold text-foreground">{groupName}</h3>
                    {featured.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700/80 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        ✦ Presented by {featured[0].business_name}
                      </span>
                    )}
                  </div>
                  {groupDesc && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">{groupDesc}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  {total > 0 && (
                    <span className="text-muted-foreground">
                      {total} listing{total !== 1 ? 's' : ''}
                    </span>
                  )}
                  <Link
                    href={`/advertise/${urlSlug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    + Get listed
                  </Link>
                </div>
              </div>

              {total === 0 ? (
                // Group-specific empty-state CTA
                <div className="border border-dashed border-border/60 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {es?.headline ?? `${groupName} listings coming soon.`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {es?.sub ?? 'Want your business featured in this section?'}
                    </p>
                  </div>
                  <Link
                    href={`/advertise/${urlSlug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold whitespace-nowrap hover:bg-primary/90 transition-colors shrink-0"
                  >
                    {es?.cta ?? 'Get Listed'} <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {featured.map(l => (
                    <FeaturedListing key={l.id} listing={l} guideUrlSlug={urlSlug} />
                  ))}
                  {enhanced.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {enhanced.map(l => (
                        <EnhancedListing key={l.id} listing={l} guideUrlSlug={urlSlug} />
                      ))}
                    </div>
                  )}
                  {free.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {free.map(l => (
                        <FreeListing key={l.id} listing={l} guideUrlSlug={urlSlug} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

// ── Listing query helpers ─────────────────────────────────────────────────────

type AccRow = {
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

type RawListingRow = {
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

// ── Data helpers ──────────────────────────────────────────────────────────────

function articleHref(guideSlug: string, slug: string): string {
  if (guideSlug === 'newcomer-guide' || guideSlug === 'newcomer') {
    return `/newcomer-guide/articles/${slug}`
  }
  return `/family-resource-guide/articles/${slug}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FamilyResourceGuidePage() {
  const supabase = await createClient()

  const [
    { data: meta },
    { data: startCardsRaw },
    { data: playbookSectionsRaw },
    { data: frgArticles },
    { data: frgCategories },
  ] = await Promise.all([
    // Guide meta (hero copy)
    supabase
      .from('guide_meta')
      .select('*')
      .eq('guide_slug', 'family-resource-guide')
      .maybeSingle(),

    // Start Here cards
    supabase
      .from('guide_start_cards')
      .select('*')
      .eq('guide_slug', 'family-resource-guide')
      .eq('is_active', true)
      .order('display_order'),

    // Playbook sections + items
    supabase
      .from('guide_playbook_sections')
      .select('*, guide_playbook_items(*)')
      .eq('guide_slug', 'family-resource-guide')
      .eq('is_active', true)
      .order('display_order')
      .limit(1),

    // FRG-specific articles
    supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .eq('guide_slug', 'family-resource-guide')
      .eq('published', true)
      .order('display_order')
      .limit(6),

    // FRG categories — V1 parent groups only; legacy rows excluded at query level
    supabase
      .from('guide_categories')
      .select('*')
      .eq('guide_slug', 'family-resource-guide')
      .in('parent_group', [...V1_PARENT_GROUPS])
      .order('display_order'),
  ])

  // Fallback: if no FRG-specific articles, pull 4 most-recent published
  let articlesData = frgArticles ?? []
  if (articlesData.length === 0) {
    const { data: fallback } = await supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(4)
    articlesData = fallback ?? []
  }

  // Fetch FRG listings by guide_type_slug, joined with advertiser_accounts for display fields.
  // FRG internal slug is 'newcomer' (guide_types.url_slug = 'family-resource-guide').
  const { data: listingsRaw } = await supabase
    .from('guide_listings')
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
    .order('display_order')

  const listings: GuideListing[] = ((listingsRaw ?? []) as unknown as RawListingRow[]).map(row => {
    const acc = row.advertiser_accounts
    const gd = (row.guide_data ?? {}) as Record<string, unknown>
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

  // Match listings to categories by normalizing listing.category TEXT against category name/slug.
  const categories: CategoryWithListings[] = (frgCategories ?? []).map(cat => ({
    ...cat,
    listings: listings.filter(l => {
      if (!l.category) return false
      const norm = normalizeForMatch(l.category)
      return norm === normalizeForMatch(cat.name) || norm === cat.slug
    }),
  }))

  // ── Transform start cards ─────────────────────────────────────────────────
  const startCards: StartCard[] = (startCardsRaw ?? []).map(c => ({
    id:          c.id,
    eyebrow:     c.eyebrow,
    title:       c.title,
    summary:     c.summary ?? null,
    ctaLabel:    c.cta_label ?? 'Read',
    ctaHref:     c.cta_href,
    accentColor: c.accent_color ?? null,
  }))

  // ── Transform playbook ────────────────────────────────────────────────────
  let playbookSection: PlaybookSection | undefined
  const firstSection = (playbookSectionsRaw ?? [])[0]
  if (firstSection) {
    const rawItems = (firstSection.guide_playbook_items ?? []) as Array<{
      column_label: string
      display_order: number
      items: unknown
    }>
    const sortedItems = [...rawItems].sort((a, b) => a.display_order - b.display_order)
    playbookSection = {
      title:    firstSection.section_title,
      subtitle: firstSection.section_subtitle ?? null,
      items:    sortedItems.map(r => ({
        columnLabel: r.column_label,
        items: Array.isArray(r.items)
          ? (r.items as string[])
          : typeof r.items === 'string'
            ? JSON.parse(r.items)
            : [],
      })),
    }
  }

  // ── Transform articles ────────────────────────────────────────────────────
  const articles: AnchorArticle[] = articlesData.map(a => ({
    id:          a.id,
    slug:        a.slug,
    title:       a.title,
    excerpt:     a.excerpt ?? '',
    heroImageUrl: a.hero_image_url ?? null,
    category:    a.column_slug ?? null,
    byline:      a.author_name ?? 'River Region Parents',
    href:        articleHref(a.guide_slug ?? '', a.slug),
  }))

  // Real image so the hero never falls back to the dark gradient.
  const heroImageUrl = meta?.hero_image_url
    ?? 'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=1600&q=80&auto=format&fit=crop'
  const heroEyebrow  = meta?.hero_eyebrow  ?? 'OFFICIAL RIVER REGION GUIDE'
  const heroTitle    = meta?.hero_title    ?? 'Family Resource Guide'
  const heroSubtitle = meta?.hero_subtitle ?? 'Everything River Region families need — schools, pediatricians, parks, neighborhoods, and the local network that knows where to send you.'

  // Featured partner: first featured listing across all categories
  const featuredPartner = listings.find(l => l.listing_tier === 'featured') ?? null

  // Trending: up to 4 featured/enhanced listings (skip the featured partner to avoid duplicate)
  const trendingListings = listings
    .filter(l => (l.listing_tier === 'featured' || l.listing_tier === 'enhanced') && l.id !== featuredPartner?.id)
    .slice(0, 4)

  // Resource category grid: unique parent_groups (or category names), up to 4
  const seenGroups = new Set<string>()
  const resourceCategories = (frgCategories ?? []).reduce<Array<{ name: string; iconName: string | null; slug: string }>>((acc, cat) => {
    const key = cat.parent_group ?? cat.name
    if (!seenGroups.has(key)) {
      seenGroups.add(key)
      acc.push({
        name:     key,
        iconName: cat.icon_name ?? null,
        slug:     cat.parent_group
          ? cat.parent_group.toLowerCase().replace(/\s+/g, '-')
          : cat.slug,
      })
    }
    return acc
  }, []).slice(0, 4)

  return (
    <GuideVerticalLayout
      guideSlug="family-resource-guide"
      guideName="Family Resource Guide"
      heroImageUrl={heroImageUrl}
      heroEyebrow={heroEyebrow}
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroPrimaryCta={{ label: 'Explore the Directory', href: '#directory' }}
      featuredPartner={featuredPartner}
      startCards={startCards}
      playbookSection={playbookSection}
      articles={articles}
      resourceCategories={resourceCategories}
      trendingListings={trendingListings}
      directorySlot={<FRGDirectory categories={categories} urlSlug="family-resource-guide" />}
      newsletter={{
        headline:    'Stay Updated',
        subheadline: "We update the guide weekly with new resources and seasonal advice. Sign up for our alerts so you never miss a hidden gem.",
        sourceTag:   'frg',
      }}
      sponsorCta={{
        eyebrow:     'PARTNER WITH US',
        headline:    'Reach Local Families Where They Are',
        subheadline: 'Want your business to be the "Star" of the guide? Our featured spots put you in front of thousands of local parents every week.',
        ctaLabel:    'Get Media Kit',
        ctaHref:     '/advertise/family-resource-guide',
      }}
    />
  )
}
