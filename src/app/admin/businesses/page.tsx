// /admin/businesses — Businesses (canonical profiles).
//
// Each row in `businesses` is a real-world business with one canonical
// profile (name + address + contact + socials + logo + description).
// circulation_stops, guide_listings, and advertiser_accounts all FK to
// here, so editing a profile here updates every surface that renders
// the business.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BusinessesClient, type BusinessSummary } from './BusinessesClient'

export const metadata = { title: 'Businesses — Admin' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function BusinessesIndexPage({ searchParams }: PageProps) {
  await requireAdmin()
  const sp = await searchParams
  const q  = sp.q?.trim() ?? ''
  const sb = createAdminClient()

  let businesses: BusinessSummary[] = []
  let migrationMissing = false

  try {
    // Headline list — capped, with link counts joined from the three child tables.
    const { data, error } = await sb
      .from('businesses')
      .select('id, name, address, city, archived_at, logo_path')
      .is('archived_at', null)
      .is('merged_into_id', null)
      .order('name')
      .limit(500)
    if (error && /relation "businesses" does not exist/i.test(error.message)) {
      migrationMissing = true
    } else {
      const ids = (data ?? []).map(b => b.id)
      // Counts per business — three head:true queries are cheaper than
      // a full join for the list view.
      const [stopsRes, listingsRes, advsRes] = await Promise.all([
        sb.from('circulation_stops').select('business_id').in('business_id', ids),
        sb.from('guide_listings').select('business_id').in('business_id', ids),
        sb.from('advertiser_accounts').select('business_id').in('business_id', ids),
      ])
      const countOf = (rows: Array<{ business_id: string | null }>) => {
        const m = new Map<string, number>()
        for (const r of rows) if (r.business_id) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1)
        return m
      }
      const stopsBy    = countOf(((stopsRes.data ?? []) as Array<{ business_id: string }>))
      const listingsBy = countOf(((listingsRes.data ?? []) as Array<{ business_id: string }>))
      const advsBy     = countOf(((advsRes.data ?? []) as Array<{ business_id: string }>))
      businesses = (data ?? []).map(b => ({
        id:            b.id as string,
        name:          b.name as string,
        address:       b.address as string | null,
        city:          b.city as string | null,
        logo_path:     b.logo_path as string | null,
        stop_count:    stopsBy.get(b.id as string)    ?? 0,
        listing_count: listingsBy.get(b.id as string) ?? 0,
        advertiser_count: advsBy.get(b.id as string)  ?? 0,
      }))
      if (q) {
        const needle = q.toLowerCase()
        businesses = businesses.filter(b =>
          b.name.toLowerCase().includes(needle) ||
          (b.address ?? '').toLowerCase().includes(needle) ||
          (b.city    ?? '').toLowerCase().includes(needle)
        )
      }
    }
  } catch { migrationMissing = true }

  // Unlinked counts — surface how much work backfill can still do
  let unlinkedStops = 0, unlinkedListings = 0, unlinkedAdvertisers = 0
  try {
    const [s, l, a] = await Promise.all([
      sb.from('circulation_stops').select('id', { count: 'exact', head: true }).is('business_id', null).eq('is_pickup', false),
      sb.from('guide_listings').select('id', { count: 'exact', head: true }).is('business_id', null),
      sb.from('advertiser_accounts').select('id', { count: 'exact', head: true }).is('business_id', null).is('archived_at', null),
    ])
    unlinkedStops      = s.count ?? 0
    unlinkedListings   = l.count ?? 0
    unlinkedAdvertisers = a.count ?? 0
  } catch { /* migration not run yet */ }

  return (
    <BusinessesClient
      q={q}
      businesses={businesses}
      migrationMissing={migrationMissing}
      counts={{
        unlinkedStops,
        unlinkedListings,
        unlinkedAdvertisers,
        total: businesses.length,
      }}
    />
  )
}
