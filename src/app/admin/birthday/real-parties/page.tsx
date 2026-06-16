// /admin/birthday/real-parties — moderation queue for UGC submissions.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Camera } from 'lucide-react'
import { RealPartiesModerationClient } from './RealPartiesModerationClient'

export const metadata: Metadata = { title: 'Real Parties — Moderation' }
export const dynamic = 'force-dynamic'

export default async function RealPartiesModerationPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_real_parties')
    .select('*')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Camera size={16} /> Real River Region Parties — moderation
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Approve mom-submitted party photos before they appear on the public wall. Reject anything that doesn&apos;t fit
          the brand or is missing details (photo, caption).
        </p>
      </div>
      <div className="p-6 max-w-5xl">
        <RealPartiesModerationClient initial={data ?? []} />
      </div>
    </div>
  )
}
