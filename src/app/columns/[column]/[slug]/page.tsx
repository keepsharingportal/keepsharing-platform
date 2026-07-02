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
import { ArticleSidebar } from '@/components/articles/ArticleSidebar'
import { InArticleAd } from '@/components/articles/InArticleAd'
import { TrackArticleView } from '@/components/tracking/TrackArticleView'
import {
  SpotlightTopStrip, SpotlightQuickHits, SpotlightEyebrow,
} from '@/components/articles/Spotlight'
import { SpotlightSnapshot } from '@/components/articles/SpotlightSnapshot'
import { MoreInSeries, type SeriesItem } from '@/components/articles/MoreInSeries'
import {
  CommunitySpotlightsCrossPromo,
  type SpotlightCrossPromoItem,
} from '@/components/articles/CommunitySpotlightsCrossPromo'
import { ArticleGallery, type GalleryImage } from '@/components/articles/ArticleGallery'
import { WashiTape } from '@/components/articles/BrandDecor'
import { getSpotlightTemplate, defaultSpotlightTypeForColumn } from '@/lib/articles/spotlight-templates'
import { getColumnBrand } from '@/lib/articles/column-brand'
import { getColumnBranding } from '@/lib/column-branding'
import { GrandsFeatureHero }    from '@/components/articles/grands/GrandsFeatureHero'
import { GrandsSnapshotQuote }  from '@/components/articles/grands/GrandsSnapshotQuote'
import { GrandsBody }            from '@/components/articles/grands/GrandsBody'
import { GrandsNominationBox }   from '@/components/articles/grands/GrandsNominationBox'
import { parseGrandsBody }       from '@/components/articles/grands/GrandsBodyParts'
import { PlayBallFeatureHero }   from '@/components/articles/play-ball/PlayBallFeatureHero'
import { PlayBallSnapshotQuote } from '@/components/articles/play-ball/PlayBallSnapshotQuote'
import { PlayBallQuickHits }     from '@/components/articles/play-ball/PlayBallQuickHits'
import { parsePlayBallBody }     from '@/components/articles/play-ball/PlayBallBodyParts'
import { TeacherFeatureHero }    from '@/components/articles/teacher/TeacherFeatureHero'
import { TeacherPullQuote }      from '@/components/articles/teacher/TeacherPullQuote'
import { TeacherSnapshot }       from '@/components/articles/teacher/TeacherSnapshot'
import { TeacherNominationBox }  from '@/components/articles/teacher/TeacherNominationBox'
import { parseTeacherBody }      from '@/components/articles/teacher/TeacherBodyParts'
import { MomFeatureHero }        from '@/components/articles/mom/MomFeatureHero'
import { MomSnapshot }           from '@/components/articles/mom/MomSnapshot'
import { MomPullQuote }          from '@/components/articles/mom/MomPullQuote'
import { MomBody }               from '@/components/articles/mom/MomBody'
import { MomNominationBox }      from '@/components/articles/mom/MomNominationBox'
import { parseMomBody }          from '@/components/articles/mom/MomBodyParts'
import { getNominateCTA }        from '@/lib/articles/nominate-cta'
import {
  SectionSponsorMobile, SectionSponsorSidebar, SectionSponsorOutro,
} from '@/components/articles/SectionSponsor'
import { NominateCTA } from '@/components/articles/NominateCTA'
import { getActiveSectionSponsor } from '@/lib/section-sponsors'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { verticalForColumn, verticalHref, columnBadgeStyle } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'
import {
  articleJsonLd, breadcrumbJsonLd, jsonLdScript,
} from '@/lib/seo/jsonld'
import { loadBrandContext } from '@/lib/brand-context'

export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

