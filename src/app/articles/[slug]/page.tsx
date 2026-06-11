import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { ArticleHeader } from '@/components/articles/ArticleHeader'
import { ArticleAuthorBlock } from '@/components/articles/ArticleAuthorBlock'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { SchoolBitsRoundupArticle } from '@/components/articles/SchoolBitsRoundupArticle'
import { TeacherOfMonthLayout } from '@/components/articles/templates/TeacherOfMonthLayout'
import { ContributorArticleLayout } from '@/components/articles/templates/ContributorArticleLayout'
import { ArticleSidebar } from '@/components/articles/ArticleSidebar'
import { InArticleAd } from '@/components/articles/InArticleAd'
import { RelatedFromVertical } from '@/components/verticals/RelatedFromVertical'
import { ArticleViewBeacon } from '@/components/tracking/ArticleViewBeacon'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { columnLabel, guideLabel, verticalForColumn, verticalHref, columnBadgeStyle } from '@/lib/content-taxonomy'
import { findArticleBySlug, articleHref } from '@/lib/articles/slug'
import { loadBrandContext, articleCanonicalUrl } from '@/lib/brand-context'
import { GraduationCap, ArrowRight, Calendar, Heart } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params
  const supabase = getSupabase()
  // Tolerate legacy rows with non-canonical slugs (capitalization, spaces).
  const data = await findArticleBySlug<{ title: string; excerpt: string | null; brand_slug: string | null }>(
    supabase,
    slug,
    'title, excerpt, brand_slug',
  )
  const ctx = await loadBrandContext()
  if (!data) return { title: `Article — ${ctx.market.displayName}` }

  // Cross-publish SEO: when this article is being viewed on a syndicated
  // brand's domain (e.g., ESP showing an article that originated at RRP),
  // the canonical URL points back to the origin brand. Google attributes
  // the ranking signal to the origin so duplicate-content penalties don't
  // erode the platform's overall SEO.
  const articleBrand = data.brand_slug ?? 'rrp'
  const canonical = articleCanonicalUrl(
    { brand_slug: articleBrand, slug },
    ctx.slug,
    `/articles/${slug}`,
  )

  return {
    title:       `${data.title} — ${ctx.market.displayName}`,
    description: data.excerpt ?? undefined,
    alternates: { canonical },
  }
}

