import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { SectionSponsorBanner } from '@/components/articles/SectionSponsor'
import { NominateCTA } from '@/components/articles/NominateCTA'
import { getActiveSectionSponsor } from '@/lib/section-sponsors'
import { getNominateCTA } from '@/lib/articles/nominate-cta'
import { isEducationMattersColumn, getDistrictForColumn, EDUCATION_DISTRICTS } from '@/lib/education-matters/districts'
import {
  EducationMattersDistrictPage,
  type DistrictArticleCard, type DistrictPageSidebarItem,
} from '@/components/education/EducationMattersDistrictPage'
import { loadAuthorProfile } from '@/lib/seo/authors'

export const revalidate = 600

const COLUMN_ACCENT: Record<string, { badge: string; border: string; header: string }> = {
  'mom-to-mom':          { badge: 'bg-rose-500 text-white',    border: 'border-rose-200',    header: 'from-rose-50 to-background' },
  'teacher-of-month':    { badge: 'bg-amber-500 text-white',   border: 'border-amber-200',   header: 'from-amber-50 to-background' },
  'grands-greatest':     { badge: 'bg-purple-500 text-white',  border: 'border-purple-200',  header: 'from-purple-50 to-background' },
  'dave-says':           { badge: 'bg-slate-600 text-white',   border: 'border-slate-200',   header: 'from-slate-50 to-background' },
  'meeting-kids':        { badge: 'bg-teal-600 text-white',    border: 'border-teal-200',    header: 'from-teal-50 to-background' },
  'teens-tweens-screens':{ badge: 'bg-indigo-600 text-white',  border: 'border-indigo-200',  header: 'from-indigo-50 to-background' },
  'school-bits':         { badge: 'bg-blue-600 text-white',    border: 'border-blue-200',    header: 'from-blue-50 to-background' },
  'education-matters':   { badge: 'bg-green-600 text-white',   border: 'border-green-200',   header: 'from-green-50 to-background' },
  'summer-fun':          { badge: 'bg-amber-400 text-amber-950', border: 'border-amber-200', header: 'from-amber-50 to-background' },
}

const DEFAULT_ACCENT = { badge: 'bg-primary text-primary-foreground', border: 'border-border', header: 'from-primary/5 to-background' }

