// /school-zone/school-bits/<slug> — one school bit, on its own page.
//
// Replaces sharing a bit as /school-zone/school-bits?focus=<uuid>, which told
// a parent nothing about what they were being sent, looked like spam pasted
// into a text message, and dropped the reader on the whole feed rather than the
// item they clicked. It also gave search engines nothing: a bit about one
// school's news had no URL of its own, so it could never rank for that
// school's name — which is exactly the search a local parent makes.
//
// Old ?focus= links still work; the feed page 301s them here.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArrowLeft, School as SchoolIcon, ExternalLink } from 'lucide-react'
import { normalizeUnicodeText } from '@/lib/school-news/text'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { shouldSkipNextOptimizer } from '@/lib/images'
import type { Metadata } from 'next'

export const revalidate = 900

interface PageParams { params: Promise<{ slug: string }> }

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Bit {
  id: string; slug: string; title: string; blurb: string
  school_name: string | null; image_web_url: string | null
  image_width: number | null; image_height: number | null
  source_url: string | null; published_at: string | null; created_at: string
}

async function loadBit(slug: string): Promise<Bit | null> {
  const { data } = await supabaseAdmin()
    .from('school_bits')
    .select('id, slug, title, blurb, school_name, image_web_url, image_width, image_height, source_url, published_at, created_at')
    .eq('slug', slug)
    .in('status', ['approved', 'published'])
    .maybeSingle()
  return (data as Bit | null) ?? null
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params
  const bit = await loadBit(slug)
  if (!bit) return { title: 'School Bit Not Found' }

  const title = normalizeUnicodeText(bit.title)
  const blurb = normalizeUnicodeText(bit.blurb ?? '').replace(/\s+/g, ' ').trim()

  // buildPageMetadata rather than hand-rolled openGraph: it routes the image
  // through /api/og-image, so the card gets a real 1200x630 JPEG. The feed
  // page's hand-written version pointed og:image straight at the WebP with
  // no dimensions, which is what makes Facebook render the small
  // side-thumbnail card instead of the full-width one.
  return buildPageMetadata({
    title:       bit.school_name ? `${title} — ${bit.school_name}` : title,
    description: blurb.length > 200 ? `${blurb.slice(0, 197)}…` : (blurb || `School news from ${bit.school_name ?? 'the River Region'}.`),
    path:        `/school-zone/school-bits/${bit.slug}`,
    image:       bit.image_web_url,
    type:        'article',
    publishedTime: bit.published_at ?? bit.created_at,
  })
}

export default async function SchoolBitPage({ params }: PageParams) {
  const { slug } = await params
  const bit = await loadBit(slug)
  if (!bit) notFound()

  const title = normalizeUnicodeText(bit.title)
  const blurb = normalizeUnicodeText(bit.blurb ?? '')

  // A few more from the feed, so the page isn't a dead end.
  const { data: moreData } = await supabaseAdmin()
    .from('school_bits')
    .select('slug, title, school_name, image_web_url')
    .in('status', ['approved', 'published'])
    .not('slug', 'is', null)
    .neq('id', bit.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)
  const more = (moreData ?? []) as Array<{ slug: string; title: string; school_name: string | null; image_web_url: string | null }>

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />

      <div className="border-b border-border/40">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'School Zone', href: '/school-zone' },
              { label: 'School Bits', href: '/school-zone/school-bits' },
              { label: title },
            ]}
          />
        </div>
      </div>

      <main className="container py-8 md:py-12">
        <article className="max-w-3xl mx-auto">
          {bit.school_name && (
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-3">
              <SchoolIcon className="h-3.5 w-3.5" /> {bit.school_name}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-5">
            {title}
          </h1>

          {bit.image_web_url && (
            <div className="relative w-full rounded-2xl overflow-hidden border border-border/50 mb-6 bg-muted">
              <Image
                src={bit.image_web_url}
                alt={title}
                width={bit.image_width ?? 1200}
                height={bit.image_height ?? 800}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized={shouldSkipNextOptimizer(bit.image_web_url)}
                priority
              />
            </div>
          )}

          {blurb && (
            <div className="text-lg text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {blurb}
            </div>
          )}

          {bit.source_url && (
            <a
              href={bit.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-primary hover:underline"
            >
              Read more at the source <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="mt-10 pt-6 border-t border-border/50">
            <Link
              href="/school-zone/school-bits"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> All School Bits
            </Link>
          </div>
        </article>

        {more.length > 0 && (
          <section className="max-w-3xl mx-auto mt-12">
            <h2 className="text-xl font-bold text-foreground mb-4">More from the River Region</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {more.map(m => (
                <Link
                  key={m.slug}
                  href={`/school-zone/school-bits/${m.slug}`}
                  className="group rounded-xl border border-border/60 overflow-hidden bg-card hover:shadow-md transition-shadow"
                >
                  {m.image_web_url && (
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image
                        src={m.image_web_url}
                        alt={normalizeUnicodeText(m.title)}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized={shouldSkipNextOptimizer(m.image_web_url)}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    {m.school_name && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {m.school_name}
                      </p>
                    )}
                    <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-3">
                      {normalizeUnicodeText(m.title)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
