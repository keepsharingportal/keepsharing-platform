import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GuidePageLayout } from '@/components/guides/GuidePageLayout'
import type { StartCard, PlaybookSection, AnchorArticle } from '@/components/guides/GuidePageLayout'
import { ArrowRight } from 'lucide-react'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Family Resource Guide | River Region Parents',
  description: 'Everything River Region families need — schools, pediatricians, parks, neighborhoods, and the local network that knows where to send you.',
}

// ── Placeholder directory slot ────────────────────────────────────────────────

function EmptyDirectory() {
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

// ── Data helpers ──────────────────────────────────────────────────────────────

function articleHref(guideSlug: string, slug: string): string {
  // Route newcomer-guide and newcomer articles to /newcomer-guide/articles/
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

  // ── Hero values with fallbacks ────────────────────────────────────────────
  const heroImageUrl    = meta?.hero_image_url    ?? 'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=1600&q=80'
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
      directorySlot={<EmptyDirectory />}
      newsletter={{
        headline:    'Stay in the Loop',
        subheadline: 'Get our weekly email with what\'s new, what\'s coming up, and what local moms are talking about.',
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
