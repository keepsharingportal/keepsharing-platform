// /admin/birthday/sponsors — manage which advertisers are at each
// sponsorship tier and edit their birthday_profile (packages, hours,
// gallery, FAQ — drives the /business/[slug] vendor profile page).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Star } from 'lucide-react'
import { SponsorsClient } from './SponsorsClient'

export const metadata: Metadata = { title: 'Sponsored Vendors — Admin' }
export const dynamic = 'force-dynamic'

export default async function SponsorsAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb
    .from('advertiser_accounts')
    .select('id, slug, business_name, hero_photo_url, neighborhood, birthday_tier, birthday_profile')
    .order('business_name')
    .limit(500)
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Star size={16} /> Sponsored Vendors
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Set sponsorship tier per advertiser + edit their <code>birthday_profile</code> (packages, hours, gallery, FAQ — drives the public vendor profile page).
        </p>
      </div>
      <div className="p-6 max-w-7xl">
        <SponsorsClient initial={data ?? []} />
      </div>
    </div>
  )
}
