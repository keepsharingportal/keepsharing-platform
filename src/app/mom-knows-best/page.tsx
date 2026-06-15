// /mom-knows-best
// Mom Knows Best vertical landing. Group blog page — meet our local mom
// bloggers + their latest posts.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { PageHeader } from '@/components/theme'
import { ArticleCard } from '@/components/theme/ArticleCard'
import { VerticalSponsorBanner } from '@/components/verticals/VerticalSponsorBanner'
import { ArrowRight, Users } from 'lucide-react'
import { shouldSkipNextOptimizer } from '@/lib/images'
import type { Metadata } from 'next'

export const revalidate = 600

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Mom Knows Best',
    description: 'Real River Region moms writing about real River Region life — honest, funny, in-the-trenches blog posts from local mom bloggers. New posts every week.',
    path:        '/mom-knows-best',
    type:        'website',
    keywords:    ['mom blogs', 'River Region moms', 'parenting blog', 'local moms', 'Montgomery moms'],
  })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Blogger {
  id:                 string
  slug:               string
  display_name:       string
  tagline:            string | null
  profile_image_url:  string | null
  bio:                string | null
}

interface Post {
  id:               string
  slug:             string
  title:            string
  excerpt:          string | null
  hero_image_url:   string | null
  profile_image_url: string | null
  author_name:      string | null
  author_blogger_id: string | null
  published_at:     string | null
  created_at:       string | null
  column_slug:      string | null
}

export default async function MomKnowsBestPage() {
  const supabase = getSupabase()

  const [
    { data: bloggers },
    { data: posts },
    { data: verticalRow },
    { data: sponsorRow },
  ] = await Promise.all([
    supabase.from('bloggers')
      .select('id, slug, display_name, tagline, profile_image_url, bio')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, profile_image_url, author_name, author_blogger_id, published_at, created_at, column_slug')
      .eq('column_slug', 'mom-knows-best')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(9),
    supabase.from('verticals')
      .select('display_name, subtitle, hero_image_url, sponsor_label')
      .eq('slug', 'mom-knows-best')
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('ad_placements')
      .select('id, ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%mom-knows-best%')
      .limit(1)
      .maybeSingle(),
  ])

  const bloggersById: Record<string, Blogger> = {}
  for (const b of (bloggers ?? []) as Blogger[]) bloggersById[b.id] = b

  const vertical = verticalRow as {
    display_name:   string | null
    subtitle:       string | null
    hero_image_url: string | null
    sponsor_label:  string | null
  } | null

  const sponsorAd = sponsorRow as {
    id:          string
    ad_headline: string | null
    advertiser:  { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor = sponsorAd?.advertiser?.business_name
    ? {
        businessName: sponsorAd.advertiser.business_name,
        slug:         sponsorAd.advertiser.slug ?? null,
        headline:     sponsorAd.ad_headline ?? null,
        placementId:  sponsorAd.id,
      }
    : null

  const heroTitle    = vertical?.display_name  || 'Mom Knows Best'
  const heroSubtitle = vertical?.subtitle      || 'Real River Region moms writing about real River Region life — favorite spots, hard-won lessons, family routines, and the chaos in between.'
  const heroImage    = vertical?.hero_image_url || null
  const sponsorLabel = vertical?.sponsor_label || 'Proudly Presented By'

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <PageHeader
        title={heroTitle}
        subtitle={heroSubtitle}
        heroImageUrl={heroImage}
        badge={{ text: 'The Blog Network', variant: 'default' }}
        variant="primary"
        size="lg"
      >
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            {(bloggers ?? []).length} River Region moms
          </span>
        </div>
      </PageHeader>

      <main className="container py-10 lg:py-14 space-y-14">

        {/* ── Section sponsor banner ───────────────────────────────────────── */}
        <VerticalSponsorBanner
          verticalName={heroTitle}
          verticalSlug="mom-knows-best"
          sponsorLabel={sponsorLabel}
          sponsor={sponsor}
        />

        {/* ── Meet the Moms ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-6 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Meet the Moms</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Your local mom bloggers</h2>
            </div>
          </div>

          {(!bloggers || bloggers.length === 0) ? (
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-12 text-center">
              <Users className="h-10 w-10 text-primary/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Bloggers coming soon</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                We&apos;re onboarding a small group of River Region moms to share what they&apos;re doing around town. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {(bloggers as Blogger[]).map(b => (
                <Link
                  key={b.id}
                  href={`/mom-knows-best/${b.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    {b.profile_image_url ? (
                      <Image
                        src={b.profile_image_url}
                        alt={b.display_name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        style={{ objectFit: 'cover', objectPosition: 'center top' }}
                        unoptimized={shouldSkipNextOptimizer(b.profile_image_url)}
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-primary/30">
                        {b.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-primary transition-colors">
                      {b.display_name}
                    </h3>
                    {b.tagline && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{b.tagline}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Latest Posts ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-6 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">From the Blog</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Latest posts</h2>
            </div>
          </div>

          {(!posts || posts.length === 0) ? (
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-12 text-center">
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No posts yet — our bloggers are getting set up. Subscribe below and we&apos;ll send the first one straight to your inbox.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(posts as Post[]).map(p => {
                const blogger = p.author_blogger_id ? bloggersById[p.author_blogger_id] : null
                const article = {
                  ...p,
                  // ArticleCard uses author_name for the byline; show the blogger's
                  // display_name when one is linked.
                  author_name: blogger?.display_name ?? p.author_name ?? null,
                }
                return <ArticleCard key={p.id} article={article} />
              })}
            </div>
          )}
        </section>

        {/* ── Want to write CTA ─────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5 border border-primary/20 p-8 md:p-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Want to write for us?</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
            Mom Knows Best is growing.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
            If you&apos;re a River Region mom who loves writing about local family life, we&apos;d love to talk. Real voices, real recommendations, real reach.
          </p>
          <Link
            href="mailto:hello@riverregionparents.com?subject=Mom%20Knows%20Best%20%E2%80%94%20I%27d%20like%20to%20write"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Get in Touch <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
