import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, DollarSign } from 'lucide-react'
import { BudgetTiersClient } from './BudgetTiersClient'

export const metadata: Metadata = { title: 'Budget Tiers — Admin' }
export const dynamic = 'force-dynamic'

export default async function BudgetTiersAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_budget_tiers').select('*').order('display_order')
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <DollarSign size={16} /> Plan-by-Budget Tiers
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          The differentiator block on /birthday-party-guide#budget. 3 tiers per brand with real local vendor picks per role.
          Empty = defaults render (Backyard/Sweet Spot/Showstopper).
        </p>
      </div>
      <div className="p-6 max-w-6xl">
        <BudgetTiersClient initial={data ?? []} />
      </div>
    </div>
  )
}
