import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Tag } from 'lucide-react'
import { DealsClient } from './DealsClient'

export const metadata: Metadata = { title: 'Birthday Deals — Admin' }
export const dynamic = 'force-dynamic'

export default async function DealsAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const [dealsRes, vendorsRes] = await Promise.all([
    sb.from('birthday_deals').select('*').order('is_featured', { ascending: false }).order('display_order'),
    sb.from('advertiser_accounts').select('id, slug, business_name').order('business_name').limit(500),
  ])
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Tag size={16} /> Birthday Deals
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Paid (or comped) deal slots for advertisers. Featured deals sit at the top of /deals + the sidebar.
          Set valid_until to auto-expire.
        </p>
      </div>
      <div className="p-6 max-w-6xl">
        <DealsClient initial={dealsRes.data ?? []} vendors={vendorsRes.data ?? []} />
      </div>
    </div>
  )
}
