// /admin/guides
// List of every guide. Each card opens the editor where Jason can swap hero
// image, print cover, Issuu link, description, CTA — the guide's "magazine"
// identity. Listing-outreach tracking moved to /admin/guides/outreach.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, ChevronRight, Image as ImageIcon, ExternalLink, Mail, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Guides — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface GuideRow {
  slug:              string
  url_slug:          string | null
  display_name:      string
  short_description: string | null
  pitch:             string | null
  hero_image_url:    string | null
  display_order:     number | null
}

interface ConfigRow {
  guide_type_slug:    string
  homepage_image_url: string | null
  print_cover_url:    string | null
  issuu_url:          string | null
  is_active:          boolean | null
}

export default async function GuidesAdminPage() {
  const supabase = await createClient()

  const [
    { data: guides },
    { data: configs },
    { data: listingRows },
    { data: articleRows },
    { data: sponsorRows },
  ] = await Promise.all([
    supabase.from('guide_types')
      .select('slug, url_slug, display_name, short_description, pitch, hero_image_url, display_order')
      .order('display_order', { ascending: true, nullsFirst: false }),
    supabase.from('guide_configs')
      .select('guide_type_slug, homepage_image_url, print_cover_url, issuu_url, is_active'),
    supabase.from('guide_listings')
      .select('guide_type_slug')
      .eq('is_published', true),
    supabase.from('guide_articles')
      .select('guide_slug')
      .eq('published', true),
    supabase.from('ad_placements')
      .select('placement_context')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true),
  ])

  const configBySlug = new Map<string, ConfigRow>(
    (configs ?? []).map((c: ConfigRow) => [c.guide_type_slug, c]),
  )

  // Count listings per guide_type_slug
  const listingCounts: Record<string, number> = {}
  for (const r of listingRows ?? []) listingCounts[r.guide_type_slug] = (listingCounts[r.guide_type_slug] ?? 0) + 1

  // Articles can be tagged with either internal slug or url_slug — count both
  const articleCounts: Record<string, number> = {}
  for (const r of articleRows ?? []) {
    const k = r.guide_slug as string | null
    if (k) articleCounts[k] = (articleCounts[k] ?? 0) + 1
  }

  // Section sponsor presence
  const sponsorSlugs = new Set<string>()
  for (const r of sponsorRows ?? []) {
    const ctx = (r.placement_context as string | null) ?? ''
    if (ctx) sponsorSlugs.add(ctx)
  }

  const rows = (guides ?? []) as GuideRow[]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Guides
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Each guide is a digital magazine. Click a card to edit the hero, print cover, Issuu link, description, and CTA.
          </p>
        </div>
        <Link
          href="/admin/guides/outreach"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <Mail size={12} /> Listing Outreach Tracker
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(g => {
          const config       = configBySlug.get(g.slug)
          const hero         = g.hero_image_url
          const printCover   = config?.print_cover_url ?? null
          const hasIssuu     = !!config?.issuu_url
          const listingCount = listingCounts[g.slug] ?? 0
          const articleCount = (articleCounts[g.slug] ?? 0) + (articleCounts[g.url_slug ?? ''] ?? 0)
          const hasSponsor   = [...sponsorSlugs].some(ctx => ctx.includes(g.slug))
          const isActive     = config?.is_active !== false
          const missingHero  = !hero

          return (
            <Link
              key={g.slug}
              href={`/admin/guides/${g.slug}/edit`}
              className={`group rounded-xl border bg-white overflow-hidden hover:shadow-md hover:border-blue-300 transition-all ${isActive ? 'border-gray-200' : 'border-gray-200 opacity-70'}`}
            >
              {/* Hero image strip */}
              <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {hero ? (
                  <Image
                    src={hero}
                    alt={g.display_name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {!isActive && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-gray-700/80 text-white px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
                {missingHero && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded">
                    <AlertCircle size={9} /> No hero
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
                    {g.display_name}
                  </h3>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 shrink-0 mt-0.5" />
                </div>
                {g.pitch && (
                  <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">{g.pitch}</p>
                )}

                {/* Status pills */}
                <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-semibold">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    {listingCount} listings
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                    {articleCount} articles
                  </span>
                  {hasSponsor && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                      Sponsor
                    </span>
                  )}
                  {printCover && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Print cover
                    </span>
                  )}
                  {hasIssuu && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      <ExternalLink size={9} /> Issuu
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center bg-white">
          <p className="text-sm text-gray-500">No guides in <code className="px-1 bg-gray-100 rounded">guide_types</code>.</p>
        </div>
      )}
    </div>
  )
}