// Derive a ~155-char lead from the article body — used as the FINAL
// fallback for the share/OG description when seo_description, excerpt,
// and dek are all empty. Strips HTML + common markdown, trims at a
// sentence boundary when possible.
function deriveLeadFromBody(body: string | null | undefined): string {
  if (!body) return ''
  const stripped = body
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[#*_>`~]+/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length <= 160) return stripped
  const window = stripped.slice(0, 200)
  const sentenceEnd = window.search(/[.!?]\s/)
  if (sentenceEnd >= 60 && sentenceEnd <= 160) return window.slice(0, sentenceEnd + 1)
  return stripped.slice(0, 155).replace(/\s+\S*$/, '') + '…'
}

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

  // The four community-spotlight columns. Used to fetch the latest
  // article from each of the OTHER three when this article IS a
  // community spotlight — drives the "More Community Spotlights"
  // strip at the bottom of the article instead of a generic back link.
  const SPOTLIGHT_COLUMNS = ['play-ball', 'teacher-of-month', 'grands-greatest', 'mom-to-mom'] as const
  const otherSpotlightSlugs = SPOTLIGHT_COLUMNS.filter(s => s !== columnSlug)

  const [articleRes, columnRes, trendingRes, seriesRes, stickyAdRes, sponsoredAdRes, inlineAdRes, otherSpotlightsRes] = await Promise.all([
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
    /* "More in This Series" — 3 most recent articles from the SAME column,
        excluding the current one. Used by MoreInSeries sidebar card. */
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, column_slug, published_at, created_at')
      .eq('column_slug', columnSlug)
      .eq('published', true)
      .not('slug', 'in', `(${candidates.map(s => `"${s.replace(/"/g, '')}"`).join(',')})`)
      .order('published_at', { ascending: false, nullsFirst: false })
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
    // Pull up to 6 active inline-body ads. The allocator below distributes
    // them across 1-3 positions in the article body, weighted by
    // rotation_weight so a full-page advertiser (weight 4) appears more
    // often than a quarter-page advertiser (weight 1) in the same pool.
    // If only one ad is active, it fills every position (exclusive lock-in).
    supabase.from('ad_placements')
      .select('*, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'article_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(6),
    /* Latest article from each OTHER community spotlight column —
       drives the cross-promo strip at the bottom of the article.
       We over-fetch (limit 12) and de-dupe to one per column in JS,
       since Supabase doesn't have a clean "one per group" query. */
    supabase.from('guide_articles')
      .select('id, title, slug, hero_image_url, column_slug, author_name, published_at, created_at')
      .in('column_slug', otherSpotlightSlugs)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(12),
  ])

  if (!articleRes.data) return null

  // Pick the latest article PER OTHER spotlight column (one each, max 3).
  // Supabase returned up to 12 sorted desc; we take the first match per
  // column so each column contributes at most one card.
  const seenColumns = new Set<string>()
  const otherSpotlights: Array<Record<string, unknown>> = []
  for (const row of (otherSpotlightsRes.data ?? []) as Array<Record<string, unknown>>) {
    const col = row.column_slug as string | null
    if (!col || seenColumns.has(col)) continue
    seenColumns.add(col)
    otherSpotlights.push(row)
    if (otherSpotlights.length === otherSpotlightSlugs.length) break
  }

  return {
    article:    articleRes.data,
    column:     columnRes.data,
    trending:   trendingRes.data ?? [],
    series:     seriesRes.data ?? [],
    stickyAd:   stickyAdRes.data,
    sponsoredAd: sponsoredAdRes.data,
    // Array of up to 6 active inline ads. ArticlePage below decides how
    // many positions the body can carry and allocates them weighted-random.
    inlineAdPool: (inlineAdRes.data ?? []) as Array<Record<string, unknown>>,
    otherSpotlights,
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { column, slug } = await params
  const data = await getArticleData(column, slug)
  if (!data) return { title: 'Article — River Region Parents' }

  const heroImage = (data.article.hero_image_url as string | null)
                 ?? (data.article.web_image_url  as string | null)
                 ?? null

  // Editor-tuned overrides win over the auto-derived defaults. This is
  // the whole point of the /admin/articles/[id]/seo editor — let
  // editors hand-craft the SERP listing when the algorithmic fallback
  // isn't sharp enough.
  const seoTitle    = (data.article.seo_title       as string | null)?.trim()
  const seoDesc     = (data.article.seo_description as string | null)?.trim()
  const canonical   = (data.article.seo_canonical_override as string | null)?.trim()
  const noIndex     = !!data.article.seo_no_index
  const focusKw     = (data.article.seo_focus_keyword as string | null)?.trim()
  const secondaryKw = (data.article.seo_secondary_keywords as string[] | null) ?? []

  // Use || (not ??) so empty-string DB values fall through to the next
  // option. A row with seo_description='' was producing an empty FB
  // OpenGraph description (link previews showed only the title).
  // Final fallback derives from the article body so even untagged articles
  // get a meaningful share description (~155 chars, sentence-aware).
  const description = seoDesc
                   || (data.article.excerpt as string | null)?.trim()
                   || (data.article.dek     as string | null)?.trim()
                   || deriveLeadFromBody(data.article.body as string | null)
                   || `Read ${data.article.title} on River Region Parents.`

  const brandLabel = data.column?.label ?? undefined
  const keywordSet = new Set<string>(
    [
      ...(focusKw ? [focusKw] : []),
      ...secondaryKw,
      ...(brandLabel ? [brandLabel] : []),
      'River Region', 'Parenting',
    ].map(k => k.trim()).filter(Boolean)
  )

  const md = await buildPageMetadata({
    title:         seoTitle || (data.article.title as string),
    description,
    path:          canonical ?? `/columns/${column}/${slug}`,
    image:         heroImage,
    type:          'article',
    publishedTime: (data.article.published_at as string | null) ?? undefined,
    modifiedTime:  (data.article.updated_at   as string | null) ?? undefined,
    authorName:    (data.article.author_name  as string | null) ?? undefined,
    keywords:      Array.from(keywordSet),
    noIndex,
  })

  return md
}

export default async function ArticlePage({ params }: PageParams) {
  const { column, slug } = await params
  const data = await getArticleData(column, slug)
  if (!data) notFound()

  const { article, column: columnData, trending, series, stickyAd, sponsoredAd, inlineAdPool, otherSpotlights } = data

  // Pick 1-3 inline body ads based on article length, distribute by
  // rotation_weight. One advertiser = exclusive in every position;
  // multiple advertisers share, weighted by their tier.
  const inlineAdRows: Array<{
    id?: string; ad_headline?: string; ad_description?: string;
    ad_cta_label?: string; ad_link?: string; ad_image_url?: string;
    advertiser?: { business_name?: string }
    rotation_weight?: number; creative_mode?: 'composed' | 'image' | null
  }> = (inlineAdPool as Array<Record<string, unknown>>).map(r => ({
    id:              r.id              as string | undefined,
    ad_headline:     r.ad_headline     as string | undefined,
    ad_description:  r.ad_description  as string | undefined,
    ad_cta_label:    r.ad_cta_label    as string | undefined,
    ad_link:         r.ad_link         as string | undefined,
    ad_image_url:    r.ad_image_url    as string | undefined,
    advertiser:      r.advertiser      as { business_name?: string } | undefined,
    rotation_weight: typeof r.rotation_weight === 'number' ? r.rotation_weight : 1,
    creative_mode:   (r.creative_mode as 'composed' | 'image' | null | undefined) ?? 'composed',
  }))
  // Estimate body length cheaply by word count → maps to slot count.
  // Avoids re-parsing the body to count chunks here; the renderer is
  // tolerant of empty arrays so an over-eager estimate is harmless.
  const bodyWords = ((article.body as string) ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  const slotCount = bodyWords < 350 ? 0 : bodyWords < 600 ? 1 : bodyWords < 1100 ? 2 : 3
  // Weighted random pick with refill (one advertiser fills all slots).
  function pickInlineSlot(pool: typeof inlineAdRows): typeof inlineAdRows[number] | null {
    if (pool.length === 0) return null
    const total = pool.reduce((s, a) => s + (a.rotation_weight ?? 1), 0)
    if (total <= 0) return pool[0]
    let r = Math.random() * total
    for (const a of pool) { r -= a.rotation_weight ?? 1; if (r <= 0) return a }
    return pool[pool.length - 1]
  }
  const allocatedInlineAds: typeof inlineAdRows = []
  {
    let pool = [...inlineAdRows]
    for (let i = 0; i < slotCount; i++) {
      if (pool.length === 0) pool = [...inlineAdRows]
      const picked = pickInlineSlot(pool)
      if (!picked) break
      allocatedInlineAds.push(picked)
      pool = pool.filter(p => p.id !== picked.id)
    }
  }

  // Section sponsor — when active, overrides the rotating sidebar sticky ad
  // and gets premium placement under the hero on mobile + sidebar on desktop.
  // Returns null when no sponsor is active for this column; components render
  // nothing in that case so we don't get empty boxes.
  const supabaseForExtras = getSupabase()
  const [sectionSponsor, columnBranding] = await Promise.all([
    getActiveSectionSponsor(supabaseForExtras, column),
    /* Per-column editorial branding overrides (uploaded logo + tagline)
       from the column_branding table. Merges with code-default brand for
       the public eyebrow + subtitle render. */
    getColumnBranding(supabaseForExtras, column),
  ])
  const brandedLogoUrl = columnBranding?.logo_url ?? getColumnBrand(column).wordmarkImage ?? null
  const brandedTagline = columnBranding?.tagline ?? getColumnBrand(column).tagline ?? null

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

  // More in This Series — map raw rows to MoreInSeries.SeriesItem shape.
  // Only rendered for community spotlight columns where it actually pays
  // off (Mom / Teacher / Grands / Play Ball); other columns get a regular
  // sidebar without this card.
  const seriesMapped: SeriesItem[] = (series ?? []).map(s => ({
    id:             s.id as string,
    title:          s.title as string,
    slug:           s.slug as string,
    column_slug:    s.column_slug as string | null,
    hero_image_url: s.hero_image_url as string | null,
    date_label:     s.published_at
      ? new Date(s.published_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(s.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

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
  //
  // Grands / Teacher / Mom each have exactly ONE valid spotlight_type so we
  // fall back to the column-implied default when the editor didn't set the
  // field explicitly. Play Ball keeps its manual choice (3 valid types).
  // Without this fallback, a fresh Grands article renders as a plain
  // article — no wordmark hero, no Q&A cards, no Family Moments gallery.
  const rawSpotlightType = (article.spotlight_type as string | null) ?? null
  const spotlightType    = rawSpotlightType ?? defaultSpotlightTypeForColumn(column)
  const spotlightData    = (article.spotlight_data as Record<string, unknown> | null) ?? null
  const isSpotlight      = spotlightType !== null

  // Photo gallery — JSONB array from migration 099. Renders below the body,
  // above Quick Hits for spotlights or above the author bio otherwise.
  const rawGallery = article.gallery_images
  const galleryImages: GalleryImage[] = Array.isArray(rawGallery)
    ? (rawGallery as GalleryImage[]).filter(img => !!img && typeof img.url === 'string')
    : []
  const spotlightTpl    = getSpotlightTemplate(spotlightType)
  const galleryEyebrow  = spotlightTpl?.eyebrow ?? null

  // Grands gets a custom magazine feature treatment — its own hero
  // package + Q&A cards instead of the standard spotlight rendering.
  const isGrandsFeature = column === 'grands-greatest' && isSpotlight
  const grandsParts     = isGrandsFeature
    ? parseGrandsBody(article.body as string ?? '')
    : null
  // Snapshot for the Grands feature — pull the GRAND template's topStrip
  // as the field definitions and build a values dictionary keyed by the
  // same keys. Empty values are filtered out inside the component, so
  // adding new fields to the template automatically flows through here.
  const grandsSnapshotFields = isGrandsFeature && spotlightTpl
    ? spotlightTpl.topStrip.map(f => ({ key: f.key, label: f.label, icon: f.icon }))
    : []
  const grandsSnapshotValues: Record<string, string | null> = {}
  if (isGrandsFeature && spotlightData) {
    for (const f of grandsSnapshotFields) {
      const v = spotlightData[f.key]
      grandsSnapshotValues[f.key] = typeof v === 'string' ? v : null
    }
  }
  const grandsNominateHref = isGrandsFeature
    ? (getNominateCTA(column)?.href ?? '/submit/grands-are-the-greatest')
    : ''
  // Subject's first name for the Q&A section heading — derived from the
  // article title's pre-colon portion ("Debbie Peavy: The Joy..." →
  // "Debbie Peavy"), then taking just the first word so we get
  // "Debbie's Grand Story" instead of "Debbie Peavy's Grand Story".
  const grandsSubjectName = isGrandsFeature && typeof article.title === 'string'
    ? (article.title.includes(':') ? article.title.split(':')[0] : article.title).trim().split(/\s+/)[0]
    : null

  // Play Ball gets the same magazine-feature treatment as Grands —
  // dedicated hero (logo + photo w/ yellow tape), snapshot strip + lead
  // pull quote, and cream/gold Quick Hits card. The lead pull quote is
  // the FIRST <blockquote> lifted out of the article body.
  const isPlayBallFeature = column === 'play-ball' && isSpotlight
  const playBallParts     = isPlayBallFeature
    ? parsePlayBallBody(article.body as string ?? '')
    : null
  const playBallSnapshotFields = isPlayBallFeature && spotlightTpl
    ? spotlightTpl.topStrip.map(f => ({ key: f.key, label: f.label, icon: f.icon }))
    : []
  const playBallQuickHitsFields = isPlayBallFeature && spotlightTpl
    ? spotlightTpl.quickHits.map(f => ({ key: f.key, label: f.label, icon: f.icon }))
    : []
  const playBallValues: Record<string, string | null> = {}
  if (isPlayBallFeature && spotlightData) {
    for (const f of [...playBallSnapshotFields, ...playBallQuickHitsFields]) {
      const v = spotlightData[f.key]
      playBallValues[f.key] = typeof v === 'string' ? v : null
    }
  }
  const playBallQuickHitsTitle = (spotlightTpl?.quickHitsTitle ?? 'Quick Hits')

  // Teacher of the Month feature treatment — same magazine package as
  // Grands / Play Ball but with a Teacher-specific layout: Quick Facts
  // is a vertical SIDEBAR card (not a horizontal strip above the body),
  // and the bottom-of-article nominate CTA is replaced with the navy
  // TeacherNominationBox in the sidebar.
  const isTeacherFeature = column === 'teacher-of-month' && isSpotlight
  const teacherParts     = isTeacherFeature
    ? parseTeacherBody(article.body as string ?? '')
    : null
  const teacherFields = isTeacherFeature && spotlightTpl
    ? spotlightTpl.topStrip.map(f => ({ key: f.key, label: f.label, icon: f.icon }))
    : []
  const teacherValues: Record<string, string | null> = {}
  if (isTeacherFeature && spotlightData) {
    for (const f of teacherFields) {
      const v = spotlightData[f.key]
      teacherValues[f.key] = typeof v === 'string' ? v : null
    }
  }
  const teacherNominateHref = isTeacherFeature
    ? (getNominateCTA(column)?.href ?? '/submit/teacher-of-the-month')
    : ''

  // Mom to Mom feature treatment — soft, editorial magazine package
  // (cream + blush + coral). Hero block above the article+sidebar
  // grid, snapshot strip below the hero, lifted pull quote next, body
  // rendered as intro prose + Q&A cards, and a Mom-specific
  // MomNominationBox replacing the article-bottom NominateCTA.
  const isMomFeature = column === 'mom-to-mom' && isSpotlight
  const momParts     = isMomFeature
    ? parseMomBody(article.body as string ?? '')
    : null
  const momFields = isMomFeature && spotlightTpl
    ? spotlightTpl.topStrip.map(f => ({ key: f.key, label: f.label, icon: f.icon }))
    : []
  const momValues: Record<string, string | null> = {}
  if (isMomFeature && spotlightData) {
    for (const f of momFields) {
      const v = spotlightData[f.key]
      momValues[f.key] = typeof v === 'string' ? v : null
    }
  }
  const momNominateHref = isMomFeature
    ? (getNominateCTA(column)?.href ?? '/submit/mom-to-mom')
    : ''

  // ── JSON-LD: NewsArticle + BreadcrumbList ──────────────────────────────
  // Two structured-data blobs per article so search engines can
  // surface rich results (article cards, breadcrumb trails) without
  // having to reverse-engineer our markup. NewsArticle now includes
  // speakable spec (voice rich results) + wordCount + a snippet of
  // articleBody (content-quality signal) + keyword list.
  const seoCtx = await loadBrandContext()
  const { getBrandSeoConfig: _getBrandSeo } = await import('@/lib/seo/brand-seo')
  const articleSeoCfg = _getBrandSeo(seoCtx.market, seoCtx.publicOrigin)
  const heroForLd = (article.hero_image_url as string | null)
                 ?? (article.web_image_url  as string | null)
                 ?? null
  // Plain-text article body for speakable / wordCount / snippet.
  // Strip HTML tags, normalize whitespace.
  const articleBodyPlain = ((article.body as string | null) ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const articleUrl = `${seoCtx.publicOrigin}/columns/${column}/${slug}`
  const { authorNameToSlug } = await import('@/lib/seo/author-slug')
  const authorSlug = authorNameToSlug(article.author_name as string | null)
  const authorUrl  = authorSlug ? `${articleSeoCfg.url}/authors/${authorSlug}` : undefined

  // seo_authors-driven bio fallback. When the editor has filled in a
  // canonical bio on /admin/seo/authors/[slug], use it as the inline
  // bio under the article when the article row's own author_bio is
  // empty. Surfaces real E-E-A-T context on every story.
  const { loadAuthorProfile } = await import('@/lib/seo/authors')
  const authorProfile = authorSlug ? await loadAuthorProfile(supabaseForExtras, authorSlug) : null
  const inlineAuthorBio =
    (article.author_bio as string | null)?.trim()
    || authorProfile?.bio?.trim()
    || null
  // Editor SEO overrides win in JSON-LD too — the article@id and the
  // share preview should agree, otherwise the rich-results data
  // mismatches the visible page and Google penalizes for it.
  const ldTitle       = (article.seo_title       as string | null)?.trim() || (article.title as string)
  const ldDescription = (article.seo_description as string | null)?.trim() || ((article.excerpt as string | null) ?? '')
  const ldFocusKw     = (article.seo_focus_keyword as string | null)?.trim()
  const ldSecondaryKw = (article.seo_secondary_keywords as string[] | null) ?? []
  const ldKeywords    = (() => {
    const set = new Set<string>([
      ...(ldFocusKw ? [ldFocusKw] : []),
      ...ldSecondaryKw,
      ...(columnData?.label ? [columnData.label] : []),
      articleSeoCfg.areaServedLabel,
      'Parenting',
    ].map(k => k.trim()).filter(Boolean))
    return Array.from(set)
  })()

  const articleLd = articleJsonLd({
    title:        ldTitle,
    description:  ldDescription,
    url:          articleUrl,
    imageUrl:     heroForLd,
    publishedAt:  (article.published_at as string | null) ?? undefined,
    modifiedAt:   (article.updated_at   as string | null) ?? undefined,
    authorName:   (article.author_name  as string | null) ?? undefined,
    authorUrl,
    publisherName:    articleSeoCfg.organizationName,
    publisherUrl:     articleSeoCfg.url,
    publisherLogoUrl: articleSeoCfg.logoUrl,
    articleSection:   columnData?.label ?? undefined,
    type:             'NewsArticle',
    bodyText:         articleBodyPlain || null,
    keywords:         ldKeywords,
  })
  const breadcrumbsLd = breadcrumbJsonLd(
    [
      { name: 'Home',       path: '/' },
      { name: categoryLabel,path: `/columns/${column}` },
      { name: article.title as string, path: `/columns/${column}/${slug}` },
    ],
    seoCtx.publicOrigin,
  )

  return (
    <div className="min-h-screen bg-background public-page">
      {/* Per-article structured data — NewsArticle + BreadcrumbList.
          Inline-rendered so crawlers see it without executing JS. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }}
      />

      <Navigation />

      {/* Breadcrumb trail — Home > [Column Label] > [Article Title]. The
          column label uses whatever's most readable (display_name from
          monthly_columns, falling back to the vertical or "Feature"). */}
      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home',            href: '/'                  },
              { label: categoryLabel,     href: `/columns/${column}` },
              { label: article.title as string },
            ]}
          />
        </div>
      </div>

      {/* View tracker — fires once per session per article after 3s on page.
          Carries first-touch UTM attribution so the report can show what
          drove this reader (magazine QR, social share, organic search). */}
      <TrackArticleView articleId={article.id as string} />

      <main className="container py-8 md:py-12">
        {/* Grands hero block — FULL WIDTH above the article+sidebar grid.
            The sidebar starts BELOW this block, alongside the snapshot +
            pull quote, per the spec. */}
        {isGrandsFeature && (
          <GrandsFeatureHero
            logoUrl={brandedLogoUrl}
            title={article.title}
            tagline={(article.subtitle as string | null)?.trim() || brandedTagline || null}
            authorName={(article.author_name as string | null) ?? null}
            publishedDate={publishedDate}
            readTimeMinutes={readTimeMinutes}
            heroImageUrl={heroImageUrl}
            shareUrl={shareUrl}
          />
        )}

        {/* Play Ball hero block — same magazine-feature pattern as
            Grands. Renders above the article+sidebar grid. */}
        {isPlayBallFeature && (
          <PlayBallFeatureHero
            logoUrl={brandedLogoUrl}
            title={article.title}
            tagline={(article.subtitle as string | null)?.trim() || brandedTagline || null}
            authorName={(article.author_name as string | null) ?? null}
            publishedDate={publishedDate}
            readTimeMinutes={readTimeMinutes}
            heroImageUrl={heroImageUrl}
            shareUrl={shareUrl}
          />
        )}

        {/* Teacher of the Month hero block — same magazine-feature
            pattern with a red+star eyebrow tagline and a Thank You
            badge overlapping the photo. The brand-level tagline drives
            the eyebrow; the article subtitle drives the lede paragraph
            under the title (unlike Grands/Play Ball where subtitle wins
            over tagline for the same slot). */}
        {isTeacherFeature && (
          <TeacherFeatureHero
            logoUrl={brandedLogoUrl}
            tagline={brandedTagline ?? null}
            title={article.title}
            subtitle={(article.subtitle as string | null)?.trim() || null}
            authorName={(article.author_name as string | null) ?? null}
            publishedDate={publishedDate}
            readTimeMinutes={readTimeMinutes}
            heroImageUrl={heroImageUrl}
            shareUrl={shareUrl}
          />
        )}

        {/* Mom to Mom hero block — soft, editorial variant of the
            magazine-feature pattern (cream + blush). */}
        {isMomFeature && (
          <MomFeatureHero
            logoUrl={brandedLogoUrl}
            title={article.title}
            subtitle={(article.subtitle as string | null)?.trim() || brandedTagline || null}
            authorName={(article.author_name as string | null) ?? null}
            publishedDate={publishedDate}
            readTimeMinutes={readTimeMinutes}
            heroImageUrl={heroImageUrl}
            shareUrl={shareUrl}
          />
        )}

        {/* For other spotlights (not Grands/Play Ball/Teacher/Mom
            feature) the eyebrow/title/hero/author block renders above
            the grid (full-width). */}
        {!isGrandsFeature && !isPlayBallFeature && !isTeacherFeature && !isMomFeature && isSpotlight && (
          <>
            <SpotlightEyebrow
              spotlightType={spotlightType}
              columnSlug={column}
              logoUrl={brandedLogoUrl}
            />
            <div className="relative w-full aspect-[16/9] overflow-hidden shadow-md mb-6 md:mb-8">
              <Image
                src={heroImageUrl}
                alt={article.title}
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                sizes="100vw"
                priority
                unoptimized
              />
            </div>
            <ArticleHeader
              category={undefined}
              categoryHref={undefined}
              badgeClassName={columnBadgeStyle(column)}
              columnLogoUrl={null}
              title={article.title}
              subtitle={(article.subtitle as string | null)?.trim() || brandedTagline || null}
            />
            <ArticleAuthorBlock
              authorName={(article.author_name as string | null) ?? null}
              publishedDate={publishedDate}
              readTimeMinutes={readTimeMinutes}
              shareUrl={shareUrl}
              nominate={<NominateCTA columnSlug={column} variant="pill" />}
            />
          </>
        )}
        {!isSpotlight && (
          <>
            <ArticleHeader
              category={categoryLabel}
              categoryHref={categoryHref}
              badgeClassName={columnBadgeStyle(column)}
              columnLogoUrl={brandedLogoUrl}
              title={article.title}
              subtitle={(article.subtitle as string | null)?.trim() || brandedTagline || null}
            />
            <ArticleAuthorBlock
              authorName={(article.author_name as string | null) ?? null}
              publishedDate={publishedDate}
              readTimeMinutes={readTimeMinutes}
              shareUrl={shareUrl}
              nominate={<NominateCTA columnSlug={column} variant="pill" />}
            />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <article className="lg:col-span-8">
            {/* Grands snapshot + pull quote — inside the main col so the
                sidebar sits alongside, starting at this same vertical
                position. Sits below the full-width hero block above. */}
            {isGrandsFeature && (
              <GrandsSnapshotQuote
                snapshotFields={grandsSnapshotFields}
                snapshotValues={grandsSnapshotValues}
                pullQuote={grandsParts?.leadPullQuote ?? null}
              />
            )}

            {/* Play Ball snapshot strip + pull quote — same pattern. */}
            {isPlayBallFeature && (
              <PlayBallSnapshotQuote
                snapshotFields={playBallSnapshotFields}
                snapshotValues={playBallValues}
                pullQuote={playBallParts?.leadPullQuote ?? null}
              />
            )}

            {/* Teacher Quick Facts — on mobile only, render in the
                main column ABOVE the pull quote. The same component
                also renders in the sidebar (lg:block), so desktop sees
                it on the right rail and mobile sees it at the top of
                the article (where readers actually find it instead of
                buried below the back-to-column link). */}
            {isTeacherFeature && (
              <div className="mb-8 lg:hidden">
                <TeacherSnapshot fields={teacherFields} values={teacherValues} />
              </div>
            )}

            {/* Teacher pull quote — lifted from the first <blockquote>
                in the body. */}
            {isTeacherFeature && teacherParts?.leadPullQuote && (
              <div className="mb-8">
                <TeacherPullQuote
                  quote={teacherParts.leadPullQuote.quote}
                  attribution={teacherParts.leadPullQuote.attribution}
                />
              </div>
            )}

            {/* Mom snapshot strip + lifted pull quote — sits below the
                hero and above the body, like the Grands / Play Ball
                pattern, so readers see the at-a-glance vitals and the
                hero quote before the article opens. */}
            {isMomFeature && (
              <div className="mb-8 space-y-6">
                <MomSnapshot fields={momFields} values={momValues} />
                {momParts?.leadPullQuote && (
                  <MomPullQuote
                    quote={momParts.leadPullQuote.quote}
                    attribution={momParts.leadPullQuote.attribution}
                  />
                )}
              </div>
            )}

            {/* Non-spotlight hero (regular columns) — kept rounded as the
                standard look. Spotlight columns already rendered the hero
                above the title. */}
            {!isSpotlight && (
              <div className="relative mb-8">
                <div className="relative w-full aspect-[3/2] md:aspect-[16/9] rounded-2xl overflow-hidden shadow-sm border border-border/50">
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
              </div>
            )}

            {/* Section sponsor — mobile-only strip immediately under the hero,
                before any other content. 80% of readers are on mobile and
                stacked-below-body sidebars don't get seen; this is the
                premium slot. Desktop renders this same sponsor in the
                sidebar (see SectionSponsorSidebar in ArticleSidebar slot). */}
            <SectionSponsorMobile sponsor={sectionSponsor} columnSlug={column} />

            {/* Spotlight top strip — MOBILE only. On desktop the same
                vitals render in the sidebar as a SpotlightSnapshot card
                (magazine pattern). Mobile keeps the horizontal top strip
                so readers still see vitals at the top of the article.
                Grands skips this — its feature hero already renders the
                snapshot on mobile within the feature package. */}
            {isSpotlight && !isGrandsFeature && !isPlayBallFeature && !isTeacherFeature && !isMomFeature && (
              <div className="mb-8 lg:hidden">
                <SpotlightTopStrip spotlightType={spotlightType} spotlightData={spotlightData} columnSlug={column} />
              </div>
            )}

            {isGrandsFeature ? (
              /* Grands gets its own body renderer — intro prose with a
                 purple drop cap, then a "[Name]'s Grand Story" Q&A
                 section in the open editorial style (icon + serif
                 question + answer, no white card frames). An optional
                 AGrandMoment break renders where the editor placed an
                 <h3>A Grand Moment</h3> + paragraph in the body. The
                 lead pull quote was already lifted upstream. */
              <GrandsBody
                body={article.body ?? ''}
                subjectName={grandsSubjectName}
              />
            ) : isMomFeature ? (
              /* Mom to Mom — intro prose with a coral drop cap, then a
                 stack of MomQACards under a "[Subject Name]: Her Story"
                 header, then a styled Rapid Fire module. Subject name
                 is derived from the part of the article title before
                 the first colon (e.g. "Phyllis Palmer: Pours Heart..."
                 → "Phyllis Palmer"); falls back to the whole title. */
              <MomBody
                body={article.body ?? ''}
                subjectName={
                  typeof article.title === 'string' && article.title.includes(':')
                    ? article.title.split(':')[0].trim()
                    : (article.title as string | null) ?? null
                }
              />
            ) : (
              <ArticleBody
                /* Play Ball / Teacher lift the first <blockquote> into
                   their styled pull quote above, so pass the parsed body
                   that has it removed; otherwise pass through the raw
                   body. */
                body={
                  isPlayBallFeature ? (playBallParts?.body ?? '')
                  : isTeacherFeature ? (teacherParts?.body ?? '')
                  : (article.body ?? '')
                }
                pullQuotes={pullQuotes}
                columnSlug={column}
                inlineAds={allocatedInlineAds.map((ad, idx) => (
                  <InArticleAd
                    key={`${ad.id ?? 'ad'}-${idx}`}
                    headline={ad.ad_headline ?? ''}
                    description={ad.ad_description ?? ''}
                    ctaLabel={ad.ad_cta_label ?? 'Learn More'}
                    ctaUrl={ad.ad_link ?? '#'}
                    imageUrl={ad.ad_image_url ?? null}
                    creativeMode={ad.creative_mode ?? 'composed'}
                  />
                ))}
              />
            )}

            {/* Spotlight Quick Hits — sits IMMEDIATELY after the body so
                structured Q&A closes out the spotlight content before the
                gallery + sponsor outro. New reader flow: prose → Quick Hits
                (or Rapid Fire in body) → gallery → sponsor → nominate.
                Only renders when the template has filled quickHits (Play
                Ball does; Mom + Teacher don't by default). Play Ball uses
                the cream/gold magazine treatment instead of the generic
                brand-colored card. */}
            {isPlayBallFeature ? (
              <div className="mt-12">
                <PlayBallQuickHits
                  title={playBallQuickHitsTitle}
                  fields={playBallQuickHitsFields}
                  values={playBallValues}
                />
              </div>
            ) : isTeacherFeature ? (
              /* Teacher template has no quickHits by default — Quick
                 Facts is the sidebar TeacherSnapshot. Render nothing
                 here so the body flows straight into the gallery. */
              null
            ) : isMomFeature ? (
              /* Mom template has no quickHits — the Q&A IS the content,
                 rendered as MomQACards inside MomBody above. */
              null
            ) : isSpotlight ? (
              <div className="mt-12">
                <SpotlightQuickHits spotlightType={spotlightType} spotlightData={spotlightData} columnSlug={column} />
              </div>
            ) : null}

            {/* Photo gallery — branded lightbox. Now AFTER Quick Hits so
                the photos are the visual close to the article, right before
                the sponsor outro and nominate CTA. Grands gets a custom
                "Family Moments / The memories they're making" header in
                the same magazine voice as the rest of the feature. */}
            <ArticleGallery
              images={galleryImages}
              columnSlug={column}
              spotlightEyebrow={galleryEyebrow}
              headerEyebrow={isGrandsFeature ? 'Family Moments' : null}
              headerTitle={isGrandsFeature ? 'The memories they’re making' : null}
              headerEyebrowColor={isGrandsFeature ? '#6F2C8F' : null}
              columnLogoUrl={brandedLogoUrl}
            />

            {/* Author/subject bio — natural close to the editorial content
                before the post-article sponsor + nominate CTA. Simple
                divider line + italic text, no box, no section title.
                Hidden when empty. */}
            {inlineAuthorBio && (
              <div className="mt-8 pt-5 border-t border-border/40">
                <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed">
                  {inlineAuthorBio}
                </p>
                {authorSlug && (
                  <p className="mt-2 text-xs">
                    <a href={`/authors/${authorSlug}`} className="text-primary font-semibold hover:underline">
                      More from {article.author_name as string} →
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Section sponsor footer outro — bigger "Thank you to our sponsor"
                block. Renders on every breakpoint, closing the article with
                reinforced brand association. Tightened mt to match the
                gallery's spacing rhythm (was mt-12 with border + heavy pad). */}
            <SectionSponsorOutro sponsor={sectionSponsor} columnSlug={column} />

            {/* Nominate CTA — only renders on community spotlight columns
                (Play Ball / Teacher / Grands / Mom). Other columns: null.
                Teacher / Mom / Grands each render their own column-styled
                box in this slot so the CTAs feel native to the magazine
                spec while keeping the same flow as the other community
                spotlights. */}
            {isTeacherFeature ? (
              <div className="mt-10">
                <TeacherNominationBox href={teacherNominateHref} />
              </div>
            ) : isMomFeature ? (
              <div className="mt-10">
                <MomNominationBox href={momNominateHref} />
              </div>
            ) : isGrandsFeature ? (
              <GrandsNominationBox href={grandsNominateHref} />
            ) : (
              <NominateCTA columnSlug={column} variant="article" />
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

            {/* Community spotlights cross-promo — when this article IS a
                community spotlight (Grands/PlayBall/Teacher/Mom), show
                the latest from the OTHER three spotlights as a strip
                instead of just a generic back-link. Falls back to the
                back-link below when no other-spotlight rows are
                available, or when this article isn't a spotlight. */}
            {(isGrandsFeature || isPlayBallFeature || isTeacherFeature || isMomFeature)
              && otherSpotlights && otherSpotlights.length > 0 && (
              <CommunitySpotlightsCrossPromo
                items={otherSpotlights.map(r => ({
                  id:             r.id            as string,
                  title:          r.title         as string,
                  slug:           r.slug          as string | null,
                  hero_image_url: r.hero_image_url as string | null,
                  column_slug:    r.column_slug   as string | null,
                  author_name:    r.author_name   as string | null,
                })) as SpotlightCrossPromoItem[]}
              />
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
               topSlot alongside the spotlight snapshot + series cards. */
            stickyAd={sectionSponsor ? null : stickyAdMapped}
            sponsoredAd={sponsoredAdMapped}
            trending={trendingMapped}
            topSlot={
              <>
                {/* Spotlight Snapshot — desktop sidebar version of the top
                    strip (5 vitals stacked as a magazine "trading card").
                    Mobile shows the horizontal top strip above the body.
                    Grands renders its own GrandparentSnapshot inside the
                    GrandsFeatureHero, so we skip the sidebar version to
                    avoid the doubled snapshot. */}
                {isSpotlight && !isGrandsFeature && !isPlayBallFeature && !isTeacherFeature && !isMomFeature && (
                  <SpotlightSnapshot
                    spotlightType={spotlightType}
                    spotlightData={spotlightData}
                    columnSlug={column}
                  />
                )}
                {/* Teacher Quick Facts — vertical sidebar card per the
                    mockup. Hidden on mobile (where the same component
                    renders inside the main column above the pull quote)
                    so it shows up ONCE per breakpoint. */}
                {isTeacherFeature && (
                  <div className="hidden lg:block">
                    <TeacherSnapshot fields={teacherFields} values={teacherValues} />
                  </div>
                )}
                {/* Section sponsor — same component as before, now stacked
                    below the snapshot so the sponsor sits in premium real
                    estate alongside the column-branded card. */}
                <SectionSponsorSidebar sponsor={sectionSponsor} columnSlug={column} />
                {/* More in this Series — drives retention to other articles
                    in the same column. Hidden when no other articles exist. */}
                <MoreInSeries
                  items={seriesMapped}
                  columnSlug={column}
                  columnDisplay={columnDisplay}
                />
              </>
            }
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}