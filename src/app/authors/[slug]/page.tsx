// ── /authors/[slug] — Author page with Person JSON-LD ─────────────────────
//
// Author pages are an E-E-A-T heavyweight signal: Google grades how
// well-attributed our articles are, and Person schema linking from
// every article to a canonical author URL is the structured-data
// shape they want to see.
//
// Slug is derived from author_name (kebab-cased, honorifics stripped)
// via authorNameToSlug. Every article page that has author_name set
// gets a clickable link to /authors/<slug>. This page lists all
// articles by that author + emits Person JSON-LD.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { personJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo/jsonld'
import { authorNameToSlug, slugToAuthorTitleCase } from '@/lib/seo/author-slug'
import { loadAuthorProfile } from '@/lib/seo/authors'
import { articleHref } from '@/lib/articles/slug'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ArrowRight } from 'lucide-react'

export const revalidate = 1800

interface Props { params: Promise<{ slug: string }> }

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface ArticleRow {
  id:             string
  title:          string
  slug:           string
  column_slug:    string
  excerpt:        string | null
  dek:            string | null
  hero_image_url: string | null
  author_name:    string | null
  published_at:   string | null
}

/** Fetch every article by an author whose slug matches. Returns the
 *  canonical display name (from the first article) + the article list,
 *  or null if no articles match. */
async function loadByAuthorSlug(slug: string): Promise<{ name: string; articles: ArticleRow[] } | null> {
  const sb = supabase()
  // We can't filter author_name → slug in SQL cleanly without a stored
  // generated column, so we pull a sensible window of articles and
  // filter client-side. With <2000 published articles this is fine;
  // when the corpus grows past that we'll add an author_slug generated
  // column to guide_articles.
  const { data, error } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, excerpt, dek, hero_image_url, author_name, published_at')
    .eq('published', true)
    .not('author_name', 'is', null)
    .order('published_at', { ascending: false })
    .limit(2000)
  if (error || !data) return null

  const matching = (data as ArticleRow[]).filter(a => authorNameToSlug(a.author_name) === slug)
  if (matching.length === 0) return null

  // Display name = the most common spelling of author_name in the
  // matching set. Beats the slug-roundtrip when authors use accents
  // or punctuation we'd otherwise lose.
  const counts = new Map<string, number>()
  for (const a of matching) {
    const n = (a.author_name ?? '').trim()
    if (!n) continue
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  const name = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? slugToAuthorTitleCase(slug)
  return { name, articles: matching }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const found = await loadByAuthorSlug(slug)
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  if (!found) {
    return buildPageMetadata({
      title:       'Author Not Found',
      description: 'This author page is not available.',
      path:        `/authors/${slug}`,
      noIndex:     true,
    })
  }
  return buildPageMetadata({
    title:       `${found.name} — Author`,
    description: `Stories by ${found.name} for River Region families — local profiles, columns, and community features.`,
    path:        `/authors/${slug}`,
    type:        'website',
    keywords:    [found.name, 'River Region writer', 'local author'],
  })
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const found = await loadByAuthorSlug(slug)
  if (!found) notFound()

  const ctx = await loadBrandContext()
  const seo = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const authorUrl = `${seo.url}/authors/${slug}`

  // Editor-curated overrides — bio, headshot, credentials, social URLs.
  // Falls back to auto-generated values when no row exists yet.
  const profile = await loadAuthorProfile(supabase(), slug)
  const displayName     = profile?.displayName    || found.name
  const bio             = profile?.bio            || `${displayName} writes for ${seo.organizationName}, covering local family life in ${seo.areaServedLabel}.`
  const jobTitle        = profile?.jobTitle       || 'Contributor'
  const credentials     = profile?.credentials    ?? []
  const headshotUrl     = profile?.headshotUrl    || null
  const socialUrls      = (profile?.socialUrls ?? []).map(s => s.url).filter(Boolean)
  const knowsAbout      = profile?.knowsAbout?.length ? profile.knowsAbout : seo.knowsAbout.slice(0, 5)
  const contactEmail    = profile?.contactEmail   || undefined

  const personLd = personJsonLd({
    name:         displayName,
    url:          authorUrl,
    imageUrl:     headshotUrl,
    jobTitle,
    description:  bio,
    knowsAbout,
    socialUrls,
    credentials,
    email:        contactEmail,
    worksForUrl:  seo.url,
    worksForName: seo.organizationName,
  })
  const crumbsLd = breadcrumbJsonLd([
    { name: 'Home',    path: '/' },
    { name: 'Authors', path: '/articles' },
    { name: found.name, path: `/authors/${slug}` },
  ], seo.url)

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(personLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbsLd) }} />
      <Navigation />
      <main className="container py-10 md:py-14 max-w-4xl">

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">{jobTitle}</p>
        <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
          {headshotUrl && (
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-muted/40 flex-shrink-0">
              <Image src={headshotUrl} alt={displayName} fill sizes="160px" className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-3">{displayName}</h1>
            <p className="text-base md:text-lg text-foreground/70 leading-relaxed max-w-2xl mb-3">
              {bio}
            </p>
            {credentials.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {credentials.map(c => (
                  <span key={c} className="inline-flex items-center text-xs font-semibold uppercase tracking-wide bg-muted/40 text-foreground/70 px-2 py-1 rounded">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {socialUrls.length > 0 && (
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-primary">
                {(profile?.socialUrls ?? []).map(s => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline capitalize">
                    {s.platform}
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-foreground/50 mt-3">
              {found.articles.length === 1
                ? '1 story published.'
                : `${found.articles.length} stories published.`}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {found.articles.map(a => {
            const href     = articleHref({ slug: a.slug, title: a.title, column_slug: a.column_slug })
            const heroFb   = a.hero_image_url ?? getFallbackByContext(a.column_slug, a.id) ?? null
            const excerpt  = a.excerpt ?? a.dek ?? ''
            const dateStr  = a.published_at
              ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null
            return (
              <Link
                key={a.id}
                href={href}
                className="group flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
              >
                {heroFb && (
                  <div className="relative w-full aspect-[16/10] bg-muted/40">
                    <Image src={heroFb} alt={a.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-[1.02] transition-transform" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  {dateStr && <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{dateStr}</p>}
                  <h3 className="text-base font-bold text-foreground leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">{a.title}</h3>
                  {excerpt && <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{excerpt}</p>}
                  <span className="text-xs font-bold text-primary inline-flex items-center gap-1 mt-auto">
                    Read <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

      </main>
      <PublicFooter />
    </div>
  )
}
