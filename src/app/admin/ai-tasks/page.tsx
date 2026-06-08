// ── /admin/ai-tasks ────────────────────────────────────────────────────────────
// AI Task Queue — what AI has prepared for human review.
// Nothing in this queue publishes, sends, or posts automatically.
// Every task requires explicit operator approval before output is used.

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'AI Task Queue — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface AITask {
  id:                    string
  task_type:             string
  source_table:          string | null
  source_id:             string | null
  status:                string
  priority:              string
  requested_by:          string | null
  assigned_to:           string | null
  input_snapshot:        Record<string, unknown> | null
  output_preview:        string | null
  output_payload:        Record<string, unknown> | null
  error_message:         string | null
  human_review_required: boolean
  approved_by:           string | null
  approved_at:           string | null
  rejected_at:           string | null
  rejection_note:        string | null
  created_at:            string
  started_at:            string | null
  completed_at:          string | null
}

// ── Static data ───────────────────────────────────────────────────────────────

const TASK_TYPE_INFO: Record<string, { label: string; emoji: string; desc: string }> = {
  'social_caption':     { label: 'Social Caption',      emoji: '📱', desc: 'Social media caption for content' },
  'newsletter_teaser':  { label: 'Newsletter Teaser',   emoji: '📧', desc: 'Newsletter section teaser copy' },
  'missing_info_email': { label: 'Missing Info Email',  emoji: '📬', desc: 'Email requesting missing submission info' },
  'article_refresh':    { label: 'Article Refresh',     emoji: '📝', desc: 'Suggestion to refresh aging content' },
  'proposal_notes':     { label: 'Proposal Notes',      emoji: '📋', desc: 'Advertiser proposal prep notes' },
  'sponsor_pairing':    { label: 'Sponsor Pairing',     emoji: '🤝', desc: 'Sponsor/content alignment suggestion' },
  'headline_options':   { label: 'Headline Options',    emoji: '💡', desc: 'Alternative headline suggestions' },
  'seo_suggestions':    { label: 'SEO Suggestions',     emoji: '🔍', desc: 'SEO keywords and meta suggestions' },
  'event_summary':      { label: 'Event Summary',       emoji: '📅', desc: 'Cleaned event listing or summary' },
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  'queued':      { label: 'Queued',             bg: '#f1f5f9', color: '#64748b' },
  'running':     { label: 'Running',            bg: '#eff6ff', color: '#2563eb' },
  'completed':   { label: 'Ready to Review',    bg: '#fef3c7', color: '#d97706' },
  'needs_review':{ label: 'Needs Review',       bg: '#fef3c7', color: '#d97706' },
  'approved':    { label: 'Approved',           bg: '#f0fdf4', color: '#16a34a' },
  'rejected':    { label: 'Rejected',           bg: '#fef2f2', color: '#dc2626' },
  'failed':      { label: 'Failed',             bg: '#fef2f2', color: '#dc2626' },
  'canceled':    { label: 'Canceled',           bg: '#f9fafb', color: '#9ca3af' },
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-portal-red-lt text-portal-red font-bold',
  high:   'bg-portal-amber-lt text-portal-amber font-semibold',
  normal: '',   // hidden for normal priority
  low:    'bg-portal-row-hover text-portal-sub',
}

type FilterKey = 'review' | 'queued' | 'approved' | 'rejected' | 'failed' | 'all'

