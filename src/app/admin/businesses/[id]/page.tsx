// /admin/businesses/[id] — single business profile editor.
//
// Edit the canonical record once; every linked stop / listing / advertiser
// shows the same name, address, socials, logo on the public surfaces.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BusinessProfileClient, type BusinessProfile, type LinkedRow } from './BusinessProfileClient'

export const metadata = { title: 'Business profile — Admin' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function BusinessProfilePage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()

  const { data: biz, error } = await sb
    .from('businesses')
    .select('id, name, normalized_name, address, city, state, zip, lat, lng, contact_name, phone, email, website, instagram, facebook, tiktok, logo_path, description, categories, archived_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !biz) notFound()
  const profile = biz as BusinessProfile

  const [stopsRes, listingsRes, advsRes] = await Promise.all([
    sb.from('circulation_stops')
      .select('id, name, address, city, market, route_id, ad_level')
      .eq('business_id', id),
    sb.from('guide_listings')
      .select('id, guide_type_slug, listing_tier, category, is_published')
      .eq('business_id', id),
    sb.from('advertiser_accounts')
      .select('id, business_name, package_tier, contract_start_date, contract_end_date')
      .eq('business_id', id),
  ])

  const stops: LinkedRow[]      = ((stopsRes.data ?? []) as Array<{ id: string; name: string; address: string | null; city: string | null; market: string; route_id: string; ad_level: string | null }>)
    .map(s => ({
      id:        s.id,
      label:     s.name,
      sublabel:  [s.address, s.city, s.market.toUpperCase()].filter(Boolean).join(' · '),
      badge:     s.ad_level ?? null,
      href:      `/admin/circulation/routes?id=${s.route_id}&edit_stop=${s.id}`,
    }))
  const listings: LinkedRow[]   = ((listingsRes.data ?? []) as Array<{ id: string; guide_type_slug: string | null; listing_tier: string; category: string | null; is_published: boolean }>)
    .map(l => ({
      id:        l.id,
      label:     l.guide_type_slug ?? 'Guide listing',
      sublabel:  [l.category, l.listing_tier].filter(Boolean).join(' · '),
      badge:     l.is_published ? 'Published' : 'Draft',
      href:      `/admin/guides`,
    }))
  const advertisers: LinkedRow[] = ((advsRes.data ?? []) as Array<{ id: string; business_name: string; package_tier: string | null; contract_start_date: string | null; contract_end_date: string | null }>)
    .map(a => ({
      id:        a.id,
      label:     a.business_name,
      sublabel:  [a.package_tier, a.contract_start_date && `${a.contract_start_date} → ${a.contract_end_date ?? 'open'}`].filter(Boolean).join(' · '),
      badge:     a.package_tier,
      href:      `/admin/advertisers/${a.id}`,
    }))

  return (
    <BusinessProfileClient
      profile={profile}
      stops={stops}
      listings={listings}
      advertisers={advertisers}
    />
  )
}
