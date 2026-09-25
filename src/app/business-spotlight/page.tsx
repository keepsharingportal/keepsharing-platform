// /business-spotlight — the parent-facing partner stories hub.
//
// This URL used to be the paid application form; that moved to
// /business-spotlight/apply. The distinction matters editorially: a reader
// arriving here is looking for a dentist who is good with frightened
// four-year-olds, not for ad rates. So the hero speaks to them, the form is a
// single line at the bottom, and every card is a real story.
//
// Source of truth is PUBLISHED guide_articles with column_slug =
// 'business-spotlight' — the same corpus every other column reads. The
// business_spotlights table is intake and review only; nothing on this page
// touches it, and nothing here publishes anything.

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader, SectionHeader, ArticleCard, ContentCard } from '@/components/theme'
import { Button } from '@/components/ui/button'
import { Store, ArrowRight, Sparkles } from 'lucide-react'
import { INDUSTRIES, industryFromParam, type Industry } from '@/lib/business-spotlight/industries'
import { articleHref } from '@/lib/articles/slug'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo/jsonld'
import type { Metadata } from 'next'

export const revalidate = 600

const COLUMN_SLUG = 'business-spotlight'

interface Props {
  searchParams: Promise<{ industry?: string }>
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { industry: industryParam } = await searchParams
  const industry = industryFromParam(industryParam)
  const { buildPageMetadata } = await import('@/lib/seo/metadata')

  return buildPageMetadata({
    title: industry
      ? `${industry.label} — Business Spotlights`
      : 'Business Spotlights',
    description: industry
      ? `${industry.blurb} Meet the ${industry.label.toLowerCase()} businesses River Region families rely on.`
      : 'Meet the local businesses behind River Region families — real stories about the people who take care of your kids, feed your family, and keep your house standing.',
    // Canonical always points at the unfiltered hub. The filtered views are
    // the same stories in a different order; letting each one claim its own
    // canonical would split the page's ranking eight ways.
    path:     '/business-spotlight',
    type:     'website',
    keywords: ['Montgomery local business', 'River Region businesses', 'business spotlight', 'local family businesses'],
  })
}

type SpotlightRow = {
  id: string; title: string; slug: string
  excerpt: string | null; body: string | null
  hero_image_url: string | null
  author_name: string | null
  published_at: string | null
  column_slug: string | null
  industry: string | null
  spotlight_featured: boolean | null
}

const BASE_COLS = 'id, title, slug, excerpt, body, hero_image_url, author_name, published_at, column_slug'

