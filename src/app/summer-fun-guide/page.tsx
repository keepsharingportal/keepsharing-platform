import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import { GuidePageLayout } from '@/components/guides/GuidePageLayout'
import type { StartCard, PlaybookSection, AnchorArticle } from '@/components/guides/GuidePageLayout'

export const revalidate = 600

interface Props {
  searchParams: Promise<{ category?: string }>
}

export const metadata: Metadata = {
  title: 'Summer Fun Guide | River Region Parents',
  description: "Camps, day trips, splash spots, and the activities that make summer feel like summer in the River Region.",
}

// ── Real listing shape from guide_listings + advertiser_accounts ──────────────

interface SummerListing {
  id:           string
  slug:         string | null
  business:     string
  category:     string | null
  tier:         string
  ages:         string | null
  description:  string | null
  address:      string | null
  city:         string | null
  phone:        string | null
  website:      string | null
  email:        string | null
}

interface RawListingRow {
  id:            string
  category:      string | null
  listing_tier:  string
  guide_data:    Record<string, unknown> | null
  display_order: number | null
  advertiser_accounts: {
    slug:           string | null
    business_name:  string
    office_phone:   string | null
    contact_email:  string | null
    website_url:    string | null
    address:        string | null
    city_state_zip: string | null
  } | null
}

const TIER_ORDER: Record<string, number> = { featured: 0, enhanced: 1, community: 2 }

// ── Directory grid ────────────────────────────────────────────────────────────

