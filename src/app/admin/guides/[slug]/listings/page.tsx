// /admin/guides/[slug]/listings — browse every listing in one guide.
//
// Server fetches the guide metadata + all of its listings, hands off
// to a client component that owns the search / filter / sort /
// multi-select state. Click-through to per-listing edit lives at
// /admin/guides/[slug]/listings/[id]/edit (or just `/listings/[id]`).

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { ArrowLeft, BookOpen, Plus } from 'lucide-react'
import { GuideListingsBrowseClient, type GuideListingRow } from './GuideListingsBrowseClient'

export const metadata: Metadata = { title: 'Guide Listings — Admin' }
export const dynamic  = 'force-dynamic'

interface Props {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; tier?: string; assoc?: string; published?: string; sort?: string }>
}

export default async function GuideListingsBrowsePage({ params, searchParams }: Props) {
  await requireAdmin()
  const { slug } = await params
  const sp       = await searchParams

  const supabase = createAdminClient()

  // Guide metadata for the header.
  const { data: guide, error: guideErr } = await supabase
    .from('guide_types')
    .select('slug, display_name, short_description, primary_filter_field')
    .eq('slug', slug)
    .maybeSingle()
  if (guideErr || !guide) return notFound()

  // All listings in this guide. We pull both inline columns AND the
  // legacy advertiser join so we can flag rows that still need the
  // join fallback (data-quality signal for the editor).
  const { data: listings, error: listErr } = await supabase
    .from('guide_listings')
    .select(`
      id, advertiser_account_id, listing_tier, category, subcategory,
      is_published, listing_year, display_order,
      business_name, office_phone, mobile_phone, website_url,
      contact_email, address, city_state_zip, neighborhood, card_hook,
      advertiser:advertiser_account_id (id, business_name, slug)
    `)
    .eq('guide_type_slug', slug)
    .order('listing_year', { ascending: false, nullsFirst: false })
    .order('business_name', { ascending: true })

  if (listErr) {
    return (
      <div className="p-12 text-center text-sm text-rose-700">
        Failed to load listings: {listErr.message}
      </div>
    )
  }

  type Raw = Omit<GuideListingRow, 'business_name' | 'advertiser_slug'> & {
    business_name: string | null
    advertiser: { id: string; business_name: string; slug: string | null } | { id: string; business_name: string; slug: string | null }[] | null
  }
  const rows: GuideListingRow[] = ((listings ?? []) as Raw[]).map(r => {
    const adv = Array.isArray(r.advertiser) ? r.advertiser[0] : r.advertiser
    return {
      ...r,
      // Prefer inline name; fall back to linked advertiser name for
      // legacy rows where the backfill didn't catch them.
      business_name:   r.business_name ?? adv?.business_name ?? '(unnamed)',
      advertiser_slug: adv?.slug ?? null,
    }
  })

  // Counts for the header strip.
  const total      = rows.length
  const featured   = rows.filter(r => r.listing_tier === 'featured').length
  const claimed    = rows.filter(r => r.advertiser_account_id != null).length
  const unclaimed  = total - claimed
  const draft      = rows.filter(r => !r.is_published).length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <Link href="/admin/guides" className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={12} /> All Guides
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
              <BookOpen size={20} className="text-gray-400" /> {guide.display_name}
            </h1>
            {guide.short_description && (
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">{guide.short_description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/guides/${slug}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Guide settings
            </Link>
            <Link
              href={`/admin/guides/${slug}/listings/new`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              <Plus size={14} /> New Listing
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatTile label="Total listings"    value={total}     tone="neutral" />
          <StatTile label="Featured / paid"   value={featured}  tone="amber"   />
          <StatTile label="Linked to CRM"     value={claimed}   tone="emerald" />
          <StatTile label="Unclaimed"         value={unclaimed} tone="neutral" />
          <StatTile label="Drafts"            value={draft}     tone="gray"    />
        </div>
      </div>

      {/* List */}
      <GuideListingsBrowseClient
        slug={slug}
        guideName={guide.display_name}
        rows={rows}
        initialQuery={(sp.q ?? '').trim()}
        initialTier={(sp.tier ?? 'all') as 'all' | 'featured' | 'community' | 'enhanced'}
        initialAssoc={(sp.assoc ?? 'all') as 'all' | 'linked' | 'unlinked'}
        initialPublished={(sp.published ?? 'all') as 'all' | 'published' | 'draft'}
        initialSort={(sp.sort ?? 'name') as 'name' | 'year' | 'tier'}
      />
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'amber' | 'emerald' | 'gray' }) {
  const cls =
    tone === 'amber'   ? 'border-amber-200 bg-amber-50/60'   :
    tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/60' :
    tone === 'gray'    ? 'border-gray-200 bg-gray-50/60'     :
                         'border-gray-200 bg-white'
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  )
}
