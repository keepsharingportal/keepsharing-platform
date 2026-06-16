// ── /admin/campaigns/[id] — Campaign dashboard ────────────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadCampaign, loadCampaignArticles } from '@/lib/campaigns'
import { MARKETS } from '@/lib/markets'
import { CampaignDashboardClient } from './CampaignDashboardClient'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Campaign — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function CampaignDashboard({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()

  const campaign = await loadCampaign(sb, id)
  if (!campaign) notFound()

  const linkedArticles = await loadCampaignArticles(sb, id)
  const market = MARKETS.find(m => m.slug === campaign.brandSlug)
  const publicOrigin = market ? `https://${market.publicHost}` : ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/campaigns" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Campaigns
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <code className="text-[11px] text-portal-sub">{campaign.brandSlug}</code>
              <span className="text-[11px] text-portal-sub">
                {new Date(campaign.month + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </span>
            </div>
            <h1 className="text-[20px] font-bold text-portal-text">{campaign.themeTitle}</h1>
            {campaign.heroTagline && <p className="text-[13px] text-portal-sub mt-1">{campaign.heroTagline}</p>}
          </div>
          {campaign.publicLandingActive && publicOrigin && (
            <a
              href={`${publicOrigin}/campaigns/${campaign.slug}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg"
            >
              <ExternalLink size={12} /> View landing
            </a>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <CampaignDashboardClient
            initial={campaign}
            initialArticles={linkedArticles}
            publicOrigin={publicOrigin}
          />
        </div>
      </div>
    </div>
  )
}
