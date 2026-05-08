import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GuidePageLayout } from '@/components/guides/GuidePageLayout'
import type { StartCard, PlaybookSection, AnchorArticle } from '@/components/guides/GuidePageLayout'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { FreeListing } from '@/components/family-guide/FreeListing'
import type { GuideListing, GuideCategory } from '@/components/family-guide/types'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Family Resource Guide | River Region Parents',
  description: 'Everything River Region families need — schools, pediatricians, parks, neighborhoods, and the local network that knows where to send you.',
}

// ── FRG Directory slot ────────────────────────────────────────────────────────

type CategoryWithListings = GuideCategory & { listings: GuideListing[] }

function FRGDirectory({ categories }: { categories: CategoryWithListings[] }) {
  const allListings = categories.flatMap(c => c.listings ?? [])

  if (allListings.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
          Local Directory
        </p>
        <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 20 }}>
          Local Resources
        </h2>
        <div style={{ borderRadius: 20, border: '1.5px dashed rgba(26,39,68,0.15)', backgroundColor: 'white', padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--fg-mid, #666)', lineHeight: 1.65, marginBottom: 20 }}>
            Listings coming soon — submit yours to be among the first.
          </p>
          <Link
            href="/advertise/family-resource-guide"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', textDecoration: 'none', border: '1.5px solid var(--fg-navy, #1a2744)', padding: '10px 22px', borderRadius: 10 }}
          >
            Submit your listing <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  // Group by parent_group
  const groupMap = new Map<string, CategoryWithListings[]>()
  for (const cat of categories) {
    if (!(cat.listings ?? []).length) continue
    const group = cat.parent_group ?? cat.name
    if (!groupMap.has(group)) groupMap.set(group, [])
    groupMap.get(group)!.push(cat)
  }
  const groups = [...groupMap.keys()]

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
        Local Directory
      </p>
      <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 6 }}>
        Local Resources
      </h2>
      <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 32 }}>
        {allListings.length} listing{allListings.length !== 1 ? 's' : ''} across {categories.length} categories
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        {groups.map(groupName => {
          const cats = groupMap.get(groupName)!
          const featured = cats.flatMap(c => c.listings.filter(l => l.listing_tier === 'featured'))
          const enhanced = cats.flatMap(c => c.listings.filter(l => l.listing_tier === 'enhanced'))
          const free     = cats.flatMap(c => c.listings.filter(l => l.listing_tier === 'free'))
          return (
            <section key={groupName}>
              <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(212,168,71,0.3)' }}>
                {groupName}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {featured.map(l => <FeaturedListing key={l.id} listing={l} />)}
                {enhanced.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {enhanced.map(l => <EnhancedListing key={l.id} listing={l} />)}
                  </div>
                )}
                {free.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {free.map(l => <FreeListing key={l.id} listing={l} />)}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
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

    // FRG categories (post-migration: guide_slug = 'family-resource-guide')
    supabase
      .from('guide_categories')
      .select('*')
      .eq('guide_slug', 'family-resource-guide')
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

  // Fetch listings for categories
  const categoryIds = (frgCategories ?? []).map(c => c.id)
  let listings: GuideListing[] = []
  if (categoryIds.length > 0) {
    const { data: listingsRaw } = await supabase
      .from('guide_listings')
      .select('*')
      .in('category_id', categoryIds)
      .eq('needs_research', false)
      .order('listing_tier')
      .order('display_order')
    listings = (listingsRaw ?? []) as GuideListing[]
  }

  // Build categories-with-listings structure
  const categories: CategoryWithListings[] = (frgCategories ?? []).map(cat => ({
    ...cat,
    listings: listings.filter(l => l.category_id === cat.id),
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

  // ── Hero values — null fallback triggers gradient in GuidePageLayout ──────
  const heroImageUrl    = meta?.hero_image_url    ?? null
  const heroEyebrow     = meta?.hero_eyebrow      ?? 'RIVER REGION PARENTS · FAMILY RESOURCE GUIDE'
  const heroTitle       = meta?.hero_title        ?? 'Your Guide to Raising a Family Here'
  const heroSubtitle    = meta?.hero_subtitle     ?? 'Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and Eastchase — everything your family needs, in one place.'
  const heroIssueLabel  = meta?.hero_issue_label  ?? 'Newcomer Issue · June 2026'

  return (
    <GuidePageLayout
      guideSlug="family-resource-guide"
      heroImageUrl={heroImageUrl}
      heroEyebrow={heroEyebrow}
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroIssueLabel={heroIssueLabel}
      heroPrimaryCta={{ label: 'Start Here', href: '#start-here' }}
      heroSecondaryCta={{ label: 'Browse Resources', href: '#directory' }}
      startCards={startCards}
      playbookSection={playbookSection}
      articles={articles}
      directorySlot={<FRGDirectory categories={categories} />}
      newsletter={{
        headline:    'Stay in the Loop',
        subheadline: "Get our weekly email with what's new, what's coming up, and what local moms are talking about.",
        sourceTag:   'frg',
      }}
      sponsorCta={{
        eyebrow:     'PARTNER WITH US',
        headline:    'Be the First Name Families See',
        subheadline: 'A featured listing puts your business in front of every family new to the River Region — year-round.',
        ctaLabel:    'See partnership options',
        ctaHref:     '/advertise/family-resource-guide',
      }}
    />
  )
}
