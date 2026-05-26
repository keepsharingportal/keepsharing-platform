// /best-of — Canonical Best Of landing page.
// Replaces the generic /columns/frg-best-of column page with a dedicated,
// brandable URL. All published frg-best-of articles render in a magazine
// grid below the lockup. The reader-suggestion CTA at the bottom matches
// the one on the FRG home so the brand reads as one continuous section
// regardless of entry point.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'
import { articleHref } from '@/lib/articles/slug'
import { BestOfMasthead } from '@/components/best-of/BestOfMasthead'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

export const revalidate = 600

export const metadata: Metadata = {
  title:       'Best Of — River Region Parents',
  description: 'The lists River Region families text to their friends. Best parks, sweet treats, day trips, and more — new lists added throughout the year.',
  alternates:  { canonical: `${SITE_URL}/best-of` },
  openGraph:   {
    title:       'The Best Of — for River Region Families',
    description: 'New lists added throughout the year. Best parks, day trips, sweet treats, and more.',
    url:         `${SITE_URL}/best-of`,
    type:        'website',
    siteName:    'River Region Parents',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'The Best Of — for River Region Families',
    description: 'New lists added throughout the year. Best parks, day trips, sweet treats, and more.',
  },
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface BestOfArticle {
  id:             string
  slug:           string
  title:          string
  excerpt:        string | null
  hero_image_url: string | null
  published_at:   string | null
  column_slug:    string | null
}

export default async function BestOfLandingPage() {
  const supabase = getSupabase()

  const { data: articlesData } = await supabase
    .from('guide_articles')
    .select('id, slug, title, excerpt, hero_image_url, published_at, column_slug')
    .eq('column_slug', 'frg-best-of')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })

  const articles = (articlesData ?? []) as BestOfArticle[]

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <main className="container py-10 md:py-14 max-w-6xl">
        <BestOfMasthead
          size="large"
          subtitle="New lists added throughout the year — keep checking back."
        />

        {articles.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-12 text-center">
            <Star className="h-8 w-8 text-primary/40 mx-auto mb-3" />
            <p className="text-base font-bold text-foreground mb-1">More lists are coming</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Best Parks. Best Day Trips. Sweet Treats. The first lists drop soon — and we&apos;d love your nominations for the next round.
            </p>
            <Link
              href="/best-of/suggest"
              className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-sm font-bold rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggest a Best Of
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {articles.map(a => {
              const img = a.hero_image_url || getFallback('parenting', a.id)
              return (
                <Link
                  key={a.id}
                  href={articleHref(a)}
                  className="group flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-primary/5">
                    <Image
                      src={img}
                      alt={a.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      className="group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/95 text-foreground px-2 py-1 rounded-full shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                      Best Of
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                        {a.excerpt}
                      </p>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5 transition-all">
                      Read the list <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Reader-suggestion CTA — mirrors the FRG home placement */}
        {articles.length > 0 && (
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm md:text-base font-bold text-foreground mb-0.5">
                Got a favorite that should make the next list?
              </p>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Tell us your Best Of — your nomination lands with our editors.
              </p>
            </div>
            <Link
              href="/best-of/suggest"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors shadow-sm shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              Suggest a Best Of
            </Link>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
