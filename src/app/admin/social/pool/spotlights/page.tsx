import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Users } from 'lucide-react'
import { SpotlightsClient } from './SpotlightsClient'

export const metadata: Metadata = { title: 'Community spotlights — Admin' }
export const dynamic = 'force-dynamic'

export default async function SpotlightsPage() {
  await requireSettingsAccess()
  const sb = createAdminClient()
  const { data: rows } = await sb.from('community_spotlights').select('*').order('created_at', { ascending: false }).limit(200)
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/social/pool" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Content pool
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Users size={16} className="inline -translate-y-0.5 mr-1" /> Community spotlights
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Local people, businesses, students, schools worth featuring. The strategist rotates these into
          evening/tender slots.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 max-w-5xl">
          <SpotlightsClient initial={rows ?? []} />
        </div>
      </div>
    </div>
  )
}
