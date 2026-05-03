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
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params
  const supabase = getSupabase()
  const { data } = await supabase.from('guide_articles').select('title, excerpt').eq('slug', slug).eq('editorial_review_status', 'approved').maybeSingle()
  if (!data) return { title: 'Article — River Region Parents' }
  return {
    title:       `${data.title} — River Region Parents`,
    description: data.excerpt ?? undefined,
  }
}

export default async function ArticleFallbackPage({ params }: PageParams) {
  const { slug } = await params
  const supabase = getSupabase()

  const [articleRes, trendingRes, inlineAdRes] = await Promise.all([
    supabase.from('guide_articles')
      .select('*')
      .eq('slug', slug)
      .eq('editorial_review_status', 'approved')
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, column_slug, guide_slug, created_at')
      .eq('editorial_review_status', 'approved')
      .neq('slug', slug)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('ad_placements')
      .select('*')
      .eq('placement_type', 'article_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1).maybeSingle(),
  ])

  if (!articleRes.data) notFound()

  const article = articleRes.data

  // If this article actually has a column_slug, redirect would be ideal but we just render
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'May 2026'

  const wordCount = (article.body as string | null)?.split(/\s+/).length ?? 0
  const readTimeMinutes = article.read_time_minutes ?? Math.max(1, Math.round(wordCount / 200))

  const trendingMapped = (trendingRes.data ?? []).map((t) => {
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

  const heroImageUrl = article.hero_image_url || getFallbackByContext(article.guide_slug ?? 'parenting', article.id)
  const shareUrl = `${SITE_URL}/articles/${slug}`

  const categoryLabel = article.guide_slug
    ? String(article.guide_slug).replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Feature'

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
          publishedDate={publishedDate}
          readTimeMinutes={readTimeMinutes}
          title={article.title}
        />

        <ArticleAuthorBlock
          authorName={article.author_name ?? 'River Region Parents'}
          authorRole="Editorial"
          authorAvatarUrl={null}
          shareUrl={shareUrl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <article className="lg:col-span-8">
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
              inlineAd={inlineAdRes.data ? (
                <InArticleAd
                  headline={inlineAdRes.data.ad_headline ?? ''}
                  description={inlineAdRes.data.ad_description ?? ''}
                  ctaLabel={inlineAdRes.data.ad_cta_label ?? 'Learn More'}
                  ctaUrl={inlineAdRes.data.ad_link ?? '#'}
                />
              ) : undefined}
            />

            {article.author_bio && (
              <div className="mt-12 pt-8 border-t border-border/60 bg-muted/30 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground italic leading-relaxed">{article.author_bio}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border/60">
              <Badge variant="secondary" className="px-3 py-1 bg-muted">{categoryLabel}</Badge>
              {article.issue_year && article.issue_month && (
                <Badge variant="secondary" className="px-3 py-1 bg-muted">
                  {new Date(Number(article.issue_year), Number(article.issue_month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Badge>
              )}
            </div>

            <div className="mt-8">
              <Link href="/articles" className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors">
                ← Back to All Articles
              </Link>
            </div>
          </article>

          <ArticleSidebar stickyAd={null} sponsoredAd={null} trending={trendingMapped} />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
