import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Quote } from 'lucide-react'
import { MomTipsClient } from './MomTipsClient'

export const metadata: Metadata = { title: 'Mom Tips — Admin' }
export const dynamic = 'force-dynamic'

export default async function MomTipsPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_mom_tips').select('*').order('display_order').order('created_at', { ascending: false })
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Quote size={16} /> Mom-to-Mom Tips
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">Short quoted advice from local moms on /birthday-party-guide#tips.</p>
      </div>
      <div className="p-6 max-w-5xl">
        <MomTipsClient initial={data ?? []} />
      </div>
    </div>
  )
}
