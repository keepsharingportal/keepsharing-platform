// /admin/social/plan/urgent
//
// Drop an urgent post into the schedule mid-week. Editor picks content
// + a time strategy (specific / window / AI-pick), system slots it
// into the next available gap and pushes to GHL immediately.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { UrgentInsertClient } from './UrgentInsertClient'

export const metadata: Metadata = { title: 'Urgent post — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function UrgentInsertPage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const brand = sp.brand && MARKETS.find(m => m.slug === sp.brand) ? sp.brand : 'rrp'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href={`/admin/social/plan?brand=${brand}`} className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Back to plan
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <AlertTriangle size={16} className="inline -translate-y-0.5 mr-1 text-portal-amber" /> Add urgent post
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Inject a post outside the weekly plan. Advertiser asks, last-minute event, breaking news. Pushes
          straight to GHL with a scheduled time you pick.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <UrgentInsertClient brand={brand} />
        </div>
      </div>
    </div>
  )
}
