// Seasonal Summer Fun homepage block — driven by real guide_listings data.
// No fake categories, no random Unsplash fallback.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Sun, ArrowRight, Calendar } from 'lucide-react'

// Curated list of categories worth surfacing as homepage tiles, paired with
// an emoji. Anything not in this list still appears on the guide directory.
const CATEGORY_TILE_MAP: Record<string, { label: string; emoji: string }> = {
  'Swim':                                { label: 'Swim',              emoji: '🏊' },
  'Day Camps':                           { label: 'Day Camps',         emoji: '⛺' },
  'Day Trips':                           { label: 'Day Trips',         emoji: '🚗' },
  'Dance/Gymnastics/Cheer Camps':        { label: 'Dance & Gym',       emoji: '🤸' },
  'Art/Music/Theater':                   { label: 'Art / Music',       emoji: '🎨' },
  'Sports Camps':                        { label: 'Sports Camps',      emoji: '⚽' },
  'Educational/Training/Miscellaneous':  { label: 'Educational',       emoji: '📚' },
  'Education/Science/Technology Camps':  { label: 'STEM',              emoji: '🔬' },
  'Martial Arts':                        { label: 'Martial Arts',      emoji: '🥋' },
  'Libraries':                           { label: 'Libraries',         emoji: '📖' },
  'Sports Clinics':                      { label: 'Sports Clinics',    emoji: '🏟️' },
  'Bowling':                             { label: 'Bowling',           emoji: '🎳' },
  'Horseback Riding/Equestrian Camps':   { label: 'Horseback',         emoji: '🐎' },
  'Recreation':                          { label: 'Recreation',        emoji: '🎉' },
  'Skating':                             { label: 'Skating',           emoji: '⛸️' },
  'Biking':                              { label: 'Biking',            emoji: '🚴' },
}

interface GuideConfig {
  title:              string | null
  subtitle:           string | null
  hero_image_url:     string | null
  homepage_image_url: string | null
  primary_cta_label:  string | null
  primary_cta_url:    string | null
}

async function getData(): Promise<{
  totalCount: number
  topCategories: Array<{ slug: string; label: string; emoji: string; count: number }>
  config: GuideConfig | null
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Total + per-category counts (real data)
    const [{ count: totalCount }, { data: catRows }, { data: configRow }] = await Promise.all([
      supabase.from('guide_listings').select('id', { count: 'exact', head: true }).eq('guide_type_slug', 'summer-fun').eq('is_published', true),
      supabase.from('guide_listings').select('category').eq('guide_type_slug', 'summer-fun').eq('is_published', true).not('category', 'is', null),
      supabase.from('guide_configs').select('title, subtitle, hero_image_url, homepage_image_url, primary_cta_label, primary_cta_url').eq('guide_type_slug', 'summer-fun').maybeSingle(),
    ])

    // Tally categories
    const map: Record<string, number> = {}
    for (const r of catRows ?? []) {
      const c = (r.category as string | null)?.trim()
      if (c) map[c] = (map[c] ?? 0) + 1
    }

    // Build top tiles — limit to 8, drop categories we don't have a tile for
    const topCategories = Object.entries(map)
      .filter(([cat]) => CATEGORY_TILE_MAP[cat])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, count]) => ({
        slug:  encodeURIComponent(cat),
        label: CATEGORY_TILE_MAP[cat].label,
        emoji: CATEGORY_TILE_MAP[cat].emoji,
        count,
      }))

    return { totalCount: totalCount ?? 0, topCategories, config: configRow as GuideConfig | null }
  } catch {
    return { totalCount: 0, topCategories: [], config: null }
  }
}

export async function SummerFunBlock() {
  const { totalCount, topCategories, config } = await getData()

  const title    = config?.title    ?? 'Summer Fun Guide'
  const subtitle = config?.subtitle ?? 'Camps, day trips, swim spots, and the activities that make summer feel like summer.'
  const ctaUrl   = config?.primary_cta_url   ?? '/summer-fun-guide'
  const ctaLabel = config?.primary_cta_label ?? 'View All'
  const hero     = config?.homepage_image_url ?? config?.hero_image_url

  const sub = totalCount > 0
    ? `${totalCount} River Region listings · ${topCategories.length || 16} categories`
    : subtitle

  return (
    <section className="relative rounded-3xl overflow-hidden">
      {/* Background — real image if configured, otherwise branded gradient (no random Unsplash) */}
      <div className="absolute inset-0">
        {hero ? (
          <Image src={hero} alt="" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} sizes="100vw" unoptimized />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: hero
              ? 'linear-gradient(135deg, rgba(76, 29, 13, 0.78) 0%, rgba(154, 52, 18, 0.60) 60%, rgba(217, 119, 6, 0.50) 100%)'
              : 'linear-gradient(135deg, #4c1d0d 0%, #9a3412 45%, #d97706 100%)',
          }}
        />
        {/* Subtle sun-pattern overlay so even the no-image version doesn't feel flat */}
        {!hero && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 2px), radial-gradient(circle at 80% 70%, white 1px, transparent 2px)',
              backgroundSize: '60px 60px, 80px 80px',
            }}
          />
        )}
      </div>

      <div className="relative p-6 md:p-8 lg:p-10 z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sun className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Summer 2026</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{title}</h2>
            <p className="text-sm text-white/80 mt-1.5 max-w-lg">{sub}</p>
          </div>
          <Link
            href={ctaUrl}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-sm font-bold rounded-full transition-colors whitespace-nowrap shadow-sm"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Real category tiles — only categories that have actual listings */}
        {topCategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {topCategories.map(tile => (
              <Link
                key={tile.slug}
                href={`/summer-fun-guide?category=${tile.slug}#directory`}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-white/15 bg-white/95 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all"
              >
                <span className="text-2xl shrink-0">{tile.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 leading-tight truncate">{tile.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tile.count} {tile.count === 1 ? 'listing' : 'listings'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-6 text-center text-white/80 text-sm">
            Summer listings will appear here once the guide is published.
          </div>
        )}

        {/* Bottom CTA row */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href="/summer-camp-guide" className="flex items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-white transition-colors">
            Browse Summer Camps <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/calendar" className="flex items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-white transition-colors">
            <Calendar className="h-3.5 w-3.5" /> Summer Events
          </Link>
        </div>
      </div>
    </section>
  )
}
