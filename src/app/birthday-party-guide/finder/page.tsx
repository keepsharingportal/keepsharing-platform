// ── /birthday-party-guide/finder — Party Finder ─────────────────
//
// Filterable directory page. The search experience parents actually
// want — filter by age, party type, indoor/outdoor, neighborhood,
// and the existing guide categories. Results come from the 89-vendor
// guide_listings table, joined with advertiser_accounts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Search } from 'lucide-react'
import { PartyFinderClient } from './PartyFinderClient'

export const revalidate = 600

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export const metadata: Metadata = {
  title: 'Party Finder — The Big Birthday Bash | River Region Parents',
  description: 'Filter 89 vetted River Region birthday vendors by age, party type, indoor/outdoor, and neighborhood. Find the right venue, entertainer, cake artist, or party rental in minutes.',
}

export default async function PartyFinderPage() {
  const supabase = sb()

  // Pull every published birthday listing with its joined advertiser.
  const { data } = await supabase
    .from('guide_listings')
    .select(`
      id, category, listing_tier, guide_data,
      advertiser_accounts (
        id, slug, business_name, card_hook, hero_photo_url,
        neighborhood, city_state_zip, website_url, office_phone,
        birthday_tier, birthday_profile,
        is_locally_owned, is_woman_owned
      )
    `)
    .eq('guide_type_slug', 'birthday-party-guide')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .limit(200)

  type RawRow = {
    id: string; category: string | null; listing_tier: string | null
    guide_data: Record<string, unknown> | null
    advertiser_accounts: {
      id: string; slug: string; business_name: string
      card_hook: string | null; hero_photo_url: string | null
      neighborhood: string | null; city_state_zip: string | null
      website_url: string | null; office_phone: string | null
      birthday_tier: string | null
      birthday_profile: Record<string, unknown> | null
      is_locally_owned: boolean | null; is_woman_owned: boolean | null
    } | { slug: string; business_name: string }[] | null
  }

  const rows = ((data ?? []) as unknown as RawRow[])
    .map(r => {
      const adv = Array.isArray(r.advertiser_accounts) ? r.advertiser_accounts[0] : r.advertiser_accounts
      if (!adv) return null
      const profile = (adv as { birthday_profile?: Record<string, unknown> | null }).birthday_profile ?? {}
      return {
        id:          r.id,
        category:    r.category ?? 'Other',
        listing_tier: r.listing_tier ?? 'standard',
        slug:        (adv as { slug: string }).slug,
        business_name: (adv as { business_name: string }).business_name,
        card_hook:    (adv as { card_hook?: string | null }).card_hook ?? null,
        hero:         (adv as { hero_photo_url?: string | null }).hero_photo_url ?? null,
        neighborhood: (adv as { neighborhood?: string | null }).neighborhood ?? null,
        city:         (adv as { city_state_zip?: string | null }).city_state_zip ?? null,
        phone:        (adv as { office_phone?: string | null }).office_phone ?? null,
        website:      (adv as { website_url?: string | null }).website_url ?? null,
        tier:         (adv as { birthday_tier?: string | null }).birthday_tier ?? null,
        ages:         (profile as { good_for_ages?: [number, number] }).good_for_ages ?? null,
        venue_kind:   (profile as { indoor_outdoor?: string[] }).indoor_outdoor ?? null,
        is_local:     (adv as { is_locally_owned?: boolean }).is_locally_owned ?? false,
        is_woman:     (adv as { is_woman_owned?: boolean }).is_woman_owned ?? false,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)

  // Build filter facets
  const categories = Array.from(new Set(rows.map(r => r.category))).sort()
  const neighborhoods = Array.from(new Set(rows.map(r => r.neighborhood).filter(Boolean) as string[])).sort()

  return (
    <main className="bg-[#fffaf5] min-h-screen">
      <div className="bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/birthday-party-guide" className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft size={11} /> The Big Birthday Bash
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <Search size={20} className="text-[#ff7a59]" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Party Finder</h1>
          </div>
          <p className="text-[13px] text-slate-600 mt-1">
            Filter {rows.length} vetted River Region birthday vendors by age, type, location, and more. Booking-ready in minutes.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <PartyFinderClient
          rows={rows}
          categories={categories}
          neighborhoods={neighborhoods}
        />
      </div>
    </main>
  )
}