const FILTER_STATUS: Record<FilterKey, string[]> = {
  review:   ['completed', 'needs_review'],
  queued:   ['queued', 'running'],
  approved: ['approved'],
  rejected: ['rejected'],
  failed:   ['failed'],
  all:      [],  // empty = no filter
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function taskTypeInfo(type: string) {
  return TASK_TYPE_INFO[type] ?? { label: type, emoji: '🤖', desc: 'AI-generated content' }
}

function statusStyle(status: string) {
  return STATUS_STYLE[status] ?? { label: status, bg: '#f9fafb', color: '#374151' }
}

function sourceLink(task: AITask): { label: string; href: string } | null {
  if (!task.source_table || !task.source_id) return null
  switch (task.source_table) {
    case 'community_submissions':
      return { label: 'View Submission',  href: `/admin/community/${task.source_id}`  }
    case 'advertiser_accounts':
      return { label: 'View Advertiser',  href: `/admin/advertisers`                  }
    case 'guide_articles':
      return { label: 'View Article',     href: `/admin/guides`                        }
    default:
      return { label: `${task.source_table} record`, href: '#' }
  }
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)  return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// ── Server actions ─────────────────────────────────────────────────────────────

async function approveTask(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('task_id') as string
  const filter   = (formData.get('filter') as string) || 'review'
  await supabase.from('ai_tasks').update({
    status:      'approved',
    approved_by: 'Operator',
    approved_at: new Date().toISOString(),
  }).eq('id', id)
  revalidatePath('/admin/ai-tasks')
}

async function rejectTask(formData: FormData) {
  'use server'
  const supabase     = await createClient()
  const id           = formData.get('task_id')       as string
  const note         = (formData.get('reject_note')  as string) || null
  await supabase.from('ai_tasks').update({
    status:         'rejected',
    rejected_at:    new Date().toISOString(),
    rejection_note: note,
  }).eq('id', id)
  revalidatePath('/admin/ai-tasks')
}

async function cancelTask(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('task_id') as string
  await supabase.from('ai_tasks').update({ status: 'canceled' }).eq('id', id)
  revalidatePath('/admin/ai-tasks')
}

async function retryTask(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('task_id') as string
  await supabase.from('ai_tasks').update({
    status:        'queued',
    error_message: null,
    started_at:    null,
    completed_at:  null,
  }).eq('id', id)
  revalidatePath('/admin/ai-tasks')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AITasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter = 'review' } = await searchParams
  const activeFilter = (rawFilter in FILTER_STATUS ? rawFilter : 'review') as FilterKey

  const supabase = await createClient()

  let query = supabase
    .from('ai_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const filterStatuses = FILTER_STATUS[activeFilter]
  if (filterStatuses.length > 0) {
    query = query.in('status', filterStatuses)
  }

  const { data } = await query
  const tasks = (data ?? []) as unknown as AITask[]

  // ── Metrics (from all tasks, not just filtered) ────────────────────────────
  const { data: allRows } = await supabase
    .from('ai_tasks')
    .select('id, status')

  const all = allRows ?? []
  const metrics = {
    total:    all.length,
    review:   all.filter(r => ['completed','needs_review'].includes(r.status)).length,
    queued:   all.filter(r => ['queued','running'].includes(r.status)).length,
    approved: all.filter(r => r.status === 'approved').length,
    failed:   all.filter(r => r.status === 'failed').length,
  }

  // ── Filter tab config ──────────────────────────────────────────────────────
  const FILTER_TABS: { key: FilterKey; label: string; count: number | null }[] = [
    { key: 'review',   label: 'Needs Review', count: metrics.review   },
    { key: 'queued',   label: 'Queued',       count: metrics.queued   },
    { key: 'approved', label: 'Approved',     count: metrics.approved },
    { key: 'rejected', label: 'Rejected',     count: null             },
    { key: 'failed',   label: 'Failed',       count: metrics.failed   },
    { key: 'all',      label: 'All',          count: metrics.total    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[1000px] mx-auto space-y-6 pb-16">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-portal-text tracking-tight">AI Task Queue</h1>
        <p className="text-sm text-portal-sub mt-0.5">
          What AI has prepared for your review. Nothing here is published, sent, or posted automatically.
        </p>
      </div>

      {/* ── SAFETY BANNER ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-portal-amber-lt border border-portal-amber/30 rounded-lg">
        <span className="text-lg shrink-0">⚠️</span>
        <p className="text-sm text-portal-amber font-medium">
          Human review required before any AI output is used.
          Approving a task does not publish, send, or post anything — it marks it as reviewed and ready for the next step.
        </p>
      </div>

      {/* ── METRICS STRIP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',        val: metrics.total,    color: '#374151' },
          { label: 'Needs Review', val: metrics.review,   color: '#d97706' },
          { label: 'Queued',       val: metrics.queued,   color: '#2563eb' },
          { label: 'Approved',     val: metrics.approved, color: '#16a34a' },
          { label: 'Failed',       val: metrics.failed,   color: '#dc2626' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.val}</div>
            <div className="text-[11px] text-portal-muted mt-0.5 leading-tight">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <Link
            key={tab.key}
            href={`/admin/ai-tasks?filter=${tab.key}`}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-portal-navy text-white'
                : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-1.5 ${activeFilter === tab.key ? 'text-white/60' : 'text-portal-muted'}`}>
                ({tab.count})
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── TASK LIST ───────────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <div className="bg-white border border-portal-border rounded-lg px-8 py-20 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-lg font-bold text-portal-text mb-2">
            {activeFilter === 'review' ? 'Nothing needs review right now' : 'No tasks here'}
          </h2>
          <p className="text-sm text-portal-sub max-w-sm mx-auto leading-relaxed">
            {activeFilter === 'all'
              ? 'The AI task queue is empty. Tasks will appear here as background AI workflows are enabled.'
              : activeFilter === 'review'
              ? 'No AI tasks are waiting for review. Check back after background generation runs.'
              : `No tasks with "${FILTER_TABS.find(t => t.key === activeFilter)?.label}" status.`
            }
          </p>
          <p className="text-[11px] text-portal-muted mt-3">
            Human review required before any AI output is used.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const info    = taskTypeInfo(task.task_type)
            const ss      = statusStyle(task.status)
            const srcLink = sourceLink(task)
            const canApprove  = ['completed', 'needs_review'].includes(task.status)
            const canReject   = ['completed', 'needs_review', 'approved'].includes(task.status)
            const canCancel   = ['queued', 'running'].includes(task.status)
            const canRetry    = task.status === 'failed'

            return (
              <div key={task.id} className="bg-white border border-portal-border rounded-lg overflow-hidden">
                <div className="px-5 py-4">

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-lg">{info.emoji}</span>
                        <span className="text-xs font-bold text-portal-text">{info.label}</span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: ss.bg, color: ss.color }}
                        >
                          {ss.label}
                        </span>
                        {task.priority !== 'normal' && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${PRIORITY_STYLE[task.priority] ?? ''}`}>
                            ↑ {task.priority}
                          </span>
                        )}
                        <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-2 py-0.5 rounded-full font-semibold border border-portal-amber/30">
                          Review required
                        </span>
                      </div>

                      <p className="text-[11px] text-portal-muted">{info.desc}</p>

                      {/* Source link */}
                      {srcLink && (
                        <p className="text-[11px] text-portal-muted mt-0.5">
                          Source: <span className="text-portal-sub">{task.source_table}</span>
                          {' · '}
                          <Link href={srcLink.href} className="text-portal-blue hover:underline">
                            {srcLink.label} ↗
                          </Link>
                        </p>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="shrink-0 text-right text-[11px] text-portal-muted space-y-0.5">
                      <p>Created: {timeAgo(task.created_at)}</p>
                      {task.completed_at && <p>Completed: {timeAgo(task.completed_at)}</p>}
                      {task.approved_at && (
                        <p className="text-portal-green font-medium">Approved: {fmtDatetime(task.approved_at)}</p>
                      )}
                      {task.rejected_at && (
                        <p className="text-portal-red font-medium">Rejected: {fmtDatetime(task.rejected_at)}</p>
                      )}
                    </div>
                  </div>

                  {/* Output preview */}
                  {task.output_preview && (
                    <div className="mt-3 px-4 py-3 bg-portal-bg rounded-lg border border-portal-border">
                      <p className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide mb-1.5">
                        AI Output Preview
                      </p>
                      <p className="text-sm text-portal-text leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {task.output_preview}
                      </p>
                      {task.output_payload && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-portal-muted cursor-pointer hover:text-portal-sub select-none">
                            Show full output →
                          </summary>
                          <pre className="text-[10px] text-portal-sub bg-white border border-portal-border rounded-lg p-3 mt-2 overflow-auto max-h-48 leading-relaxed">
                            {JSON.stringify(task.output_payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  {task.error_message && (
                    <div className="mt-3 px-4 py-3 bg-portal-red-lt rounded-lg border border-portal-red/20">
                      <p className="text-[10px] font-semibold text-portal-red uppercase tracking-wide mb-1">Error</p>
                      <p className="text-xs text-portal-red leading-relaxed">{task.error_message}</p>
                    </div>
                  )}

                  {/* Rejection note */}
                  {task.rejection_note && (
                    <div className="mt-3 px-4 py-2 bg-portal-bg rounded-lg">
                      <p className="text-[11px] text-portal-sub">
                        <span className="font-semibold">Rejection note:</span> {task.rejection_note}
                      </p>
                    </div>
                  )}

                  {/* Approval attribution */}
                  {task.approved_by && task.status === 'approved' && (
                    <div className="mt-3 px-4 py-2 bg-portal-green-lt rounded-lg border border-portal-green/20">
                      <p className="text-xs text-portal-green font-medium">
                        ✓ Approved by {task.approved_by} · {fmtDatetime(task.approved_at)}
                      </p>
                      <p className="text-[11px] text-portal-green mt-0.5">
                        Output marked as reviewed. Apply to source record when publishing workflow is ready.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(canApprove || canReject || canCancel || canRetry) && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 flex-wrap items-center">

                      {canApprove && (
                        <form action={approveTask}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <button type="submit"
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-portal-green hover:bg-portal-green transition-colors">
                            ✓ Approve
                          </button>
                        </form>
                      )}

                      {canReject && (
                        <form action={rejectTask} className="flex gap-1.5 items-center">
                          <input type="hidden" name="task_id" value={task.id} />
                          <input
                            name="reject_note"
                            type="text"
                            placeholder="Reason (optional)"
                            className="text-xs border border-portal-border rounded-lg px-2.5 py-1.5 outline-none focus:border-portal-blue w-40 transition-colors"
                          />
                          <button type="submit"
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-portal-red hover:bg-portal-red transition-colors">
                            ✗ Reject
                          </button>
                        </form>
                      )}

                      {canRetry && (
                        <form action={retryTask}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <button type="submit"
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-portal-blue border border-indigo-200 bg-portal-blue-lt hover:bg-portal-blue-lt transition-colors">
                            ↺ Retry
                          </button>
                        </form>
                      )}

                      {canCancel && (
                        <form action={cancelTask}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <button type="submit"
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-portal-sub border border-portal-border hover:bg-portal-bg transition-colors">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FUTURE ARCHITECTURE NOTES ────────────────────────────────────── */}
      <details className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <summary className="px-5 py-4 text-xs font-semibold text-portal-muted cursor-pointer hover:bg-portal-bg select-none uppercase tracking-wide">
          Future: How background AI processing will work
        </summary>
        <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-3 text-xs text-portal-sub leading-relaxed">
          <p>
            <span className="font-semibold text-portal-text">Phase 1 (now):</span> Operators trigger AI generation manually on the Approval Desk.
            Output is written directly to the source record fields. No queue records created.
          </p>
          <p>
            <span className="font-semibold text-portal-text">Phase 2 (next):</span> Approval Desk buttons will INSERT ai_task rows
            instead of calling AI directly. A background worker (Supabase Edge Function or external service)
            will poll for queued tasks and process them. Completed tasks appear here for review.
          </p>
          <p>
            <span className="font-semibold text-portal-text">Phase 3 (overnight AI):</span> A nightly scheduled job
            (pg_cron + Edge Function, or external cron) will queue AI tasks for all approved-but-not-yet-distributed content —
            drafting captions, refreshing stale articles, suggesting newsletter lineups, flagging missing info.
            Operators review the batch each morning.
          </p>
          <p>
            <span className="font-semibold text-portal-text">Safety invariant (permanent):</span> human_review_required = TRUE always.
            Approval here never triggers publishing, sending, or posting.
            A separate human action applies approved output to the destination.
          </p>
        </div>
      </details>

    </main>
  )
}
