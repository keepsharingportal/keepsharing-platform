// /admin/pending — the monthly pool view.
//
// Once a submission gets `approved` and "Sent to monthly pool" in the
// detail page, it lands here. Editor picks one per category per month,
// assigns it to a specific month, and (when ready) clicks Publish-now
// or lets the scheduler auto-publish on the first of that month.
//
// Tabs across the top = one per submission type (Mom-to-Mom, Play Ball,
// Teacher of the Month, etc.). Each tab shows that type's pool sorted
// by date. Each card has a month picker + Schedule button. Scheduled
// rows surface near the top with a green chip + Publish-now button.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PendingPoolClient } from './PendingPoolClient'

export const metadata = { title: 'Pending Pool — Admin' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ type?: string }> }

export default async function PendingPoolPage({ searchParams }: PageProps) {
  await requireAdmin()
  const sp = await searchParams
  const sb = createAdminClient()

  // Load all type configs so the tab strip + per-type metadata work.
  const { data: configsRaw } = await sb
    .from('submission_type_columns')
    .select('submission_type, label, column_slug, article_format')
    .order('submission_type')
  type TypeCfg = { submission_type: string; label: string | null; column_slug: string; article_format: string }
  const configs = (configsRaw ?? []) as TypeCfg[]

  // Pool query — only items in the in-pool or scheduled phases.
  const { data: rows } = await sb
    .from('community_submissions')
    .select(`
      id, submission_type, target_publication,
      working_title, excerpt, feature_image_url,
      related_person_name, related_business_name, related_school_name,
      phase, scheduled_for_month, issue_month, issue_year,
      interview_image_urls, ai_draft_content,
      promoted_to_article_id,
      created_at, updated_at
    `)
    .in('phase', ['in-pool', 'scheduled'])
    .order('updated_at', { ascending: false })
    .limit(200)
  type PoolRow = {
    id: string; submission_type: string; target_publication: string;
    working_title: string | null; excerpt: string | null; feature_image_url: string | null;
    related_person_name: string | null; related_business_name: string | null; related_school_name: string | null;
    phase: string; scheduled_for_month: string | null; issue_month: string | null; issue_year: number | null;
    interview_image_urls: Array<{ url: string }> | null;
    ai_draft_content: string | null;
    promoted_to_article_id: string | null;
    created_at: string; updated_at: string;
  }
  const pool = (rows ?? []) as unknown as PoolRow[]

  // Group by type
  const byType = new Map<string, PoolRow[]>()
  for (const r of pool) {
    if (!byType.has(r.submission_type)) byType.set(r.submission_type, [])
    byType.get(r.submission_type)!.push(r)
  }

  // Per-tab counts for the tab strip
  const tabs = configs
    .map(c => ({
      type:   c.submission_type,
      label:  c.label ?? c.submission_type,
      count:  byType.get(c.submission_type)?.length ?? 0,
    }))
    .filter(t => t.count > 0)  // hide tabs with no pool

  const activeType = sp.type && tabs.some(t => t.type === sp.type) ? sp.type : (tabs[0]?.type ?? '')
  const activeRows = byType.get(activeType) ?? []

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Pending Pool</h1>
          <div className="text-muted text-sm">
            Approved submissions waiting to be scheduled for a specific month. Pick one per category per issue.
          </div>
        </div>
        <div className="ph-actions">
          <Link href="/admin/community" className="btn btn-ghost btn-sm">← Community Submissions</Link>
          <Link href="/admin/distribution" className="btn btn-blue btn-sm">Content Deployment →</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {tabs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <p className="fw-700">No approved submissions in the pool yet.</p>
            <p className="text-muted text-xs" style={{ marginTop: 8 }}>
              Submissions land here after an editor sets the phase to{' '}
              <strong>In monthly pool</strong> on the submission detail page.
            </p>
            <Link
              href="/admin/community"
              className="btn btn-primary btn-sm"
              style={{ marginTop: 16 }}
            >Open submissions queue →</Link>
          </div>
        ) : (
          <>
            {/* Tab strip — one per category with a non-zero pool */}
            <div className="card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--color-portal-border)' }}>
                {tabs.map(t => {
                  const isActive = activeType === t.type
                  return (
                    <Link
                      key={t.type}
                      href={`/admin/pending?type=${t.type}`}
                      style={{
                        padding: '10px 18px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: isActive ? 'var(--color-portal-navy)' : 'var(--color-portal-sub)',
                        borderBottom: isActive ? '2px solid var(--color-portal-navy)' : '2px solid transparent',
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {t.label}
                      <span className={`badge ${isActive ? 'badge-rrp' : 'badge-gray'}`} style={{ fontSize: 9 }}>
                        {t.count}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>

            <PendingPoolClient rows={activeRows} />
          </>
        )}
      </div>
    </div>
  )
}
