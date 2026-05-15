import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
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
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { columnLabel, guideLabel, verticalForColumn, verticalHref } from '@/lib/content-taxonomy'
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
  const { data } = await supabase.from('guide_articles').select('title, excerpt').eq('slug', slug).eq('published', true).maybeSingle()
  if (!data) return { title: 'Article — River Region Parents' }
  return {
    title:       `${data.title} — River Region Parents`,
    description: data.excerpt ?? undefined,
  }
}

export default async function ArticleFallbackPage({ params }: PageParams) {
  const { slug } = await params
  const supabase = getSupabase()

  const [articleRes, inlineAdRes] = await Promise.all([
    supabase.from('guide_articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle(),
    supabase.from('ad_placements')
      .select('*')
      .eq('placement_type', 'article_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
  ])

  if (!articleRes.data) notFound()

  const article = articleRes.data
  const columnSlug = article.column_slug as string | null
  const guideSlug  = article.guide_slug  as string | null

  // Related content — priority: same column → same guide → recent school bits
  const relatedRes = await (async () => {
    if (columnSlug) {
      const { data } = await supabase.from('guide_articles')
        .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug, guide_slug')
        .eq('column_slug', columnSlug)
        .eq('published', true)
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
    .neq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(4)

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const wordCount      = (article.body as string | null)?.split(/\s+/).length ?? 0
  const readTimeMinutes = article.read_time_minutes ?? Math.max(1, Math.round(wordCount / 200))

  const trendingMapped = (trendingData ?? []).map((t) => {
    const tcs = t.column_slug as string | null
    return {
      id:             t.id,
      title:          t.title,
      slug:           t.slug,
      hero_image_url: t.hero_image_url as string | null,
      date_label:     new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      href:           tcs
        ? `/columns/${tcs}/${t.slug.replace(new RegExp(`^${tcs}-`), '')}`
        : `/articles/${t.slug}`,
    }
  })

  const heroImageUrl  = article.hero_image_url || getFallbackByContext(guideSlug ?? columnSlug ?? 'parenting', article.id)
  const shareUrl      = `${SITE_URL}/articles/${slug}`
  const isSchoolBits   = columnSlug === 'school-bits'
  const isRoundup      = isSchoolBits && article.title.includes('Student Spotlights')
  const isTeacher      = columnSlug === 'teacher-of-month'
  const isContributor  = ['mom-to-mom', 'grumpy-but-grateful', 'grands-greatest', 'dave-says', 'meeting-kids', 'teens-tweens-screens'].includes(columnSlug ?? '')

  // Section badge prefers the column's parent vertical (e.g. "School Zone")
  // and shows the column as a sub-chip (e.g. "School Bits"). Falls back to
  // column-only when no vertical, then to guide-only, then to "Feature".
  const vertical     = verticalForColumn(columnSlug)
  const verticalLink = vertical ? verticalHref(vertical.slug) : null

  const categoryLabel = vertical?.label
    ?? (columnSlug ? columnLabel(columnSlug) : null)
    ?? (guideSlug  ? guideLabel(guideSlug)   : null)
    ?? 'Feature'

  const categoryHref = vertical && verticalLink
    ? verticalLink
    : columnSlug ? `/columns/${columnSlug}`
    : undefined

  // Sub-chip only when we have BOTH a vertical and a column to show under it.
  const subCategoryLabel = vertical && columnSlug ? columnLabel(columnSlug) : null
  const subCategoryHref  = vertical && columnSlug
    ? (columnSlug === 'school-bits' ? '/school-bits' : `/columns/${columnSlug}`)
    : null

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
      <Navigation />

      <main className="container py-8 md:py-12">
        <ArticleHeader
          category={categoryLabel}
          categoryHref={categoryHref}
          subCategory={subCategoryLabel}
          subCategoryHref={subCategoryHref}
          publishedDate={publishedDate}
          readTimeMinutes={readTimeMinutes}
          title={article.title}
        />

        <ArticleAuthorBlock
          authorName={article.author_name ?? 'River Region Parents'}
          authorRole={isSchoolBits ? 'School Bits' : 'Editorial'}
          authorAvatarUrl={null}
          shareUrl={shareUrl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <article className="lg:col-span-8">
            {/* Hero image — skipped for templates that render their own hero */}
            {!isTeacher && !isContributor && (
              <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden mb-8 shadow-sm border border-border/50">
                <Image
                  src={heroImageUrl}
                  alt={article.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Article body — template selected by column_slug */}
            {(() => {
              // Only render the inline ad when it has a real destination URL
              const adNode = (inlineAdRes.data && inlineAdRes.data.ad_link) ? (
                <InArticleAd
                  headline={inlineAdRes.data.ad_headline ?? ''}
                  description={inlineAdRes.data.ad_description ?? ''}
                  ctaLabel={inlineAdRes.data.ad_cta_label ?? 'Learn More'}
                  ctaUrl={inlineAdRes.data.ad_link}
                />
              ) : undefined

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
                    excerpt={article.excerpt as string | null | undefined}
                    heroImageUrl={heroImageUrl}
                    authorName={article.author_name as string | null | undefined}
                    authorBio={article.author_bio as string | null | undefined}
                    publishedAt={article.published_at as string | null | undefined}
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
                  inlineAd={adNode}
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
                    const href = rCs === 'school-bits'
                      ? `/articles/${r.slug}`
                      : rCs
                        ? `/columns/${rCs}/${r.slug.replace(new RegExp(`^${rCs}-`), '')}`
                        : `/articles/${r.slug}`
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
