// /mom-knows-best/[slug]
// Individual blogger profile: hero family photo, profile portrait, bio,
// Quick Takes Q&A, and a grid of their posts.

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ArticleCard } from '@/components/theme/ArticleCard'
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react'
import { shouldSkipNextOptimizer } from '@/lib/images'
import type { Metadata } from 'next'

export const revalidate = 600

interface Props { params: Promise<{ slug: string }> }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await getSupabase()
    .from('bloggers')
    .select('display_name, tagline, bio')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return { title: 'Mom Knows Best' }
  return {
    title:       `${data.display_name} — Mom Knows Best | River Region Parents`,
    description: data.tagline ?? data.bio?.slice(0, 160) ?? undefined,
  }
}

interface QuickTake { question: string; answer: string }

export default async function BloggerProfilePage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: blogger } = await supabase
    .from('bloggers')
    .select('id, slug, display_name, tagline, profile_image_url, family_image_url, bio, quick_takes')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!blogger) notFound()

  const { data: posts } = await supabase
    .from('guide_articles')
    .select('id, slug, title, excerpt, hero_image_url, profile_image_url, author_name, author_blogger_id, published_at, created_at, column_slug')
    .eq('column_slug', 'mom-knows-best')
    .eq('author_blogger_id', blogger.id)
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })

  const quickTakes = Array.isArray(blogger.quick_takes)
    ? (blogger.quick_takes as QuickTake[]).filter(q => q && q.question && q.answer)
    : []

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Hero: family image as background, profile portrait overlay ───────── */}
      <div className="relative">
        <div className="relative h-72 md:h-96 w-full overflow-hidden bg-primary/10">
          {blogger.family_image_url ? (
            <Image
              src={blogger.family_image_url}
              alt=""
              fill
              sizes="100vw"
              priority
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              unoptimized={shouldSkipNextOptimizer(blogger.family_image_url)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="container -mt-24 md:-mt-28 relative z-10">
          <Link href="/mom-knows-best" className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white mb-3 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
            <ArrowLeft className="h-3.5 w-3.5" /> Mom Knows Best
          </Link>

          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-8">
            {/* Profile portrait */}
            <div className="relative w-32 h-32 md:w-44 md:h-44 rounded-2xl overflow-hidden border-4 md:border-[6px] border-background shadow-lg bg-muted shrink-0">
              {blogger.profile_image_url ? (
                <Image
                  src={blogger.profile_image_url}
                  alt={blogger.display_name}
                  fill
                  sizes="(max-width: 768px) 128px, 176px"
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  unoptimized={shouldSkipNextOptimizer(blogger.profile_image_url)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-primary/30 bg-primary/5">
                  {blogger.display_name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2 md:pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1.5">Mom Knows Best</p>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-2">
                {blogger.display_name}
              </h1>
              {blogger.tagline && (
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{blogger.tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container pb-16 space-y-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* ── Main column: bio + Quick Takes ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">
            {blogger.bio && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-3">About {blogger.display_name.split(' ')[0]}</h2>
                <div className="prose prose-sm md:prose-base max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
                  {blogger.bio}
                </div>
              </section>
            )}

            {quickTakes.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Quick Takes</h2>
                </div>
                <div className="space-y-4">
                  {quickTakes.map((qt, i) => (
                    <div key={i} className="rounded-2xl border border-border/40 bg-card p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{qt.question}</p>
                      <p className="text-foreground/90 leading-relaxed">{qt.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar: CTA ───────────────────────────────────────────────────── */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Follow Along</p>
              <h3 className="text-lg font-bold text-foreground leading-tight mb-2">Get every post in your inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Mom Knows Best lands in our weekly newsletter alongside local events and guides.
              </p>
              <Link
                href="/#newsletter"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Subscribe <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>

        {/* ── Posts grid ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            {blogger.display_name.split(' ')[0]}&apos;s Posts
          </h2>

          {(!posts || posts.length === 0) ? (
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-12 text-center">
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {blogger.display_name.split(' ')[0]} hasn&apos;t published her first post yet — check back soon.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(p => (
                <ArticleCard
                  key={p.id}
                  article={{ ...p, author_name: blogger.display_name }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