export default async function ArticleFallbackPage({ params }: PageParams) {
  const { slug } = await params
  const supabase = getSupabase()
  const brandCtx = await loadBrandContext()

  const [articleData, inlineAdRes] = await Promise.all([
    // Slug-tolerant lookup — finds the row even when the DB has a legacy
    // slug with spaces/capitalization (URL is always canonicalized via
    // articleHref).
    findArticleBySlug<Record<string, unknown>>(supabase, slug, '*'),
    // Pull up to 6 active inline ads. The body renderer below distributes
    // them across 1-3 positions based on article length, weighted by
    // rotation_weight so full-page advertisers get more visibility than
    // quarter-page in the same pool.
    supabase.from('ad_placements')
      .select('*')
      .eq('placement_type', 'article_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(6),
  ])

  if (!articleData) {
    console.warn('[/articles/[slug]] no article found for slug:', slug)
    notFound()
  }

  // Brand visibility check: an article shows on a brand's site if that
  // brand is the origin OR appears in syndicated_to_brands. If neither,
  // 404 — visitors of brand X shouldn't see articles that only belong to
  // brand Y, even if they guess the URL.
  const articleBrand        = (articleData as { brand_slug?: string }).brand_slug ?? 'rrp'
  const articleSyndicatedTo = ((articleData as { syndicated_to_brands?: string[] }).syndicated_to_brands ?? [])
  const visibleOnThisBrand  = articleBrand === brandCtx.slug || articleSyndicatedTo.includes(brandCtx.slug)
  if (!visibleOnThisBrand) {
    console.info('[/articles/[slug]] article exists but not syndicated to current brand', {
      slug, articleBrand, currentBrand: brandCtx.slug,
    })
    notFound()
  }

  // The page's downstream code reads a wide variety of columns off
  // `article`. Cast to `any` here so we don't have to enumerate every
  // optional field in the helper's generic. Field-level safety stays in
  // the existing `as string | null` casts at each call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const article: any = articleData

  // Guard against a row that somehow returned without the NOT NULL
  // title/id fields populated — surfaces in Vercel logs instead of
  // crashing the page with a less-obvious TypeError.
  if (!article.title || !article.id) {
    console.error('[/articles/[slug]] article row missing required fields', {
      slug,
      hasTitle: !!article.title,
      hasId:    !!article.id,
      keys:     Object.keys(article).slice(0, 20),
    })
    notFound()
  }
  const columnSlug = article.column_slug as string | null
  const guideSlug  = article.guide_slug  as string | null

  // Related content — priority: same column → same guide → recent school bits
  // All "Related" picks are filtered by brand so cross-brand bleed-through
  // doesn't surface RRP articles in an ESP "Related" rail.
  const brandFilter = `brand_slug.eq.${brandCtx.slug},syndicated_to_brands.cs.{${brandCtx.slug}}`
  const relatedRes = await (async () => {
    if (columnSlug) {
      const { data } = await supabase.from('guide_articles')
        .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug, guide_slug')
        .eq('column_slug', columnSlug)
        .eq('published', true)
        .or(brandFilter)
        .neq('slug', slug)
        .order('published_at', { ascending: false })
        .limit(4)
      if (data?.length) return data
    }
    if (guideSlug) {
      const { data } = await supabase.from('guide_articles')
        .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug, guide_slug')
        .eq('guide_slug', guideSlug)
        .eq('published', true)
        .or(brandFilter)
        .neq('slug', slug)
        .order('published_at', { ascending: false })
        .limit(4)
      if (data?.length) return data
    }
    // Fallback: newest school bits
    const { data } = await supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug, guide_slug')
      .eq('column_slug', 'school-bits')
      .eq('published', true)
      .or(brandFilter)
      .neq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(4)
    return data ?? []
  })()

  const related = relatedRes.slice(0, 3)

  // Sidebar trending
  const { data: trendingData } = await supabase.from('guide_articles')
    .select('id, title, slug, hero_image_url, column_slug, guide_slug, created_at')
    .eq('published', true)
    .or(brandFilter)
    .neq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(4)

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const wordCount      = (article.body as string | null)?.split(/\s+/).length ?? 0
  const readTimeMinutes = article.read_time_minutes ?? Math.max(1, Math.round(wordCount / 200))

  const trendingMapped = (trendingData ?? []).map((t) => ({
    id:             t.id,
    title:          t.title,
    slug:           t.slug,
    hero_image_url: t.hero_image_url as string | null,
    date_label:     new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    href:           articleHref({ slug: t.slug, title: t.title, column_slug: t.column_slug as string | null }),
  }))

  const heroImageUrl  = article.hero_image_url || getFallbackByContext(guideSlug ?? columnSlug ?? 'parenting', article.id)
  const shareUrl      = `${SITE_URL}/articles/${slug}`
  const isSchoolBits   = columnSlug === 'school-bits'
  const isRoundup      = isSchoolBits && article.title.includes('Student Spotlights')
  const isTeacher      = columnSlug === 'teacher-of-month'
  const isContributor  = ['mom-to-mom', 'grumpy-but-grateful', 'grands-greatest', 'dave-says', 'meeting-kids', 'teens-tweens-screens'].includes(columnSlug ?? '')

  // Section badge prefers the column (the editorial brand readers recognize —
  // "Mom to Mom", "School Bits"). Falls back to guide, then vertical, then
  // "Feature" if none of those exist.
  const vertical     = verticalForColumn(columnSlug)
  const verticalLink = vertical ? verticalHref(vertical.slug) : null

  const categoryLabel = (columnSlug ? columnLabel(columnSlug) : null)
    ?? (guideSlug  ? guideLabel(guideSlug)   : null)
    ?? vertical?.label
    ?? 'Feature'

  const categoryHref = columnSlug
    ? (columnSlug === 'school-bits' ? '/school-bits' : `/columns/${columnSlug}`)
    : (vertical && verticalLink) ? verticalLink
    : undefined

  const relatedLabel  = columnSlug
    ? `More ${columnLabel(columnSlug)}`
    : guideSlug
      ? `More from the ${guideLabel(guideSlug)} Guide`
      : 'More Articles'
  const relatedAllHref = isSchoolBits ? '/school-bits'
    : columnSlug ? `/columns/${columnSlug}`
    : '/articles'
  const relatedAllLabel = isSchoolBits ? 'View All School Stories'
    : columnSlug ? `All ${columnLabel(columnSlug)} Articles`
    : 'Browse All Articles'

  const rawPullQuotes = article.pull_quotes
  const pullQuotes: string[] = Array.isArray(rawPullQuotes)
    ? rawPullQuotes.filter((q): q is string => typeof q === 'string')
    : []

  return (
    <div className="min-h-screen bg-background public-page">
      <ArticleViewBeacon articleId={article.id as string} />
      <Navigation />

      {/* Breadcrumb trail — Home > Articles [> Column] > [Title]. The
          column hop is only included when the article belongs to a
          named column we can link to. */}
      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home',     href: '/'         },
              { label: 'Articles', href: '/articles' },
              ...(categoryLabel && categoryHref
                ? [{ label: categoryLabel, href: categoryHref }]
                : []),
              { label: article.title as string },
            ]}
          />
        </div>
      </div>

      <main className="container py-8 md:py-12">
        <ArticleHeader
          category={categoryLabel}
          categoryHref={categoryHref}
          badgeClassName={columnBadgeStyle(columnSlug)}
          title={article.title}
          subtitle={article.subtitle as string | null}
        />

        {/* Meta row sits between the title and the hero: date · read · author
            on the left, share buttons on the right. Closes the gap that used
            to appear when the page-level author block collapsed to share-only. */}
        <ArticleAuthorBlock
          authorName={(article.author_name as string | null) ?? null}
          publishedDate={publishedDate}
          readTimeMinutes={readTimeMinutes}
          shareUrl={shareUrl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <article className="lg:col-span-8">
            {/* Hero image — skipped for templates that render their own hero.
                Anchored to top so faces never crop. */}
            {!isTeacher && !isContributor && (
              <div className="relative w-full aspect-[3/2] md:aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-sm border border-border/50">
                <Image
                  src={heroImageUrl}
                  alt={article.title}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Article body — template selected by column_slug */}
            {(() => {
              // Multi-slot allocation — pick 1-3 inline ads weighted by
              // rotation_weight with refill so a single advertiser fills
              // every position when they're alone in the pool.
              type InlineAdRow = {
                id?: string; ad_headline?: string; ad_description?: string;
                ad_cta_label?: string; ad_link?: string; ad_image_url?: string;
                creative_mode?: 'composed' | 'image' | null
                rotation_weight?: number
              }
              const pool = (inlineAdRes.data ?? []) as InlineAdRow[]
              const adsWithLinks = pool.filter(p => p.ad_link)
              const slotCount = wordCount < 350 ? 0 : wordCount < 600 ? 1 : wordCount < 1100 ? 2 : 3
              function pickInline(p: InlineAdRow[]): InlineAdRow | null {
                if (p.length === 0) return null
                const total = p.reduce((s, a) => s + (a.rotation_weight ?? 1), 0)
                if (total <= 0) return p[0]
                let r = Math.random() * total
                for (const a of p) { r -= a.rotation_weight ?? 1; if (r <= 0) return a }
                return p[p.length - 1]
              }
              const allocated: InlineAdRow[] = []
              {
                let p = [...adsWithLinks]
                for (let i = 0; i < slotCount; i++) {
                  if (p.length === 0) p = [...adsWithLinks]
                  const picked = pickInline(p)
                  if (!picked) break
                  allocated.push(picked)
                  p = p.filter(x => x.id !== picked.id)
                }
              }
              const adNodes: React.ReactNode[] = allocated.map((ad, idx) => (
                <InArticleAd
                  key={`${ad.id ?? 'ad'}-${idx}`}
                  headline={ad.ad_headline ?? ''}
                  description={ad.ad_description ?? ''}
                  ctaLabel={ad.ad_cta_label ?? 'Learn More'}
                  ctaUrl={ad.ad_link ?? '#'}
                  imageUrl={ad.ad_image_url ?? null}
                  creativeMode={ad.creative_mode ?? 'composed'}
                />
              ))
              // Legacy single-slot for the templates that still take a
              // single inlineAd prop (Teacher, Contributor, etc.) — pass
              // the first allocated ad so they get one body insertion.
              const adNode = adNodes[0]

              if (isRoundup) {
                return (
                  <SchoolBitsRoundupArticle
                    body={article.body ?? ''}
                    pullQuotes={pullQuotes}
                    inlineAd={adNode}
                  />
                )
              }

              if (isTeacher) {
                return (
                  <TeacherOfMonthLayout
                    title={article.title}
                    excerpt={article.excerpt as string | null | undefined}
                    heroImageUrl={heroImageUrl}
                    authorName={article.author_name as string | null | undefined}
                    publishedAt={article.published_at as string | null | undefined}
                    body={article.body ?? ''}
                    pullQuotes={pullQuotes}
                    inlineAd={adNode}
                    articleId={article.id}
                  />
                )
              }

              if (isContributor) {
                return (
                  <ContributorArticleLayout
                    title={article.title}
                    subtitle={article.subtitle as string | null | undefined}
                    heroImageUrl={heroImageUrl}
                    authorName={article.author_name as string | null | undefined}
                    columnSlug={columnSlug ?? 'mom-to-mom'}
                    body={article.body ?? ''}
                    pullQuotes={pullQuotes}
                    inlineAd={adNode}
                    articleId={article.id}
                  />
                )
              }

              return (
                <ArticleBody
                  body={article.body ?? ''}
                  pullQuotes={pullQuotes}
                  inlineAds={adNodes}
                />
              )
            })()}

            {/* Author bio */}
            {article.author_bio && (
              <div className="mt-12 pt-8 border-t border-border/60 bg-muted/30 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground italic leading-relaxed">{article.author_bio}</p>
              </div>
            )}

            {/* Tags */}
            {(guideSlug || (article.issue_year && article.issue_month)) && (
              <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-border/60">
                {guideSlug && (
                  <Badge variant="secondary" className="px-3 py-1 bg-muted">
                    {String(guideSlug).replace(/-/g, ' ')}
                  </Badge>
                )}
                {article.issue_year && article.issue_month && (
                  <Badge variant="secondary" className="px-3 py-1 bg-muted">
                    {new Date(Number(article.issue_year), Number(article.issue_month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Badge>
                )}
              </div>
            )}

            {/* Community CTAs */}
            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              {isSchoolBits && (
                <Link
                  href="/nominate"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Nominate a Teacher</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Recognize a River Region educator</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              <Link
                href="/calendar"
                className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/5 border border-secondary/20 hover:bg-secondary/10 hover:border-secondary/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground group-hover:text-secondary transition-colors">Events Calendar</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">See what's happening this week</p>
                </div>
                <ArrowRight className="h-4 w-4 text-secondary shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/family-resource-guide"
                className="flex items-center gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/20 hover:bg-accent/10 hover:border-accent/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Heart className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">Family Resource Guide</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Local services for River Region families</p>
                </div>
                <ArrowRight className="h-4 w-4 text-accent shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {!isSchoolBits && (
                <Link
                  href="/summer-fun-guide"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">☀️</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground">Summer Fun Guide</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Camps, splash pads & day trips</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-600 shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>

            {/* Cross-pollination — more articles from the same vertical
                (broader than the same-column related block below) */}
            {(article.vertical_slug as string | null) && (
              <div className="mt-10 pt-6 border-t border-border/40">
                <RelatedFromVertical
                  verticalSlug={article.vertical_slug as string}
                  excludeId={article.id as string}
                  limit={3}
                />
              </div>
            )}

            {/* Related content */}
            {related.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border/60">
                <h3 className="text-lg font-bold text-foreground mb-5">
                  {relatedLabel}
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map(r => {
                    const rCs = r.column_slug as string | null
                    const href = articleHref({ slug: r.slug, title: r.title, column_slug: rCs })
                    const rHero = r.hero_image_url || getFallbackByContext(r.guide_slug ?? rCs ?? 'parenting', r.id)
                    return (
                      <Link
                        key={r.id}
                        href={href}
                        className="group flex flex-col rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
                      >
                        <div className="relative aspect-[3/2] overflow-hidden">
                          <Image
                            src={rHero}
                            alt={r.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="33vw"
                            className="group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {r.title}
                          </p>
                          {r.published_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>

                <div className="mt-5 text-center">
                  <Link
                    href={relatedAllHref}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {relatedAllLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Back nav */}
            <div className="mt-8">
              <Link
                href={relatedAllHref}
                className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors"
              >
                ← {isSchoolBits ? 'Back to School Bits' : columnSlug ? `Back to ${columnLabel(columnSlug)}` : 'Back to All Articles'}
              </Link>
            </div>
          </article>

          <ArticleSidebar
            stickyAd={null}
            sponsoredAd={isRoundup ? {
              id:              'school-bits-sponsor',
              headline:        'Become an Education Partner',
              description:     'Support student achievement and reach River Region families who care about education.',
              cta_label:       'Advertise With Us',
              cta_url:         '/advertise',
              advertiser_name: 'Education Partner',
            } : null}
            trending={trendingMapped}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
