// /admin/advertisers/[id]/listings — Guide Listings tab. Every guide
// this business appears in, with a click-through to the guide's own
// detail/editor page (when those land). Read-only here: heavy editing
// happens in the guide context, not per-business.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { BookOpen, ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Listings — Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function ListingsTab({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  type GuideListingRow = {
    id: string; listing_tier: string | null; category: string | null;
    is_published: boolean; listing_year: number | null;
    guide_type_slug: string | null;
    guide_data: Record<string, unknown> | null;
    guide_type: { display_name: string; slug: string } | { display_name: string; slug: string }[] | null;
  }
  const { data, error } = await supabase
    .from('guide_listings')
    .select('id, listing_tier, category, is_published, listing_year, guide_type_slug, guide_data, guide_type:guide_types (display_name, slug)')
    .eq('advertiser_account_id', id)
    .order('is_published', { ascending: false })
    .order('listing_year',  { ascending: false, nullsFirst: false })
  const listings = (error ? [] : (data ?? [])) as GuideListingRow[]

  if (listings.length === 0) {
    return (
      <section className="bg-white rounded-lg ring-1 ring-gray-200 p-10 text-center">
        <BookOpen size={28} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-base font-bold text-portal-text">No guide listings yet</h2>
        <p className="text-sm text-portal-sub mt-1">
          When this business is added to a guide (newcomer guide, family fun guide, etc.) the listing appears here with a link back to the guide&apos;s editor.
        </p>
      </section>
    )
  }

  // Group by guide so the editor sees 'this business is in 3 guides'
  // rather than a flat list of 8 entries across multiple years.
  type Group = {
    guideSlug:    string
    guideName:    string
    listings:     GuideListingRow[]
  }
  const groupMap = new Map<string, Group>()
  for (const l of listings) {
    const guide = Array.isArray(l.guide_type) ? l.guide_type[0] : l.guide_type
    const slug  = guide?.slug ?? l.guide_type_slug ?? '(unknown)'
    const name  = guide?.display_name ?? slug
    const grp = groupMap.get(slug) ?? { guideSlug: slug, guideName: name, listings: [] }
    grp.listings.push(l)
    groupMap.set(slug, grp)
  }
  const groups = Array.from(groupMap.values())

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <section key={g.guideSlug} className="bg-white rounded-lg ring-1 ring-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b border-portal-border flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 min-w-0">
              <BookOpen size={14} className="text-portal-muted shrink-0" />
              <h2 className="text-sm font-bold text-portal-text truncate">{g.guideName}</h2>
              <span className="text-[10px] font-mono text-portal-muted">{g.guideSlug}</span>
            </div>
            <Link
              href={`/admin/guides/${g.guideSlug}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-blue hover:underline whitespace-nowrap"
            >
              Open guide <ExternalLink size={10} />
            </Link>
          </header>
          <ul className="divide-y divide-portal-border">
            {g.listings.map(l => {
              const tier = l.listing_tier ?? 'free'
              return (
                <li key={l.id} className={`px-5 py-2.5 flex items-center gap-3 ${l.is_published ? '' : 'opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {l.listing_year && (
                        <span className="text-xs font-bold text-portal-text tabular-nums">{l.listing_year}</span>
                      )}
                      {l.category && (
                        <span className="text-xs text-portal-sub">{l.category}</span>
                      )}
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                        tier === 'sponsor'    ? 'bg-portal-amber-lt text-portal-amber'   :
                        tier === 'premium'    ? 'bg-violet-100 text-violet-800' :
                                                'bg-gray-100 text-portal-sub'
                      }`}>
                        {tier}
                      </span>
                      {!l.is_published && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-portal-muted">Draft</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/guides/${g.guideSlug}/listings/${l.id}/edit`}
                    className="text-[10px] font-bold text-portal-sub hover:text-portal-text whitespace-nowrap"
                  >
                    Edit →
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