const COLUMN_CTA: Record<string, { label: string; href: string }> = {
  'teacher-of-month': { label: 'Nominate a Teacher', href: '/nominate/teacher' },
  'mom-to-mom':       { label: 'Get Involved',        href: '/advertise' },
}
const DEFAULT_CTA = { label: 'Submit School News', href: '/calendar/submit' }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageParams {
  params: Promise<{ column: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { column } = await params
  const supabase = getSupabase()
  const { data } = await supabase
    .from('monthly_columns')
    .select('display_name, description, hero_image_url')
    .eq('slug', column)
    .maybeSingle()
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  if (!data) {
    // Even unknown columns get proper metadata — synthesize a title
    // from the slug so we never ship a "Column — River Region Parents"
    // share preview.
    const synthTitle = column.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return buildPageMetadata({
      title:       synthTitle,
      description: `${synthTitle} stories from River Region Parents — locally reported, family-friendly, updated weekly.`,
      path:        `/columns/${column}`,
      type:        'website',
    })
  }
  return buildPageMetadata({
    title:       data.display_name as string,
    description: (data.description as string | null) ?? `${data.display_name} stories from River Region Parents — locally reported, family-friendly, updated weekly.`,
    path:        `/columns/${column}`,
    image:       (data.hero_image_url as string | null) ?? null,
    type:        'website',
    keywords:    [data.display_name as string, 'River Region', 'parenting'],
  })
}

export default async function ColumnLandingPage({ params }: PageParams) {
  const { column } = await params
  const supabase = getSupabase()

  const [columnRes, articlesRes, sectionSponsor] = await Promise.all([
    supabase.from('monthly_columns').select('*').eq('slug', column).maybeSingle(),
    supabase.from('guide_articles')
      .select('id, title, slug, excerpt, hero_image_url, author_name, published_at')
      .eq('column_slug', column)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false }),
    getActiveSectionSponsor(supabase, column),
  ])

  // Whether this column is a community spotlight — only those get the
  // top-of-page nominate CTA banner.
  const hasNominateCTA = !!getNominateCTA(column)

  const articles   = articlesRes.data ?? []

  // ── Education Matters — magazine-style district hub ────────────────
  // The generic "column archive" template below is not the right shape
  // for a superintendent's monthly-message page. Every Education Matters
  // district gets its own hub: masthead + district tabs, superintendent
  // card paired with the newest article, sponsor strip, past-messages
  // archive, and the peer-district cross-nav module. Chrome + sponsor
  // pipeline are shared with the article page.
  if (isEducationMattersColumn(column)) {
    const district = getDistrictForColumn(column)!
    const rows = articles as Array<{
      id: string; title: string; slug: string; excerpt: string | null;
      hero_image_url: string | null; author_name: string | null;
      published_at: string | null; read_time_minutes?: number | null
    }>
    const mapped: DistrictArticleCard[] = rows.map(a => ({
      id:                a.id,
      slug:              a.slug,
      title:             a.title,
      excerpt:           a.excerpt,
      hero_image_url:    a.hero_image_url,
      author_name:       a.author_name,
      published_at:      a.published_at,
      read_time_minutes: a.read_time_minutes ?? null,
    }))
    const [featured, ...pastArticles] = mapped

    // Superintendent profile (bio + headshot for the card) — same DB
    // lookup path the article page uses.
    const superintendentProfile = await loadAuthorProfile(supabase, district.superintendent.authorSlug)

    // Peer districts: latest article slug from each of the OTHER 3, so
    // "More Education Matters" links deep-link into that district's
    // most recent message instead of just its hub page when possible.
    const otherSlugs = EDUCATION_DISTRICTS.map(d => d.slug).filter(s => s !== column)
    const { data: peerLatestRaw } = await supabase
      .from('guide_articles')
      .select('slug, column_slug, published_at')
      .in('column_slug', otherSlugs)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(20)
    const peerLatest = (peerLatestRaw ?? []) as Array<{ slug: string; column_slug: string }>
    const seenPeer = new Set<string>()
    const peerItems: DistrictPageSidebarItem[] = otherSlugs.map(dSlug => {
      const hit = peerLatest.find(r => r.column_slug === dSlug && !seenPeer.has(dSlug))
      if (hit) seenPeer.add(dSlug)
      const bareSlug = hit ? hit.slug.replace(new RegExp(`^${dSlug}-`), '') : null
      return hit && bareSlug
        ? { slug: dSlug, href: `/columns/${dSlug}/${bareSlug}`, label: 'Read latest message' }
        : { slug: dSlug, href: `/columns/${dSlug}`,             label: 'View all messages'  }
    })

    // JSON-LD: ItemList (articles in this district) + BreadcrumbList.
    // Self-contained here so the hub is a proper landing page for
    // search engines, not just an editorial pivot.
    const { loadBrandContext: _emLoadBrand } = await import('@/lib/brand-context')
    const { itemListJsonLd: _emItemLd, breadcrumbJsonLd: _emCrumbsLd, jsonLdScript: _emJsonLd } = await import('@/lib/seo/jsonld')
    const emCtx = await _emLoadBrand()
    const emItemLd = _emItemLd({
      name: `Education Matters — ${district.fullName}`,
      items: mapped.slice(0, 20).map(a => ({
        name:  a.title,
        url:   `${emCtx.publicOrigin}/columns/${column}/${a.slug.replace(new RegExp(`^${column}-`), '')}`,
        image: a.hero_image_url ?? undefined,
      })),
    })
    const emCrumbsLd = _emCrumbsLd([
      { name: 'Home',              path: '/'                          },
      { name: 'School Zone',       path: '/school-zone'               },
      { name: 'Education Matters', path: '/columns/education-matters' },
      { name: district.shortName,  path: `/columns/${column}`         },
    ], emCtx.publicOrigin)

    return (
      <div className="min-h-screen bg-background public-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _emJsonLd(emItemLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _emJsonLd(emCrumbsLd) }} />
        <Navigation />
        <div className="border-b border-border/40 bg-background">
          <div className="container py-3">
            <Breadcrumbs
              items={[
                { label: 'Home',              href: '/'                             },
                { label: 'School Zone',       href: '/school-zone'                  },
                { label: 'Education Matters', href: '/columns/education-matters'    },
                { label: district.shortName },
              ]}
            />
          </div>
        </div>
        <EducationMattersDistrictPage
          district={district}
          superintendentProfile={superintendentProfile}
          featured={featured ?? null}
          pastArticles={pastArticles}
          sectionSponsor={sectionSponsor}
          peerItems={peerItems}
        />
        <PublicFooter />
      </div>
    )
  }

  // Tolerate missing monthly_columns metadata — some editorial buckets
  // (frg-best-of, frg-newcomer, etc.) don't have monthly_columns rows
  // because they aren't recurring contributor columns. Fall back to a
  // synthesized identity from the slug so the page renders instead of
  // 404ing. If there are also no articles, then 404 (truly nothing here).
  if (!columnRes.data && articles.length === 0) notFound()

  // Pretty default name from slug — "frg-best-of" → "Best of the Region"
  // for the well-known FRG buckets; everything else gets a Title Cased
  // version of the slug.
  const SLUG_DISPLAY: Record<string, string> = {
    'frg-best-of':   'Best of the Region',
    'frg-newcomer':  'Newcomer Stories',
    'feature':       'Featured Articles',
  }
  const slugDisplay = SLUG_DISPLAY[column]
    ?? column.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const columnData = columnRes.data ?? {
    slug:         column,
    display_name: slugDisplay,
    description:  null,
    short_description: null,
    hero_image_url:    null,
  }
  const accent     = COLUMN_ACCENT[column] ?? DEFAULT_ACCENT
  const cta        = COLUMN_CTA[column] ?? DEFAULT_CTA

  // ── ItemList + BreadcrumbList JSON-LD ──────────────────────────────
  // ItemList tells Google "here are the articles in this column, in
  // this order" — eligible for list-style rich results. BreadcrumbList
  // mirrors the visible Home > Articles > [Column] trail. Both are
  // brand-aware via loadBrandContext.
  const { loadBrandContext: _colLoadBrand } = await import('@/lib/brand-context')
  const { itemListJsonLd: _itemListLd, breadcrumbJsonLd: _crumbsLd, jsonLdScript: _jsonLdScript } = await import('@/lib/seo/jsonld')
  const colCtx = await _colLoadBrand()
  const colUrl = `${colCtx.publicOrigin}/columns/${column}`
  const colItemListLd = _itemListLd({
    name: columnData.display_name as string,
    items: (articles as Array<{ id: string; title: string; slug: string; hero_image_url: string | null }>)
      .slice(0, 20)
      .map(a => ({
        name:  a.title,
        url:   `${colCtx.publicOrigin}/columns/${column}/${a.slug}`,
        image: a.hero_image_url ?? undefined,
      })),
  })
  const colCrumbsLd = _crumbsLd([
    { name: 'Home',     path: '/' },
    { name: 'Articles', path: '/articles' },
    { name: columnData.display_name as string, path: `/columns/${column}` },
  ], colCtx.publicOrigin)
  void colUrl

  return (
    <div className="min-h-screen bg-background public-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _jsonLdScript(colItemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _jsonLdScript(colCrumbsLd) }} />
      <Navigation />

      {/* Column identity header */}
      <div className={`border-b bg-gradient-to-b ${accent.header} ${accent.border}`}>
        <div className="container py-8 md:py-12">
          <div className="flex items-start gap-3 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${accent.badge}`}>
              Column
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-3">
            {columnData.display_name}
          </h1>
          {columnData.description && (
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-4">
              {columnData.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {columnData.default_author && (
              <span>
                By <span className="font-semibold text-foreground">{columnData.default_author}</span>
              </span>
            )}
            {articles.length > 0 && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {articles.length > 0 && (
              <span>{articles.length} {articles.length === 1 ? 'article' : 'articles'} published</span>
            )}
          </div>
        </div>
      </div>

      <main className="container py-8 md:py-12">
        {/* Section sponsor — BIG full-width banner if sponsor is active for
            this column. Renders nothing otherwise (no empty box). Mobile +
            desktop both get prime above-the-fold real estate. */}
        {sectionSponsor && (
          <div className="mb-8 md:mb-10">
            <SectionSponsorBanner sponsor={sectionSponsor} columnSlug={column} />
          </div>
        )}

        {/* Nominate CTA — only on community spotlight columns. Visitors
            arriving from a magazine QR can act immediately. */}
        {hasNominateCTA && (
          <div className="mb-8 md:mb-10">
            <NominateCTA columnSlug={column} variant="archive" />
          </div>
        )}

        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((a) => {
              const articleUrl = `/columns/${column}/${a.slug.replace(new RegExp(`^${column}-`), '')}`
              const heroUrl    = a.hero_image_url || getFallbackByContext(column, a.id)
              const dateLabel  = a.published_at
                ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : ''

              return (
                <Link key={a.id} href={articleUrl} className="group flex flex-col gap-3">
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
                    <Image
                      src={heroUrl}
                      alt={a.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                    {/* Column badge on image */}
                    <div className="absolute top-3 left-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm ${accent.badge}`}>
                        {columnData.display_name}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-bold text-base leading-snug group-hover:text-primary transition-colors text-foreground line-clamp-2">
                      {a.title}
                    </h2>
                    {a.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{a.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                      {a.author_name && <span className="font-medium text-foreground/70">{a.author_name}</span>}
                      {a.author_name && dateLabel && <span>·</span>}
                      {dateLabel && <span>{dateLabel}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${accent.border}`}>
            <div className="max-w-md mx-auto">
              <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${accent.badge}`}>
                {columnData.display_name}
              </span>
              <p className="text-lg font-bold text-foreground mb-2">
                New {columnData.display_name} articles coming soon
              </p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {columnData.description ?? `Fresh ${columnData.display_name.toLowerCase()} content is on its way. Check back soon for new stories from the River Region.`}
              </p>
              <Link
                href={cta.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Back to articles */}
        <div className="mt-10 pt-8 border-t border-border/40">
          <Link href="/articles" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            ← Browse All Articles
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
