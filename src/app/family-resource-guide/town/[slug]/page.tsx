// /family-resource-guide/town/[slug]
// Profile page for one of the 5 River Region towns. Hero photo, vibe,
// population, schools, highlights, and a link back to the directory
// filtered by town (once that's wired).

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ArrowRight, MapPin, Users, GraduationCap, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

// Navigation + PublicFooter come from /family-resource-guide/layout.tsx.

export const revalidate = 600

interface Props { params: Promise<{ slug: string }> }

interface TownProfile {
  slug:              string
  name:              string
  county:            string | null
  vibe_one_line:     string | null
  description:       string | null
  hero_image_url:    string | null
  population:        number | null
  school_districts:  string[] | null
  highlights:        string[] | null
}

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80&auto=format&fit=crop'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('town_profiles')
    .select('name, vibe_one_line, hero_image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return { title: 'Town — River Region Parents' }
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       `${data.name} — Family Living Guide`,
    description: data.vibe_one_line ?? `Moving to ${data.name}? Schools, neighborhoods, things to do, and family resources in the River Region.`,
    path:        `/family-resource-guide/town/${slug}`,
    image:       (data.hero_image_url as string | null) ?? null,
    type:        'website',
    keywords:    [data.name as string, 'River Region', 'schools', 'neighborhoods', 'moving guide'],
  })
}

export default async function TownPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: townRow }, { data: siblings }] = await Promise.all([
    supabase.from('town_profiles')
      .select('slug, name, county, vibe_one_line, description, hero_image_url, population, school_districts, highlights')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('town_profiles')
      .select('slug, name, vibe_one_line, hero_image_url')
      .eq('is_active', true)
      .neq('slug', slug)
      .order('display_order'),
  ])

  if (!townRow) notFound()
  const town = townRow as TownProfile
  const siblingTowns = (siblings ?? []) as Array<{ slug: string; name: string; vibe_one_line: string | null; hero_image_url: string | null }>

  // ── Place + BreadcrumbList JSON-LD ────────────────────────────────────
  // schema.org/Place tells Google this page is the canonical local
  // landing for the town — boosts "schools in X", "things to do in X",
  // "moving to X" queries. Breadcrumb mirrors the visible trail.
  const { loadBrandContext: _townLoadBrand } = await import('@/lib/brand-context')
  const { placeJsonLd: _placeLd, breadcrumbJsonLd: _crumbsLd, jsonLdScript: _jsonScript } = await import('@/lib/seo/jsonld')
  const townSeoCtx = await _townLoadBrand()
  const townUrl    = `${townSeoCtx.publicOrigin}/family-resource-guide/town/${slug}`
  const townPlaceLd = _placeLd({
    name:             town.name,
    url:              townUrl,
    containedInPlace: town.county ? `${town.county}, ${townSeoCtx.market.state}` : `${townSeoCtx.market.regionLabel}, ${townSeoCtx.market.state}`,
  })
  const townCrumbsLd = _crumbsLd([
    { name: 'Home',                   path: '/' },
    { name: 'Family Resource Guide',  path: '/family-resource-guide' },
    { name: town.name,                path: `/family-resource-guide/town/${slug}` },
  ], townSeoCtx.publicOrigin)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _jsonScript(townPlaceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _jsonScript(townCrumbsLd) }} />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={town.hero_image_url || FALLBACK_HERO}
            alt={town.name}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/72 via-black/50 to-black/35" />
        </div>

        <div className="relative container py-14 md:py-20">
          <Link
            href="/family-resource-guide#towns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85 hover:text-white mb-5"
          >
            <ArrowLeft className="h-3 w-3" /> All River Region Towns
          </Link>

          <div className="max-w-2xl">
            {town.county && (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80 mb-2 inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {town.county}
              </p>
            )}
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-3" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
              {town.name}
            </h1>
            {town.vibe_one_line && (
              <p className="text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                {town.vibe_one_line}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/85 mt-6">
              {town.population && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <strong className="text-white">{town.population.toLocaleString()}</strong> residents
                </span>
              )}
              {town.school_districts && town.school_districts.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {town.school_districts.join(' · ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container py-10 md:py-14 space-y-12">

        {/* ── Description ── */}
        {town.description && (
          <section className="max-w-3xl">
            <p className="text-lg leading-relaxed text-foreground/90" style={{ fontFamily: 'Georgia, serif' }}>
              {town.description}
            </p>
          </section>
        )}

        {/* ── Highlights ── */}
        {town.highlights && town.highlights.length > 0 && (
          <section className="rounded-2xl bg-card border border-border/40 p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> What's great here
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
              Local favorites
            </h2>
            <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-6">
              {town.highlights.map((h, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/85 leading-relaxed">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── CTAs ── */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/family-resource-guide#directory"
            className="group rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 p-6 transition-colors"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Find a Service</p>
            <p className="text-base font-bold text-foreground leading-snug mb-2">
              Browse the full Family Resource Guide
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pediatricians, schools, childcare, day camps, counselors, and more — all in one place.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-3 group-hover:gap-1.5 transition-all">
              Browse <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link
            href="/calendar"
            className="group rounded-2xl border border-secondary/30 bg-secondary/5 hover:bg-secondary/10 p-6 transition-colors"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">What's On</p>
            <p className="text-base font-bold text-foreground leading-snug mb-2">
              See what's happening in {town.name}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Community events, festivals, school happenings — the live calendar updates daily.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-secondary mt-3 group-hover:gap-1.5 transition-all">
              View Calendar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>

        {/* ── Sibling towns ── */}
        {siblingTowns.length > 0 && (
          <section className="border-t border-border/30 pt-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">More River Region Towns</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
              See where else River Region families live
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {siblingTowns.map(s => {
                const img = s.hero_image_url || FALLBACK_HERO
                return (
                  <Link
                    key={s.slug}
                    href={`/family-resource-guide/town/${s.slug}`}
                    className="group flex flex-col rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 transition-all"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={img}
                        alt={s.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        style={{ objectFit: 'cover' }}
                        className="group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <p className="absolute bottom-2 left-3 text-white font-bold text-sm" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                        {s.name}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
