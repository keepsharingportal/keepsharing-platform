// /admin/guides/[slug]/listings/[id]/edit — full-page editor for one guide listing.
//
// Loads the listing + its guide context + all advertisers (for the
// 'Associate with business' picker), hands to the client form for the
// edit experience. The client handles save/delete/promote.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { EditListingClient, type EditableListing, type AdvertiserOption } from './EditListingClient'

export const metadata: Metadata = { title: 'Edit Listing — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ slug: string; id: string }> }

export default async function EditListingPage({ params }: Props) {
  await requireAdmin()
  const { slug, id } = await params

  const supabase = createAdminClient()

  const [guideRes, listingRes, advRes] = await Promise.all([
    supabase
      .from('guide_types')
      .select('slug, display_name')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('guide_listings')
      .select(`
        id, advertiser_account_id, guide_type_slug, listing_tier, category,
        is_published, listing_year, display_order, tags, notes,
        business_name, office_phone, mobile_phone, website_url,
        contact_email, address, city_state_zip, neighborhood,
        hero_photo_url, card_hook, guide_data,
        advertiser:advertiser_account_id (id, business_name, slug)
      `)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, kind')
      .order('business_name', { ascending: true })
      .limit(5000),
  ])

  if (guideRes.error || !guideRes.data) return notFound()
  if (listingRes.error || !listingRes.data) return notFound()

  type Raw = Omit<EditableListing, 'linked_advertiser_name'> & {
    advertiser: { id: string; business_name: string; slug: string | null } | { id: string; business_name: string; slug: string | null }[] | null
  }
  const raw = listingRes.data as unknown as Raw
  const linkedAdv = Array.isArray(raw.advertiser) ? raw.advertiser[0] : raw.advertiser
  const listing: EditableListing = {
    ...raw,
    linked_advertiser_name: linkedAdv?.business_name ?? null,
  }

  const advertisers = ((advRes.data ?? []) as Array<{ id: string; business_name: string; kind: string | null }>)
  // CRM ('advertiser' kind) shows in the picker first; directory-only
  // are noisy and rarely the right link target.
  const advertiserOptions: AdvertiserOption[] = advertisers
    .filter(a => (a.kind ?? 'directory_only') === 'advertiser')
    .map(a => ({ id: a.id, business_name: a.business_name }))

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg min-h-full">
      <EditListingClient
        slug={slug}
        guideName={guideRes.data.display_name}
        listing={listing}
        advertisers={advertiserOptions}
      />
    </div>
  )
}
