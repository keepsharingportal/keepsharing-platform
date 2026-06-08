// /admin/verticals
// List of every vertical (non-guide content home). Click a card to edit
// identity, hero image, CTA, and sponsor label.

import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutGrid, ChevronRight, ExternalLink, Image as ImageIcon, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Verticals — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface VerticalRow {
  slug:              string
  display_name:      string
  subtitle:          string | null
  hero_image_url:    string | null
  kind:              string
  is_active:         boolean
  primary_cta_label: string | null
}

const KIND_LABEL: Record<string, string> = {
  topic:     'Topic',
  community: 'Community',
}

const PUBLIC_PATH: Record<string, string> = {
  'school-zone':    '/school-zone',
  'mom-knows-best': '/mom-knows-best',
}

export default async function VerticalsAdminPage() {
  const supabase = createAdminClient()

  const [
    { data: verticals },
    { data: sponsors },
  ] = await Promise.all([
    supabase.from('verticals')
      .select('slug, display_name, subtitle, hero_image_url, kind, is_active, primary_cta_label')
      .order('display_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase.from('ad_placements')
      .select('placement_context, advertiser:advertiser_accounts(business_name)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true),
  ])

  // Map slug → sponsor business name (if any)
  const sponsorBySlug: Record<string, string> = {}
  for (const s of (sponsors ?? []) as Array<{
    placement_context: string | null
    advertiser: { business_name?: string } | null
  }>) {
    const adv = s.advertiser as { business_name?: string } | null
    const ctx = s.placement_context ?? ''
    if (ctx && adv?.business_name) sponsorBySlug[ctx] = adv.business_name
  }

  const rows = (verticals ?? []) as VerticalRow[]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-portal-text flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-portal-blue" />
          Verticals
        </h1>
        <p className="text-sm text-portal-sub mt-0.5">
          Year-round content homes — School Zone, Mom Knows Best, and future verticals.
          Different from <Link href="/admin/guides" className="text-portal-blue hover:underline">Guides</Link>, which are tied to monthly print issues.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-portal-border p-12 text-center bg-white">
          <LayoutGrid className="h-8 w-8 text-portal-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-portal-text">No verticals yet</p>
          <p className="text-xs text-portal-sub mt-1">Run migration 069 in Supabase SQL editor to seed the first two.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map(v => {
            const sponsor = sponsorBySlug[v.slug] ?? null
            const publicHref = PUBLIC_PATH[v.slug] ?? `/${v.slug}`
            return (
              <Link
                key={v.slug}
                href={`/admin/verticals/${v.slug}/edit`}
                className={`rounded-xl border bg-white overflow-hidden hover:shadow-md hover:border-portal-border-2 transition-all ${v.is_active ? 'border-portal-border' : 'border-portal-border opacity-70'}`}
              >
                {/* Hero strip */}
                <div className="relative aspect-[16/7] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {v.hero_image_url ? (
                    <Image
                      src={v.hero_image_url}
                      alt={v.display_name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-portal-muted">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest bg-white/90 text-portal-text px-2 py-0.5 rounded backdrop-blur-sm">
                    {KIND_LABEL[v.kind] ?? v.kind}
                  </span>
                  {!v.is_active && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-gray-700/80 text-white px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                  {!v.hero_image_url && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-portal-amber-lt0 text-white px-1.5 py-0.5 rounded">
                      <AlertCircle size={9} /> No hero
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-bold text-portal-text leading-tight group-hover:text-portal-blue">
                      {v.display_name}
                    </h3>
                    <ChevronRight size={14} className="text-gray-300 shrink-0 mt-1" />
                  </div>
                  {v.subtitle && (
                    <p className="text-xs text-portal-sub leading-snug line-clamp-2 mb-3">{v.subtitle}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${sponsor ? 'bg-portal-amber-lt text-portal-amber' : 'bg-gray-100 text-portal-sub'}`}>
                      {sponsor ? `Sponsor: ${sponsor}` : 'Sponsor available'}
                    </span>
                    {v.primary_cta_label && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-portal-blue-lt text-portal-blue">
                        CTA: {v.primary_cta_label}
                      </span>
                    )}
                    <Link
                      href={publicHref}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-portal-sub hover:bg-gray-200"
                    >
                      <ExternalLink size={9} /> {publicHref}
                    </Link>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
