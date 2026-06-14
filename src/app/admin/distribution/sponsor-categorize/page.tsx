// /admin/distribution/sponsor-categorize — bulk-categorize sponsors with
// AI assist. Surfaces every sponsor with a null sponsor_category_slug,
// asks Claude to suggest categories for the whole batch, and lets the
// editor approve / edit / skip per row.
//
// Why this exists: the Content Deployment sponsor alignment matcher
// only works when sponsors are categorized. With 49 uncategorized
// sponsors and growing, doing this one-by-one in the advertiser CRM
// would never happen. Batch + AI assist = the editor categorizes
// everyone in one focused session.

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { SponsorCategorizeClient, type SponsorRow } from './SponsorCategorizeClient'

export const metadata = { title: 'Sponsor Categorize — Content Deployment' }
export const dynamic  = 'force-dynamic'

export default async function SponsorCategorizePage() {
  await requireAdmin()
  const sb = createAdminClient()

  const { data: rows, error } = await sb
    .from('advertiser_accounts')
    .select('id, business_name, business_url, ops_notes, package_tier, lifecycle_stage, sponsor_category_slug')
    .is('sponsor_category_slug', null)
    .in('lifecycle_stage', ['active', 'renewal', 'sponsor-qualified', 'upgrade-ready', 'onboarding'])
    .order('business_name')
    .limit(200)

  const sponsors: SponsorRow[] = ((rows ?? []) as Array<{
    id: string; business_name: string; business_url: string | null;
    ops_notes: string | null; package_tier: string | null;
    lifecycle_stage: string | null;
  }>).map(r => ({
    id:             r.id,
    business_name:  r.business_name,
    business_url:   r.business_url,
    ops_notes:      r.ops_notes,
    package_tier:   r.package_tier,
    lifecycle_stage: r.lifecycle_stage,
  }))

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <Link href="/admin/distribution" className="text-xs" style={{ color: 'var(--color-portal-blue)' }}>
            <ArrowLeft size={11} style={{ display: 'inline', verticalAlign: -2 }} /> Content Deployment
          </Link>
          <h1 className="ph-title">Categorize sponsors</h1>
          <div className="text-muted text-sm">
            {sponsors.length} active sponsors with no category. Click <Sparkles size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Suggest with AI to draft a category for every row, then approve or edit per sponsor.
          </div>
        </div>
        <div className="ph-actions">
          <Link href="/admin/advertisers" className="btn btn-ghost btn-sm">Open advertiser CRM →</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        {error && (
          <div className="alert alert-error">Could not load sponsors: {error.message}</div>
        )}
        {!error && sponsors.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Sparkles size={28} color="var(--color-portal-green)" style={{ marginBottom: 8 }} />
            <p className="fw-700">Every active sponsor has a category. Nothing to do here.</p>
            <p className="text-muted text-xs" style={{ marginTop: 4 }}>
              When a new sponsor is added without a category, they&apos;ll show up on this page.
            </p>
          </div>
        )}
        {sponsors.length > 0 && <SponsorCategorizeClient sponsors={sponsors} />}
      </div>
    </div>
  )
}