function SummerFunListingsGrid({
  listings, totalCount, activeCategory, allCategories,
}: {
  listings:       SummerListing[]
  totalCount:     number
  activeCategory: string | null
  allCategories:  string[]
}) {
  if (totalCount === 0) {
    return (
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
          Summer Directory
        </p>
        <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 20 }}>
          Activities & Programs
        </h2>
        <div style={{ borderRadius: 20, border: '1.5px dashed rgba(26,39,68,0.15)', backgroundColor: 'white', padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--fg-mid, #666)', lineHeight: 1.65, marginBottom: 20 }}>
            Summer listings coming soon — check back as the season opens up.
          </p>
          <Link
            href="/advertise/summer-fun-guide"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', textDecoration: 'none', border: '1.5px solid var(--fg-navy, #1a2744)', padding: '10px 22px', borderRadius: 10 }}
          >
            Submit a listing <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  // Group by category
  const grouped = new Map<string, SummerListing[]>()
  for (const l of listings) {
    const k = l.category || 'Other'
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k)!.push(l)
  }
  const categories = [...grouped.keys()].sort()

  return (
    <div id="directory">
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
        Summer Directory
      </p>
      <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 6 }}>
        Activities & Programs
      </h2>
      <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 20 }}>
        {listings.length} {activeCategory ? 'in this category' : 'listings'} across {categories.length} categories
      </p>

      {/* Category filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32 }}>
        <Link
          href="/summer-fun-guide"
          style={{
            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20,
            textDecoration: 'none',
            backgroundColor: !activeCategory ? 'var(--fg-navy, #1a2744)' : 'white',
            color: !activeCategory ? 'white' : 'var(--fg-navy, #1a2744)',
            border: '1px solid rgba(26,39,68,0.15)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <Filter size={11} /> All
        </Link>
        {allCategories.map(c => (
          <Link
            key={c}
            href={`/summer-fun-guide?category=${encodeURIComponent(c)}`}
            style={{
              fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 20,
              textDecoration: 'none',
              backgroundColor: activeCategory === c ? 'var(--fg-navy, #1a2744)' : 'white',
              color: activeCategory === c ? 'white' : 'var(--fg-mid, #555)',
              border: '1px solid rgba(26,39,68,0.12)',
            }}
          >
            {c}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {categories.map(cat => (
          <section key={cat}>
            <h3 id={cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')} style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(212,168,71,0.3)' }}>
              {cat}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {grouped.get(cat)!
                .sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9))
                .map(listing => {
                  const isFeatured = listing.tier === 'featured'
                  return (
                    <div
                      key={listing.id}
                      style={{
                        borderRadius: 16,
                        border: isFeatured ? '2px solid var(--fg-gold, #d4a847)' : '1.5px solid rgba(0,0,0,0.08)',
                        backgroundColor: 'white',
                        padding: '20px 20px 16px',
                        boxShadow: isFeatured ? '0 4px 16px rgba(212,168,71,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      {isFeatured && (
                        <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a847)', backgroundColor: 'rgba(212,168,71,0.1)', border: '1px solid rgba(212,168,71,0.25)', padding: '2px 7px', borderRadius: 3, alignSelf: 'flex-start' }}>
                          Featured
                        </span>
                      )}
                      <h4 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', lineHeight: 1.3 }}>
                        {listing.slug ? (
                          <Link href={`/summer-fun-guide/listings/${listing.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {listing.business}
                          </Link>
                        ) : listing.business}
                      </h4>

                      {/* Meta chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {listing.ages && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-navy, #1a2744)', backgroundColor: '#f0f4ff', padding: '2px 8px', borderRadius: 4 }}>
                            {listing.ages}
                          </span>
                        )}
                        {listing.city && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>
                            {listing.city}
                          </span>
                        )}
                      </div>

                      {listing.description && (
                        <p style={{ fontSize: 13, color: 'var(--fg-body, #374151)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, whiteSpace: 'pre-wrap' }}>
                          {listing.description}
                        </p>
                      )}

                      {(listing.website || listing.phone) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                          {listing.website && (
                            <a
                              href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                            >
                              Visit website <ArrowRight size={11} />
                            </a>
                          )}
                          {listing.phone && (
                            <a href={`tel:${listing.phone}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-mid, #666)', textDecoration: 'none' }}>
                              {listing.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SummerFunGuidePage({ searchParams }: Props) {
  const { category } = await searchParams
  const supabase     = await createClient()

  const listingQuery = supabase
    .from('guide_listings')
    .select(`
      id, category, listing_tier, guide_data, display_order,
      advertiser_accounts ( slug, business_name, office_phone, contact_email, website_url, address, city_state_zip )
    `)
    .eq('guide_type_slug', 'summer-fun')
    .eq('is_published', true)
    .order('display_order', { ascending: true })

  if (category) listingQuery.eq('category', category)

  const [
    { data: meta },
    { data: startCardsRaw },
    { data: playbookSectionsRaw },
    { data: sfgArticles },
    { data: sfgListings },
    { data: configRow },
  ] = await Promise.all([
    supabase.from('guide_meta').select('*').eq('guide_slug', 'summer-fun-guide').maybeSingle(),

    supabase.from('guide_start_cards')
      .select('*')
      .eq('guide_slug', 'summer-fun-guide').eq('is_active', true)
      .order('display_order'),

    supabase.from('guide_playbook_sections')
      .select('*, guide_playbook_items(*)')
      .eq('guide_slug', 'summer-fun-guide').eq('is_active', true)
      .order('display_order').limit(1),

    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .in('guide_slug', ['summer-fun-guide', 'summer-fun'])
      .eq('published', true)
      .order('display_order')
      .limit(6),

    listingQuery,

    supabase.from('guide_configs').select('*').eq('guide_type_slug', 'summer-fun').maybeSingle(),
  ])

  // Fallback articles
  let articlesData = sfgArticles ?? []
  if (articlesData.length === 0) {
    const { data: fb } = await supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(4)
    articlesData = fb ?? []
  }

  // ── Transform start cards
  const startCards: StartCard[] = (startCardsRaw ?? []).map(c => ({
    id:          c.id,
    eyebrow:     c.eyebrow,
    title:       c.title,
    summary:     c.summary ?? null,
    ctaLabel:    c.cta_label ?? 'Read',
    ctaHref:     c.cta_href,
    accentColor: c.accent_color ?? null,
  }))

  // ── Transform playbook
  let playbookSection: PlaybookSection | undefined
  const firstSection = (playbookSectionsRaw ?? [])[0]
  if (firstSection) {
    const rawItems = (firstSection.guide_playbook_items ?? []) as Array<{
      column_label: string; display_order: number; items: unknown
    }>
    const sortedItems = [...rawItems].sort((a, b) => a.display_order - b.display_order)
    playbookSection = {
      title:    firstSection.section_title,
      subtitle: firstSection.section_subtitle ?? null,
      items:    sortedItems.map(r => ({
        columnLabel: r.column_label,
        items: Array.isArray(r.items) ? (r.items as string[]) : typeof r.items === 'string' ? JSON.parse(r.items) : [],
      })),
    }
  }

  const articles: AnchorArticle[] = articlesData.map(a => ({
    id:           a.id,
    slug:         a.slug,
    title:        a.title,
    excerpt:      a.excerpt ?? '',
    heroImageUrl: a.hero_image_url ?? null,
    category:     a.column_slug ?? null,
    byline:       a.author_name ?? 'River Region Parents',
    href:         `/summer-fun-guide/articles/${a.slug}`,
  }))

  // Get total count + every category that has listings, regardless of the
  // current filter, so the filter chips always show all options.
  const [{ count: totalAll }, { data: allCatRows }] = await Promise.all([
    supabase
      .from('guide_listings')
      .select('id', { count: 'exact', head: true })
      .eq('guide_type_slug', 'summer-fun')
      .eq('is_published', true),
    supabase
      .from('guide_listings')
      .select('category')
      .eq('guide_type_slug', 'summer-fun')
      .eq('is_published', true)
      .not('category', 'is', null),
  ])
  const allCategories = [...new Set((allCatRows ?? []).map(r => r.category as string))].sort()

  // Map raw rows → SummerListing
  const listings: SummerListing[] = ((sfgListings ?? []) as unknown as RawListingRow[]).map(r => {
    const acct = r.advertiser_accounts
    const gd   = r.guide_data ?? {}
    const city = (gd.city as string | null) ?? (acct?.city_state_zip ?? '').split(',')[0]?.trim() ?? null
    return {
      id:          r.id,
      slug:        acct?.slug ?? null,
      business:    acct?.business_name ?? (gd.business as string | null) ?? 'Listing',
      category:    r.category,
      tier:        r.listing_tier,
      ages:        (gd.ages as string | null) ?? null,
      description: (gd.description as string | null) ?? null,
      address:     (gd.address as string | null) ?? acct?.address ?? null,
      city,
      phone:       (gd.phone as string | null)   ?? acct?.office_phone  ?? null,
      website:     (gd.website as string | null) ?? acct?.website_url   ?? null,
      email:       (gd.email as string | null)   ?? acct?.contact_email ?? null,
    }
  })

  // Hero values — config overrides DB meta overrides static fallback
  const heroImageUrl   = configRow?.hero_image_url ?? meta?.hero_image_url ?? null
  const heroEyebrow    = meta?.hero_eyebrow ?? 'RIVER REGION PARENTS · SUMMER FUN GUIDE'
  const heroTitle      = configRow?.title ?? meta?.hero_title ?? 'Make This Summer the One They Remember'
  const heroSubtitle   = configRow?.subtitle ?? meta?.hero_subtitle ?? 'Camps, splash pads, day trips, and 100+ ways to keep summer feeling like summer.'
  const heroIssueLabel = meta?.hero_issue_label ?? 'Summer Issue · 2026'

  return (
    <GuidePageLayout
      guideSlug="summer-fun-guide"
      heroImageUrl={heroImageUrl}
      heroEyebrow={heroEyebrow}
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroIssueLabel={heroIssueLabel}
      heroPrimaryCta={{ label: 'Start Here', href: '#start-here' }}
      heroSecondaryCta={{ label: 'Browse Listings', href: '#directory' }}
      startCards={startCards}
      playbookSection={playbookSection}
      articles={articles}
      directorySlot={<SummerFunListingsGrid listings={listings} totalCount={totalAll ?? listings.length} activeCategory={category ?? null} allCategories={allCategories} />}
      newsletter={{
        headline:    'Get the Weekly Summer Roundup',
        subheadline: 'Every Thursday — what to do this weekend, what to plan ahead for, what to skip.',
        sourceTag:   'summer-fun',
      }}
      sponsorCta={{
        eyebrow:     'PARTNER WITH US',
        headline:    'Be Where Families Are Looking',
        subheadline: 'A featured listing puts your business in front of every River Region family making summer plans.',
        ctaLabel:    'See partnership options',
        ctaHref:     '/advertise/summer-fun-guide',
      }}
    />
  )
}
