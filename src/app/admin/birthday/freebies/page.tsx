import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Gift } from 'lucide-react'
import { FreebiesClient } from './FreebiesClient'

export const metadata: Metadata = { title: 'Birthday Freebies — Admin' }
export const dynamic = 'force-dynamic'

export default async function FreebiesAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_freebies').select('*').order('category').order('business')
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Gift size={16} /> Birthday Freebies
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Local businesses that give kids free stuff on their birthday. Renders on /birthday-party-guide#freebies
          + drives the freebies PDF email capture.
        </p>
      </div>
      <div className="p-6 max-w-5xl">
        <FreebiesClient initial={data ?? []} />
      </div>
    </div>
  )
}
