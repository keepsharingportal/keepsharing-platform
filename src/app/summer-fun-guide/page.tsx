import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GuidePageLayout } from '@/components/guides/GuidePageLayout'
import type { StartCard, PlaybookSection, AnchorArticle } from '@/components/guides/GuidePageLayout'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Summer Fun Guide | River Region Parents',
  description: "The River Region's definitive guide to summer — camps, splash pads, day trips, festivals, and the local know-how to make it the summer your kids remember.",
}

// ── Summer Fun listing type (summer_fun_guide table) ──────────────────────────

interface SummerFunListing {
  id: string
  business_name: string
  category: string
  description: string | null
  ages: string | null
  photo_url: string | null
  price_range: string | null
  registration_status: string | null
  indoor_outdoor: string | null
  listing_tier: string
  phone: string | null
  website: string | null
  neighborhood_tag: string | null
  featured: boolean
}

// ── Summer Fun directory slot ─────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { advertiser: 0, enhanced: 1, community: 2 }

const PRICE_LABELS: Record<string, string> = {
  free: 'Free',
  'under-100': 'Under $100',
  '100-250': '$100–$250',
  '250-plus': '$250+',
  varies: 'Varies',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#16a34a',
  waitlist: '#d97706',
  full: '#dc2626',
  'opening-soon': '#7c3aed',
  tbd: '#6b7280',
}

function SummerFunListingsGrid({ listings }: { listings: SummerFunListing[] }) {
  if (listings.length === 0) {
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
  const grouped = new Map<string, SummerFunListing[]>()
  for (const l of listings) {
    if (!grouped.has(l.category)) grouped.set(l.category, [])
    grouped.get(l.category)!.push(l)
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
      <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 32 }}>
        {listings.length} listing{listings.length !== 1 ? 's' : ''} across {categories.length} categories
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {categories.map(cat => (
          <section key={cat}>
            <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(212,168,71,0.3)' }}>
              {cat}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {grouped.get(cat)!
                .sort((a, b) => (TIER_ORDER[a.listing_tier] ?? 9) - (TIER_ORDER[b.listing_tier] ?? 9))
                .map(listing => (
                  <div
                    key={listing.id}
                    style={{
                      borderRadius: 16,
                      border: listing.listing_tier === 'advertiser'
                        ? '2px solid var(--fg-gold, #d4a847)'
                        : '1.5px solid rgba(0,0,0,0.08)',
                      backgroundColor: 'white',
                      padding: '20px 20px 16px',
                      boxShadow: listing.listing_tier === 'advertiser'
                        ? '0 4px 16px rgba(212,168,71,0.15)'
                        : '0 1px 4px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {listing.listing_tier === 'advertiser' && (
                      <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a847)', backgroundColor: 'rgba(212,168,71,0.1)', border: '1px solid rgba(212,168,71,0.25)', padding: '2px 7px', borderRadius: 3, alignSelf: 'flex-start' }}>
                        Featured
                      </span>
                    )}
                    <h4 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', lineHeight: 1.3 }}>
                      {listing.business_name}
                    </h4>

                    {/* Meta chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {listing.ages && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-navy, #1a2744)', backgroundColor: '#f0f4ff', padding: '2px 8px', borderRadius: 4 }}>
                          {listing.ages}
                        </span>
                      )}
                      {listing.price_range && listing.price_range in PRICE_LABELS && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>
                          {PRICE_LABELS[listing.price_range]}
                        </span>
                      )}
                      {listing.indoor_outdoor && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', backgroundColor: '#faf5ff', padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                          {listing.indoor_outdoor}
                        </span>
                      )}
                      {listing.registration_status && listing.registration_status !== 'open' && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[listing.registration_status] ?? '#6b7280', backgroundColor: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                          {listing.registration_status.replace('-', ' ')}
                        </span>
                      )}
                    </div>

                    {listing.description && (
                      <p style={{ fontSize: 13, color: 'var(--fg-body, #374151)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
                        {listing.description}
                      </p>
                    )}

                    {/* Action links */}
                    {(listing.website || listing.phone) && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
                          <a
                            href={`tel:${listing.phone}`}
                            style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-mid, #666)', textDecoration: 'none' }}
                          >
                            {listing.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SummerFunGuidePage() {
  const supabase = await createClient()

  const [
    { data: meta },
    { data: startCardsRaw },
    { data: playbookSectionsRaw },
    { data: sfgArticles },
    { data: sfgListings },
  ] = await Promise.all([
    // Guide meta (hero copy)
    supabase
      .from('guide_meta')
      .select('*')
      .eq('guide_slug', 'summer-fun-guide')
      .maybeSingle(),

    // Start Here cards
    supabase
      .from('guide_start_cards')
      .select('*')
      .eq('guide_slug', 'summer-fun-guide')
      .eq('is_active', true)
      .order('display_order'),

    // Playbook sections + items
    supabase
      .from('guide_playbook_sections')
      .select('*, guide_playbook_items(*)')
      .eq('guide_slug', 'summer-fun-guide')
      .eq('is_active', true)
      .order('display_order')
      .limit(1),

    // Summer Fun articles (try guide_slug 'summer-fun-guide' and 'summer-fun')
    supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .in('guide_slug', ['summer-fun-guide', 'summer-fun'])
      .eq('published', true)
      .order('display_order')
      .limit(6),

    // Summer Fun listings
    supabase
      .from('summer_fun_guide')
      .select('id, business_name, category, description, ages, photo_url, price_range, registration_status, indoor_outdoor, listing_tier, phone, website, neighborhood_tag, featured')
      .order('listing_tier')
      .order('business_name'),
  ])

  // Fallback articles: if no summer-specific articles, pull 4 most-recent published
  let articlesData = sfgArticles ?? []
  if (articlesData.length === 0) {
    const { data: fallback } = await supabase
      .from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, guide_slug, column_slug')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(4)
    articlesData = fallback ?? []
  }

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
    href:        `/summer-fun-guide/articles/${a.slug}`,
  }))

  // ── Hero values with fallbacks ────────────────────────────────────────────
  const heroImageUrl   = meta?.hero_image_url    ?? null
  const heroEyebrow    = meta?.hero_eyebrow      ?? 'RIVER REGION PARENTS · SUMMER FUN GUIDE'
  const heroTitle      = meta?.hero_title        ?? 'Make This Summer the One They Remember'
  const heroSubtitle   = meta?.hero_subtitle     ?? 'Camps, splash pads, day trips, festivals, and lazy-afternoon ideas — everything that keeps summer feeling like summer in the River Region.'
  const heroIssueLabel = meta?.hero_issue_label  ?? 'Summer Issue · 2026'

  const listings = (sfgListings ?? []) as SummerFunListing[]

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
      directorySlot={<SummerFunListingsGrid listings={listings} />}
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
