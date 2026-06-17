// /admin/birthday/buzz — Birthday Buzz rotating commercial CRUD.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { BuzzClient } from './BuzzClient'

export const metadata: Metadata = { title: 'Birthday Buzz — Admin' }
export const dynamic = 'force-dynamic'

export default async function BuzzAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const [buzzRes, vendorsRes] = await Promise.all([
    sb.from('birthday_buzz').select('*').order('posted_at', { ascending: false }).limit(100),
    sb.from('advertiser_accounts').select('id, slug, business_name').order('business_name').limit(500),
  ])
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Megaphone size={16} /> Birthday Buzz
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          The rotating commercial that lands at the top of the Birthday Bash page. Vendor spotlights click through
          to /birthday-party-guide/business/[slug]; other kinds show as inline cards. Order is by posted_at desc;
          set expires_at to fall off automatically.
        </p>
      </div>
      <div className="p-6 max-w-5xl">
        <BuzzClient initial={buzzRes.data ?? []} vendors={vendorsRes.data ?? []} />
      </div>
    </div>
  )
}
