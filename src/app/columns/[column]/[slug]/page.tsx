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
import { TrackArticleView } from '@/components/tracking/TrackArticleView'
import {
  SpotlightTopStrip, SpotlightQuickHits, SpotlightEyebrow,
} from '@/components/articles/Spotlight'
import { ArticleGallery, type GalleryImage } from '@/components/articles/ArticleGallery'
import { getSpotlightTemplate } from '@/lib/articles/spotlight-templates'
import {
  SectionSponsorMobile, SectionSponsorSidebar, SectionSponsorOutro,
} from '@/components/articles/SectionSponsor'
import { NominateCTA } from '@/components/articles/NominateCTA'
import { getActiveSectionSponsor } from '@/lib/section-sponsors'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { verticalForColumn, verticalHref, columnBadgeStyle } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
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
  params: Promise<{ column: string; slug: string }>
}

async function getArticleData(columnSlug: string, articleSlug: string) {
  const supabase = getSupabase()

  // Historically slugs were stored with the column prefix (e.g.
  // 'mom-to-mom-hayley-denny'); newer articles may save just the bare slug
  // ('harper-loves-perfect-season'). Look up both within this column.
  const fullSlug    = `${columnSlug}-${articleSlug}`
  const candidates  = fullSlug === articleSlug ? [articleSlug] : [fullSlug, articleSlug]

  const [articleRes, columnRes, trendingRes, stickyAdRes, sponsoredAdRes, inlineAdRes] = await Promise.all([
    supabase.from('guide_articles')
      .select('*')
      .in('slug', candidates)
      .eq('column_slug', columnSlug)
      .eq('published', true)
      .order('slug', { ascending: false })  // prefer the prefixed form when both exist
      .limit(1)
      .maybeSingle(),
    supabase.from('monthly_columns')
      .select('*')
      .eq('slug', columnSlug)
      .maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, column_slug, guide_slug, created_at')
      .eq('published', true)
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

  // Section sponsor — when active, overrides the rotating sidebar sticky ad
  // and gets premium placement under the hero on mobile + sidebar on desktop.
  // Returns null when no sponsor is active for this column; components render
  // nothing in that case so we don't get empty boxes.
  const sectionSponsor = await getActiveSectionSponsor(getSupabase(), column)

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const wordCount = (article.body as string | null)?.split(/\s+/).length ?? 0
  const readTimeMinutes = article.read_time_minutes ?? Math.max(1, Math.round(wordCount / 200))

  // Map trending articles to sidebar shape
  const trendingMapped = trending.map((t) => ({
    id:            t.id,
    title:         t.title,
    slug:          t.slug,
    hero_image_url: t.hero_image_url as string | null,
    date_label:    new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    href:          articleHref({ slug: t.slug, title: t.title, column_slug: t.column_slug as string | null }),
  }))

  // Map ad_placements to sidebar shape (using actual DB column names)
  // Suppress sidebar ads that have no destination URL — a '#' link confuses users
  const stickyAdMapped = (stickyAd && stickyAd.ad_link) ? {
    id:             stickyAd.id,
    headline:       stickyAd.ad_headline ?? '',
    description:    stickyAd.ad_description ?? '',
    cta_label:      stickyAd.ad_cta_label ?? 'Learn More',
    cta_url:        stickyAd.ad_link,
    advertiser_name: (stickyAd.advertiser as { business_name?: string } | null)?.business_name ?? stickyAd.ad_headline ?? '',
  } : null

  const sponsoredAdMapped = (sponsoredAd && sponsoredAd.ad_link) ? {
    id:             sponsoredAd.id,
    headline:       sponsoredAd.ad_headline ?? '',
    description:    sponsoredAd.ad_description ?? '',
    cta_label:      sponsoredAd.ad_cta_label ?? 'Learn More',
    cta_url:        sponsoredAd.ad_link,
    advertiser_name: (sponsoredAd.advertiser as { business_name?: string } | null)?.business_name ?? sponsoredAd.ad_headline ?? '',
  } : null

  const heroImageUrl = article.hero_image_url || getFallbackByContext(column, article.id)
  const shareUrl = `${SITE_URL}/columns/${column}/${slug}`
  const columnDisplay = columnData?.display_name
    ?? column.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  // Column is the editorial brand readers recognize, so it wins the primary
  // badge. Vertical is only a fallback when there's nothing else to show.
  const vertical      = verticalForColumn(column)
  const verticalLink  = vertical ? verticalHref(vertical.slug) : null
  const categoryLabel = columnDisplay
    ?? vertical?.label
    ?? 'Feature'
  const categoryHref  = column
    ? (column === 'school-bits' ? '/school-bits' : `/columns/${column}`)
    : (vertical && verticalLink) ? verticalLink
    : undefined

  // pull_quotes stored as JSON array of strings in migration 018 format
  const rawPullQuotes = article.pull_quotes
  const pullQuotes: string[] = Array.isArray(rawPullQuotes)
    ? rawPullQuotes.filter((q): q is string => typeof q === 'string')
    : []

  // Play Ball / Sports Spotlight: structured Q&A added on top of the article
  // body when spotlight_type is set. Three templates (athlete/coach/volunteer)
  // each with a 5-cell top strip and a Quick Hits sidebar.
  const spotlightType = (article.spotlight_type as string | null) ?? null
  const spotlightData = (article.spotlight_data as Record<string, unknown> | null) ?? null
  const isSpotlight   = spotlightType !== null

  // Photo gallery — JSONB array from migration 099. Renders below the body,
  // above Quick Hits for spotlights or above the author bio otherwise.
  const rawGallery = article.gallery_images
  const galleryImages: GalleryImage[] = Array.isArray(rawGallery)
    ? (rawGallery as GalleryImage[]).filter(img => !!img && typeof img.url === 'string')
    : []
  const spotlightTpl    = getSpotlightTemplate(spotlightType)
  const galleryEyebrow  = spotlightTpl?.eyebrow ?? null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* View tracker — fires once per session per article after 3s on page.
          Carries first-touch UTM attribution so the report can show what
          drove this reader (magazine QR, social share, organic search). */}
      <TrackArticleView articleId={article.id as string} />

      <main className="container py-8 md:py-12">
        {/* Brand-aware spotlight eyebrow when the article opts into a
            spotlight type (Play Ball / Teacher / Mom). Color + format come
            from the column brand, not hard-coded navy. */}
        {isSpotlight && (
          <SpotlightEyebrow spotlightType={spotlightType} columnSlug={column} />
        )}

        <ArticleHeader
          /* Hide the column badge for Spotlight articles — the SpotlightEyebrow
             above is the category indicator now, no duplicate "Play Ball" pill. */
          category={isSpotlight ? undefined : categoryLabel}
          categoryHref={isSpotlight ? undefined : categoryHref}
          badgeClassName={columnBadgeStyle(column)}
          title={article.title}
          subtitle={article.subtitle as string | null}
        />

        {/* Meta row sits between the title and the hero: date · read · author
            on the left, share buttons on the right. */}
        <ArticleAuthorBlock
          authorName={(article.author_name as string | null) ?? null}
          publishedDate={publishedDate}
          readTimeMinutes={readTimeMinutes}
          shareUrl={shareUrl}
        />

        {/* Nominate pill — compact CTA in the column's brand color, sitting
            between the meta row and the article body. Full-width on mobile,
            right-aligned on desktop. Hidden on non-spotlight columns. */}
        <NominateCTA columnSlug={column} variant="pill" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <article className="lg:col-span-8">
            {/* Hero image — anchored to top so faces never crop. */}
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

            {/* Section sponsor — mobile-only strip immediately under the hero,
                before any other content. 80% of readers are on mobile and
                stacked-below-body sidebars don't get seen; this is the
                premium slot. Desktop renders this same sponsor in the
                sidebar (see SectionSponsorSidebar in ArticleSidebar slot). */}
            <SectionSponsorMobile sponsor={sectionSponsor} columnSlug={column} />

            {/* Spotlight top strip — brand-colored vitals row (navy for
                Play Ball, apple-red for Teacher, rose for Mom). */}
            {isSpotlight && (
              <div className="mb-8">
                <SpotlightTopStrip spotlightType={spotlightType} spotlightData={spotlightData} columnSlug={column} />
              </div>
            )}

            <ArticleBody
              body={article.body ?? ''}
              pullQuotes={pullQuotes}
              columnSlug={column}
              inlineAd={inlineAd ? (
                <InArticleAd
                  headline={inlineAd.ad_headline ?? ''}
                  description={inlineAd.ad_description ?? ''}
                  ctaLabel={inlineAd.ad_cta_label ?? 'Learn More'}
                  ctaUrl={inlineAd.ad_link ?? '#'}
                />
              ) : undefined}
            />

            {/* Photo gallery — branded lightbox. Sits between the body and
                Quick Hits so the prose leads, photos sit in the middle, then
                the Q&A finale closes out the spotlight. */}
            <ArticleGallery
              images={galleryImages}
              columnSlug={column}
              spotlightEyebrow={galleryEyebrow}
            />

            {/* Spotlight Quick Hits — only renders when the template has
                filled quickHits (Play Ball does, Mom + Teacher don't by
                default). Brand colors come from the column. */}
            {isSpotlight && (
              <div className="mt-12">
                <SpotlightQuickHits spotlightType={spotlightType} spotlightData={spotlightData} columnSlug={column} />
              </div>
            )}

            {/* Section sponsor footer outro — bigger "Thank you to our sponsor"
                block. Renders on every breakpoint, closing the article with
                reinforced brand association. */}
            <SectionSponsorOutro sponsor={sectionSponsor} columnSlug={column} />

            {/* Nominate CTA — only renders on community spotlight columns
                (Play Ball / Teacher / Grands / Mom). Other columns: null. */}
            <NominateCTA columnSlug={column} variant="article" />

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
            /* When a section sponsor is active, they pre-empt the regular
               sticky ad rotation and take the top of the sidebar. Suppress
               stickyAd to avoid the section sponsor + a competing ad
               doubling up. The desktop SectionSponsorSidebar lives in
               topSlot — it self-hides on mobile (the mobile strip above
               handles that breakpoint). */
            stickyAd={sectionSponsor ? null : stickyAdMapped}
            sponsoredAd={sponsoredAdMapped}
            trending={trendingMapped}
            topSlot={<SectionSponsorSidebar sponsor={sectionSponsor} columnSlug={column} />}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}