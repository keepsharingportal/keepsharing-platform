// ── /admin/campaigns/new — Create new themed campaign ────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { NewCampaignClient } from './NewCampaignClient'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'New campaign — Admin' }
export const dynamic = 'force-dynamic'

export default async function NewCampaignPage() {
  const ctx = await requireAdmin()
  const allowed = getSeoAllowedBrands(ctx)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/campaigns" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Campaigns
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">New themed campaign</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Set theme + month + brand. After save, Claude generates the editorial brief + article assignments
          + sponsor categories.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <NewCampaignClient brands={allowed.map(b => ({ slug: b.slug, name: b.displayName }))} />
        </div>
      </div>
    </div>
  )
}
