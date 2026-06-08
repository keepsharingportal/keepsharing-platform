// /admin/spotlights/review
// Bulk review screen for incoming student-spotlight submissions.
// Optimized for editors approving 50+ at a time — grid view with
// photo + school + headline + story preview at a glance, multi-select
// + bulk approve, individual approve/reject buttons per card.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Send, GraduationCap, Inbox } from 'lucide-react'
import { SpotlightReviewClient } from './SpotlightReviewClient'

export const metadata = { title: 'Spotlight Review — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function SpotlightReviewPage({ searchParams }: PageProps) {
  const { status: statusParam } = await searchParams
  const status = statusParam || 'new'

  const supabase = createAdminClient()

  const { data: submissions } = await supabase
    .from('community_submissions')
    .select('id, submitter_name, submitter_email, related_person_name, related_school_name, payload, web_image_url, print_image_url, status, created_at, promoted_article_id')
    .eq('submission_type', 'student-spotlight')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = submissions ?? []

  const { count: newCount }      = await supabase
    .from('community_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('submission_type', 'student-spotlight')
    .eq('status', 'new')

  const { count: approvedCount } = await supabase
    .from('community_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('submission_type', 'student-spotlight')
    .eq('status', 'approved')

  const { count: rejectedCount } = await supabase
    .from('community_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('submission_type', 'student-spotlight')
    .eq('status', 'rejected')

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-portal-text inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-portal-blue" />
              Student Spotlight Review
            </h1>
            <p className="text-xs text-portal-sub mt-0.5">Bulk-approve incoming spotlights. Selected rows publish immediately.</p>
          </div>
          <Link
            href="/submit/student-spotlight"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-border bg-white rounded-lg hover:bg-portal-bg text-portal-text"
          >
            <Send size={11} /> Public Submit Form
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {[
            { key: 'new',      label: 'New',      count: newCount      ?? 0 },
            { key: 'review',   label: 'In Review', count: undefined },
            { key: 'approved', label: 'Approved', count: approvedCount ?? 0 },
            { key: 'rejected', label: 'Rejected', count: rejectedCount ?? 0 },
          ].map(t => {
            const active = t.key === status
            const href = t.key === 'new' ? '/admin/spotlights/review' : `/admin/spotlights/review?status=${t.key}`
            return (
              <Link
                key={t.key}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'bg-portal-navy text-white' : 'text-portal-sub hover:bg-portal-row-hover'
                }`}
              >
                {t.label}{t.count != null ? ` (${t.count})` : ''}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-portal-border bg-white p-12 text-center max-w-2xl mx-auto">
            <Inbox className="h-8 w-8 text-portal-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-portal-text mb-1">Nothing in the {status} queue.</p>
            <p className="text-xs text-portal-sub mb-4">
              {status === 'new'
                ? 'Submissions from /submit/student-spotlight appear here for approval.'
                : 'Switch tabs above to see other queues.'}
            </p>
            <Link
              href="/submit/student-spotlight"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-portal-navy text-white rounded-full hover:opacity-90 transition-colors"
            >
              Open public submit form →
            </Link>
          </div>
        ) : (
          <SpotlightReviewClient rows={rows} status={status} />
        )}
      </div>
    </div>
  )
}
