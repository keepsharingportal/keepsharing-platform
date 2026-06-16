// ── /campaigns/[slug] — Public campaign landing page ─────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'
import { loadCampaignBySlug, loadCampaignArticles } from '@/lib/campaigns'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { articleHref } from '@/lib/articles/slug'

export const revalidate = 600

interface Props { params: Promise<{ slug: string }> }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ctx = await loadBrandContext()
  const campaign = await loadCampaignBySlug(sb(), ctx.market.slug, slug)
  if (!campaign || !campaign.publicLandingActive) {
    return buildPageMetadata({
      title: 'Campaign not found',
      description: 'This campaign is not available.',
      path: `/campaigns/${slug}`,
      noIndex: true,
    })
  }
  return buildPageMetadata({
    title:       campaign.themeTitle,
    description: campaign.heroTagline ?? campaign.brief ?? `${campaign.themeTitle} — a special editorial campaign from ${ctx.market.displayName}.`,
    path:        `/campaigns/${slug}`,
    image:       campaign.coverImageUrl ?? undefined,
    type:        'website',
    keywords:    campaign.targetKeywords,
  })
}

export default async function CampaignLanding({ params }: Props) {
  const { slug } = await params
  const ctx = await loadBrandContext()
  const campaign = await loadCampaignBySlug(sb(), ctx.market.slug, slug)
  if (!campaign || !campaign.publicLandingActive) notFound()

  const articles = await loadCampaignArticles(sb(), campaign.id)
  const coverArticles    = articles.filter(a => a.role === 'cover')
  const featureArticles  = articles.filter(a => a.role === 'feature')
  const supportingArticles = articles.filter(a => a.role === 'supporting')

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/90 to-primary text-white py-16 md:py-24">
        {campaign.coverImageUrl && (
          <div className="absolute inset-0 opacity-30">
            <Image src={campaign.coverImageUrl} alt="" fill className="object-cover" />
          </div>
        )}
        <div className="container relative max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-80">
            {new Date(campaign.month + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} · {ctx.market.displayName}
          </p>
          <h1 className="text-4xl md:text-6xl font-black mb-4">{campaign.themeTitle}</h1>
          {campaign.heroTagline && (
            <p className="text-lg md:text-xl opacity-90 max-w-3xl leading-relaxed">{campaign.heroTagline}</p>
          )}
        </div>
      </section>

      <main className="container py-12 max-w-5xl space-y-12">

        {/* Editorial brief (if set) */}
        {campaign.brief && (
          <section className="prose prose-lg max-w-none">
            <p className="text-lg leading-relaxed text-foreground/80 whitespace-pre-wrap">{campaign.brief}</p>
          </section>
        )}

        {/* Cover articles */}
        {coverArticles.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-black mb-6">Cover Story</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {coverArticles.map(a => <ArticleCard key={a.article.id} a={a.article} large />)}
            </div>
          </section>
        )}

        {/* Feature articles */}
        {featureArticles.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-black mb-6">Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureArticles.map(a => <ArticleCard key={a.article.id} a={a.article} />)}
            </div>
          </section>
        )}

        {/* Supporting */}
        {supportingArticles.length > 0 && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold mb-4">More from this issue</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supportingArticles.map(a => <ArticleCard key={a.article.id} a={a.article} compact />)}
            </div>
          </section>
        )}

        {articles.length === 0 && (
          <div className="text-center text-foreground/60 py-12">
            <p>This campaign is still being put together. Check back soon for the full lineup.</p>
          </div>
        )}

      </main>

      <PublicFooter />
    </div>
  )
}

function ArticleCard({ a, large, compact }: { a: { id: string; title: string; slug: string; columnSlug: string | null; heroImageUrl: string | null; excerpt: string | null }; large?: boolean; compact?: boolean }) {
  const href = articleHref({ slug: a.slug, title: a.title, column_slug: a.columnSlug })
  return (
    <Link href={href} className="group block">
      {a.heroImageUrl && (
        <div className={`relative w-full ${large ? 'aspect-[16/9]' : compact ? 'aspect-[4/3]' : 'aspect-[3/2]'} bg-muted/40 rounded-lg overflow-hidden mb-3`}>
          <Image src={a.heroImageUrl} alt={a.title} fill sizes={large ? '50vw' : compact ? '33vw' : '33vw'} className="object-cover group-hover:scale-[1.02] transition-transform" />
        </div>
      )}
      <h3 className={`${large ? 'text-2xl' : compact ? 'text-base' : 'text-lg'} font-bold text-foreground group-hover:text-primary transition-colors leading-tight`}>{a.title}</h3>
      {!compact && a.excerpt && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{a.excerpt}</p>}
    </Link>
  )
}
