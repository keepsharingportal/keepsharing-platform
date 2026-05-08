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
import { ArticleSidebar } from '@/components/articles/ArticleSidebar'
import { InArticleAd } from '@/components/articles/InArticleAd'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import type { Metadata } from 'next'

export const revalidate = 1800

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageParams {
  params: Promise<{ column: string; slug: string }>
}

async function getArticleData(columnSlug: string, articleSlug: string) {
  const supabase = getSupabase()

  // Full slug stored in DB: e.g. 'mom-to-mom-hayley-denny-may-2026'
  const fullSlug = `${columnSlug}-${articleSlug}`

  const [articleRes, columnRes, trendingRes, stickyAdRes, sponsoredAdRes, inlineAdRes] = await Promise.all([
    supabase.from('guide_articles')
      .select('*')
      .eq('slug', fullSlug)
      .eq('column_slug', columnSlug)
      .eq('editorial_review_status', 'approved')
      .maybeSingle(),
    supabase.from('monthly_columns')
      .select('*')
      .eq('slug', columnSlug)
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, column_slug, guide_slug, created_at')
      .eq('editorial_review_status', 'approved')
      .neq('slug', fullSlug)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'article_sidebar_sticky')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'article_sidebar_sponsored')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'article_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
  ])

  if (!articleRes.data) return null

  return {
    article:    articleRes.data,
    column:     columnRes.data,
    trending:   trendingRes.data ?? [],
    stickyAd:   stickyAdRes.data,
    sponsoredAd: sponsoredAdRes.data,
    inlineAd:   inlineAdRes.data,
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { column, slug } = await params
  const data = await getArticleData(column, slug)
  if (!data) return { title: 'Article — River Region Parents' }
  return {
    title:       `${data.article.title} — River Region Parents`,
    description: data.article.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: PageParams) {
  const { column, slug } = await params
  const data = await getArticleData(column, slug)
  if (!data) notFound()

  const { article, column: columnData, trending, stickyAd, sponsoredAd, inlineAd } = data

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'May 2026'

  const wordCount = (article.body as string | null)?.split(/\s+/).length ?? 0
  const readTimeMinutes = article.read_time_minutes ?? Math.max(1, Math.round(wordCount / 200))

  // Map trending articles to sidebar shape
  const trendingMapped = trending.map((t) => {
    const tcs = t.column_slug as string | null
    return {
      id:            t.id,
      title:         t.title,
      slug:          t.slug,
      hero_image_url: t.hero_image_url as string | null,
      date_label:    new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      href:          tcs
        ? `/columns/${tcs}/${t.slug.replace(new RegExp(`^${tcs}-`), '')}`
        : `/articles/${t.slug}`,
    }
  })

  // Map ad_placements to sidebar shape (using actual DB column names)
  const stickyAdMapped = stickyAd ? {
    id:             stickyAd.id,
    headline:       stickyAd.ad_headline ?? '',
    description:    stickyAd.ad_description ?? '',
    cta_label:      stickyAd.ad_cta_label ?? 'Learn More',
    cta_url:        stickyAd.ad_link ?? '#',
    advertiser_name: (stickyAd.advertiser as { business_name?: string } | null)?.business_name ?? stickyAd.ad_headline ?? '',
  } : null

  const sponsoredAdMapped = sponsoredAd ? {
    id:             sponsoredAd.id,
    headline:       sponsoredAd.ad_headline ?? '',
    description:    sponsoredAd.ad_description ?? '',
    cta_label:      sponsoredAd.ad_cta_label ?? 'Learn More',
    cta_url:        sponsoredAd.ad_link ?? '#',
    advertiser_name: (sponsoredAd.advertiser as { business_name?: string } | null)?.business_name ?? sponsoredAd.ad_headline ?? '',
  } : null

  const heroImageUrl = article.hero_image_url || getFallbackByContext(column, article.id)
  const shareUrl = `${SITE_URL}/columns/${column}/${slug}`
  const categoryLabel = columnData?.display_name ?? column

  // pull_quotes stored as JSON array of strings in migration 018 format
  const rawPullQuotes = article.pull_quotes
  const pullQuotes: string[] = Array.isArray(rawPullQuotes)
    ? rawPullQuotes.filter((q): q is string => typeof q === 'string')
    : []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-8 md:py-12">
        <ArticleHeader
          category={categoryLabel}
          categoryHref={`/columns/${column}`}
          publishedDate={publishedDate}
          readTimeMinutes={readTimeMinutes}
          title={article.title}
        />

        <ArticleAuthorBlock
          authorName={article.author_name ?? 'River Region Parents'}
          authorRole={columnData?.display_name ?? 'Editorial'}
          authorAvatarUrl={null}
          shareUrl={shareUrl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <article className="lg:col-span-8">
            {/* Hero image */}
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

            <ArticleBody
              body={article.body ?? ''}
              pullQuotes={pullQuotes}
              inlineAd={inlineAd ? (
                <InArticleAd
                  headline={inlineAd.ad_headline ?? ''}
                  description={inlineAd.ad_description ?? ''}
                  ctaLabel={inlineAd.ad_cta_label ?? 'Learn More'}
                  ctaUrl={inlineAd.ad_link ?? '#'}
                />
              ) : undefined}
            />

            {/* Author bio */}
            {article.author_bio && (
              <div className="mt-12 pt-8 border-t border-border/60 bg-muted/30 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground italic leading-relaxed">{article.author_bio}</p>
              </div>
            )}

            {/* Tags — category removed (already shown in header eyebrow) */}
            {(article.guide_slug || (article.issue_year && article.issue_month)) && (
              <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border/60">
                {article.guide_slug && (
                  <Badge variant="secondary" className="px-3 py-1 bg-muted">
                    {String(article.guide_slug).replace(/-/g, ' ')}
                  </Badge>
                )}
                {article.issue_year && article.issue_month && (
                  <Badge variant="secondary" className="px-3 py-1 bg-muted">
                    {new Date(Number(article.issue_year), Number(article.issue_month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Badge>
                )}
              </div>
            )}

            {/* Back to column link */}
            <div className="mt-8">
              <Link href={`/columns/${column}`} className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors">
                ← More in {categoryLabel}
              </Link>
            </div>
          </article>

          <ArticleSidebar
            stickyAd={stickyAdMapped}
            sponsoredAd={sponsoredAdMapped}
            trending={trendingMapped}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}