export default async function BusinessSpotlightHubPage({ searchParams }: Props) {
  const { industry: industryParam } = await searchParams
  const activeIndustry = industryFromParam(industryParam)

  const supabase = getSupabase()

  // One query, filtered in JS. The whole published spotlight corpus is a
  // couple of dozen rows for the foreseeable future, so a round trip per
  // industry buys nothing, and the chip counts need the full set anyway.
  // Revisit if this ever passes a few hundred.
  //
  // body is included because ArticleCard derives a teaser from it when an
  // editor hasn't written an excerpt; it's the one heavy field here.
  const { data, error } = await supabase
    .from('guide_articles')
    .select(`${BASE_COLS}, industry, spotlight_featured`)
    .eq('column_slug', COLUMN_SLUG)
    .eq('published', true)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })

  // Migration 231 may not be applied yet, and PostgREST fails the whole query
  // on an unknown column name. Retry without the new fields so the hub still
  // lists every story — just unfiltered — instead of rendering empty.
  let allStories: SpotlightRow[]
  if (error) {
    const { data: fallback } = await supabase
      .from('guide_articles')
      .select(BASE_COLS)
      .eq('column_slug', COLUMN_SLUG)
      .eq('published', true)
      .is('deleted_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
    allStories = ((fallback ?? []) as Array<Omit<SpotlightRow, 'industry' | 'spotlight_featured'>>)
      .map(r => ({ ...r, industry: null, spotlight_featured: false }))
  } else {
    allStories = (data ?? []) as unknown as SpotlightRow[]
  }

  // Counts come from the FULL set so a chip never reads "0" for an industry
  // that has stories — the count describes the chip's destination, not the
  // view you're currently looking at.
  const countByLabel = new Map<string, number>()
  for (const s of allStories) {
    if (!s.industry) continue
    countByLabel.set(s.industry, (countByLabel.get(s.industry) ?? 0) + 1)
  }
  const industriesWithStories = INDUSTRIES.filter(i => (countByLabel.get(i.label) ?? 0) > 0)

  const visible = activeIndustry
    ? allStories.filter(s => s.industry === activeIndustry.label)
    : allStories

  // Featured is editor-pinned, newest first, capped at 3. When nobody has
  // pinned anything it falls back to the newest stories rather than
  // disappearing — an empty Featured band above a full grid reads as broken.
  const pinned      = visible.filter(s => s.spotlight_featured)
  const featured    = (pinned.length > 0 ? pinned : visible).slice(0, 3)
  const featuredIds = new Set(featured.map(f => f.id))
  const rest        = visible.filter(s => !featuredIds.has(s.id))

  const ctx = await loadBrandContext()
  const seo = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const listLd = itemListJsonLd({
    name: activeIndustry ? `${activeIndustry.label} Business Spotlights` : 'Business Spotlights',
    items: visible.slice(0, 30).map(s => ({
      name:  s.title,
      url:   `${seo.url}${articleHref(s)}`,
      ...(s.hero_image_url ? { image: s.hero_image_url } : {}),
    })),
  })
  const crumbsLd = breadcrumbJsonLd([
    { name: 'Home',                path: '/' },
    { name: 'Business Spotlights', path: '/business-spotlight' },
  ], seo.url)

  return (
    <div className="min-h-screen bg-background public-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbsLd) }} />

      <Navigation />

      {/* Reader-facing hero. Deliberately not "advertise with us" — a parent
          who lands here from search is looking for a business, not a rate
          card. The pitch lives once, at the bottom. */}
      <PageHeader
        title="The Businesses Behind Our Families"
        subtitle="The dentist who is good with frightened four-year-olds. The shop that stayed open late. Real stories about the local people River Region families count on."
        badge={{ text: 'Local Business Stories', variant: 'secondary' }}
        variant="cream"
        align="center"
        withBlur
      />

      <main className="container py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Business Spotlights' },
          ]}
        />

        {allStories.length === 0 ? (
          /* Zero published stories. The hub still has to be a real page — it
             is linked from the nav from day one. */
          <div className="max-w-xl mx-auto text-center py-12">
            <Store className="h-12 w-12 text-primary/40 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-foreground mb-3">The first stories are being written</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We&apos;re sitting down with local businesses across the River Region right
              now. Check back soon — or, if you run one, tell us yours.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/business-spotlight/apply">Tell us your story →</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ── Featured ─────────────────────────────────────────────── */}
            {featured.length > 0 && (
              <section className="mb-14">
                <SectionHeader
                  title={activeIndustry ? `Featured in ${activeIndustry.label}` : 'Featured Stories'}
                  icon={Sparkles}
                  iconColor="accent"
                  size="md"
                  withDivider
                />
                <div className={
                  featured.length === 1 ? 'grid gap-6'
                  : featured.length === 2 ? 'grid md:grid-cols-2 gap-6'
                  : 'grid md:grid-cols-3 gap-6'
                }>
                  {featured.map(s => (
                    <ArticleCard key={s.id} article={s} showAuthor={false} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Browse by industry ───────────────────────────────────── */}
            {industriesWithStories.length > 0 && (
              <section className="mb-14">
                <SectionHeader title="Browse by Industry" size="md" withDivider />
                <IndustryChips
                  industries={industriesWithStories}
                  counts={countByLabel}
                  active={activeIndustry}
                />
                {activeIndustry && (
                  <p className="mt-4 text-sm text-muted-foreground">{activeIndustry.blurb}</p>
                )}
              </section>
            )}

            {/* ── All stories ──────────────────────────────────────────── */}
            <section>
              <SectionHeader
                title={
                  activeIndustry
                    ? `${activeIndustry.label} — ${visible.length} ${visible.length === 1 ? 'story' : 'stories'}`
                    : 'All Stories'
                }
                size="md"
                withDivider
              />
              {rest.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(s => (
                    <ArticleCard key={s.id} article={s} showAuthor={false} />
                  ))}
                </div>
              ) : visible.length > 0 ? (
                <p className="text-muted-foreground py-4">
                  That&rsquo;s everything here so far — more on the way.
                </p>
              ) : (
                /* An industry chip only renders when it has stories, so this
                   is reachable only from a hand-typed or stale URL. */
                <div className="py-8">
                  <p className="text-muted-foreground mb-4">
                    No {activeIndustry?.label.toLowerCase()} stories published yet.
                  </p>
                  <Link
                    href="/business-spotlight"
                    className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    See every spotlight <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Footer CTA — the only "advertise" moment on the page ────── */}
        <section className="mt-16">
          <div className="max-w-2xl mx-auto">
            <ContentCard variant="tinted" size="lg">
              <div className="text-center">
                <Store className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Run a business families should know about?
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We&apos;ll interview you and write the story properly — no ad copy, no
                  template. Tell us what you do and we&apos;ll take it from there.
                </p>
                <Button asChild className="rounded-full">
                  <Link href="/business-spotlight/apply">Tell us your story →</Link>
                </Button>
              </div>
            </ContentCard>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

/** Industry filter chips. Server-rendered links rather than client state, so
 *  every filtered view is a real shareable URL and works without JS. */
function IndustryChips({
  industries, counts, active,
}: {
  industries: Industry[]
  counts:     Map<string, number>
  active:     Industry | null
}) {
  const base = 'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors'
  const on   = `${base} border-primary bg-primary text-primary-foreground`
  const off  = `${base} border-border text-muted-foreground hover:border-primary/50 hover:text-foreground`

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link href="/business-spotlight" className={active ? off : on}>All</Link>
      {industries.map(i => {
        const isActive = active?.slug === i.slug
        return (
          <Link
            key={i.slug}
            href={`/business-spotlight?industry=${i.slug}`}
            title={i.blurb}
            className={isActive ? on : off}
          >
            {i.label}
            <span className={isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}>
              {counts.get(i.label) ?? 0}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
