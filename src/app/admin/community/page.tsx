// ── /admin/community ──────────────────────────────────────────────────────────
// Community Submissions Queue — all recurring community content.
// Covers: nominations, student spotlights, school news, events, business picks,
// birthday celebrations, and feature applications.
// Separate from /admin/submissions (reader_submissions legacy system).

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  STATUS_CONFIG, SUBMISSION_TYPES, TYPE_COLORS,
  type SubmissionStatus,
} from '@/lib/submissions'

export const metadata: Metadata = { title: 'Community Submissions — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface CountRow {
  id:              string
  status:          string
  submission_type: string
  created_at:      string
}

interface Submission {
  id:                    string
  submission_type:       string
  submitter_name:        string
  submitter_email:       string
  submitter_phone:       string | null
  related_person_name:   string | null
  related_business_name: string | null
  related_school_name:   string | null
  related_sport:         string | null
  status:                SubmissionStatus
  internal_priority:     string
  editor_notes:          string | null
  assigned_to:           string | null
  editorial_deadline:    string | null
  created_at:            string
  updated_at:            string
}

// ── Server actions ─────────────────────────────────────────────────────────────

async function setStatus(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id       = formData.get('id')     as string
  const status   = formData.get('status') as string
  await supabase.from('community_submissions').update({ status }).eq('id', id)
  revalidatePath('/admin/community')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_STATUS: Record<string, SubmissionStatus> = {
  'Mark needs-review':              'needs-review',
  'Request more info':              'awaiting-info',
  'Reject':                         'rejected',
  'Begin editing':                  'in-editing',
  'Approve':                        'approved',
  'Mark in-progress when info arrives': 'in-progress',
  'Archive if no reply':            'archived',
  'Move to in-editing':             'in-editing',
  'Queue for AI draft':             'ready-for-ai',
  'Archive':                        'archived',
  'Publish now':                    'published',
  'Schedule':                       'scheduled',
  'Reschedule':                     'scheduled',
  'Review and refine draft':        'in-editing',
}

function subjectLine(s: Submission): string {
  return s.related_person_name
    ?? s.related_business_name
    ?? s.related_school_name
    ?? ''
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0)  return 'Today'
  if (days === 1)  return 'Yesterday'
  if (days < 7)   return `${days}d ago`
  if (days < 30)  return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const { status: filterStatus, type: filterType } = await searchParams

  const supabase = createAdminClient()

  // Counts-only query for metrics + filter chips
  const { data: allRows } = await supabase
    .from('community_submissions')
    .select('id, status, submission_type, created_at')
    .order('created_at', { ascending: false })

  // Filtered list for display
  let query = supabase
    .from('community_submissions')
    .select('id, submission_type, submitter_name, submitter_email, submitter_phone, related_person_name, related_business_name, related_school_name, related_sport, status, internal_priority, editor_notes, assigned_to, editorial_deadline, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filterStatus) query = query.eq('status', filterStatus)
  if (filterType)   query = query.eq('submission_type', filterType)

  const { data: submissions } = await query

  const rows = (allRows ?? []) as CountRow[]
  const subs = (submissions ?? []) as Submission[]

  // ── Metrics ──────────────────────────────────────────────────────────────

  const total       = rows.length
  const newCount    = rows.filter(r => r.status === 'new').length
  const inReview    = rows.filter(r => r.status === 'needs-review').length
  const inProgress  = rows.filter(r => r.status === 'in-progress').length
  const inEditing   = rows.filter(r => r.status === 'in-editing').length
  const published   = rows.filter(r => r.status === 'published').length
  const backlog     = newCount + inReview

  // ── Type counts ───────────────────────────────────────────────────────────

  const typeCounts = SUBMISSION_TYPES
    .filter(t => !t.externalUrl)
    .map(t => ({ ...t, count: rows.filter(r => r.submission_type === t.type).length }))
    .filter(t => t.count > 0)

  // ── Status filter options ─────────────────────────────────────────────────

  const statusChips: SubmissionStatus[] = [
    'new', 'needs-review', 'awaiting-info', 'in-progress',
    'in-editing', 'approved', 'scheduled', 'published', 'rejected',
  ]

  // ── Guidance messages ─────────────────────────────────────────────────────

  const guidance: { icon: string; msg: string; critical: boolean }[] = []
  if (newCount > 5)
    guidance.push({ icon: '🔔', msg: `${newCount} new submissions haven't been reviewed yet.`, critical: true })
  if (backlog > 10)
    guidance.push({ icon: '⚠️', msg: `Backlog of ${backlog} submissions. Consider a review session.`, critical: true })
  if (inReview > 0)
    guidance.push({ icon: '📋', msg: `${inReview} submission${inReview === 1 ? '' : 's'} queued for editorial review.`, critical: false })
  if (inEditing > 0)
    guidance.push({ icon: '✏️', msg: `${inEditing} submission${inEditing === 1 ? '' : 's'} currently in editing.`, critical: false })

  // ── Helpers for filter links ──────────────────────────────────────────────

  function statusHref(s?: string) {
    const p = new URLSearchParams()
    if (s) p.set('status', s)
    if (filterType) p.set('type', filterType)
    return `/admin/community${p.toString() ? `?${p}` : ''}`
  }

  function typeHref(t?: string) {
    const p = new URLSearchParams()
    if (filterStatus) p.set('status', filterStatus)
    if (t) p.set('type', t)
    return `/admin/community${p.toString() ? `?${p}` : ''}`
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Community Submissions</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Nominations, celebrations, school news, events, and feature applications from the community.
          </p>
        </div>
        <Link
          href="/submit"
          target="_blank"
          className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg transition-colors shrink-0 font-medium"
        >
          Public Gateway ↗
        </Link>
      </div>

      {/* ── OPERATOR GUIDANCE ───────────────────────────────────────────── */}
      {guidance.length > 0 && (
        <div className="space-y-2">
          {guidance.map((g, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                g.critical
                  ? 'bg-portal-red-lt border border-portal-red/30 text-portal-red'
                  : 'bg-portal-blue-lt border border-portal-blue/20 text-portal-blue'
              }`}
            >
              <span>{g.icon}</span>
              <span>{g.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── METRICS STRIP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total',       val: total,      color: '#374151' },
          { label: 'New',         val: newCount,   color: '#16a34a' },
          { label: 'Needs Review',val: inReview,   color: '#2563eb' },
          { label: 'In Progress', val: inProgress, color: '#7c3aed' },
          { label: 'In Editing',  val: inEditing,  color: '#c4622d' },
          { label: 'Published',   val: published,  color: '#64748b' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.val}</div>
            <div className="text-[11px] text-portal-muted mt-0.5 leading-tight">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ─────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">

        {/* Status chips */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[11px] font-semibold text-portal-muted uppercase tracking-wide mr-1">Status:</span>
          <Link
            href={statusHref()}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              !filterStatus ? 'bg-portal-navy text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'
            }`}
          >
            All
          </Link>
          {statusChips.map(s => {
            const sc    = STATUS_CONFIG[s]
            const count = rows.filter(r => r.status === s).length
            if (count === 0) return null
            const active = filterStatus === s
            return (
              <Link
                key={s}
                href={statusHref(s)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                style={active
                  ? { backgroundColor: sc.color, color: '#fff' }
                  : { backgroundColor: '#f1f5f9', color: '#475569' }
                }
              >
                {sc.label} ({count})
              </Link>
            )
          })}
        </div>

        {/* Type chips */}
        {typeCounts.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[11px] font-semibold text-portal-muted uppercase tracking-wide mr-1">Type:</span>
            <Link
              href={typeHref()}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                !filterType ? 'bg-portal-navy text-white' : 'bg-portal-row-hover text-portal-sub hover:bg-portal-border-2'
              }`}
            >
              All
            </Link>
            {typeCounts.map(t => {
              const active = filterType === t.type
              return (
                <Link
                  key={t.type}
                  href={typeHref(t.type)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                  style={active
                    ? { backgroundColor: TYPE_COLORS[t.type] ?? '#374151', color: '#fff' }
                    : { backgroundColor: '#f1f5f9', color: '#475569' }
                  }
                >
                  {t.emoji} {t.shortLabel} ({t.count})
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SUBMISSION LIST ──────────────────────────────────────────────── */}
      {subs.length === 0 ? (
        <div className="bg-white border border-portal-border rounded-lg px-8 py-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-portal-sub font-medium">
            {total === 0 ? 'No community submissions yet.' : 'No submissions match the current filters.'}
          </p>
          {total > 0 && (
            <Link href="/admin/community" className="text-sm text-portal-blue mt-2 inline-block hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => {
            const tc      = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
            const sc      = STATUS_CONFIG[sub.status]
            const subject = subjectLine(sub)
            const accent  = TYPE_COLORS[sub.submission_type] ?? '#374151'
            const nextAct = sc?.nextActions ?? []

            return (
              <div
                key={sub.id}
                className="bg-white border border-portal-border rounded-lg overflow-hidden"
                style={{ borderLeft: `4px solid ${accent}` }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">

                    {/* Left: type badge + subject + submitter */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xl">{tc?.emoji ?? '📝'}</span>
                        <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wide">
                          {tc?.shortLabel ?? sub.submission_type}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: sc?.bg ?? '#f9fafb', color: sc?.color ?? '#374151' }}
                        >
                          {sc?.label ?? sub.status}
                        </span>
                        {sub.internal_priority !== 'normal' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            sub.internal_priority === 'urgent'
                              ? 'bg-portal-red-lt text-portal-red'
                              : sub.internal_priority === 'high'
                              ? 'bg-portal-amber-lt text-portal-amber'
                              : 'bg-portal-row-hover text-portal-sub'
                          }`}>
                            ↑ {sub.internal_priority}
                          </span>
                        )}
                      </div>

                      {subject && (
                        <p className="text-[15px] font-semibold text-portal-text leading-snug">{subject}</p>
                      )}
                      {sub.related_sport && (
                        <p className="text-xs text-portal-muted mt-0.5">Sport: {sub.related_sport}</p>
                      )}

                      <p className="text-sm text-portal-sub mt-1.5">
                        From{' '}
                        <span className="font-semibold text-portal-text">{sub.submitter_name}</span>
                        {' · '}
                        <a href={`mailto:${sub.submitter_email}`} className="text-portal-blue hover:underline">
                          {sub.submitter_email}
                        </a>
                        {sub.submitter_phone && (
                          <span className="text-portal-muted ml-2">· {sub.submitter_phone}</span>
                        )}
                      </p>

                      {sub.editor_notes && (
                        <p className="text-xs text-portal-amber bg-portal-amber-lt rounded-lg px-3 py-1.5 mt-2 border border-portal-amber/20 line-clamp-2">
                          📝 {sub.editor_notes}
                        </p>
                      )}

                      {sub.assigned_to && (
                        <p className="text-xs text-portal-muted mt-1.5">
                          Assigned to: <span className="font-medium text-portal-sub">{sub.assigned_to}</span>
                        </p>
                      )}
                    </div>

                    {/* Right: timestamp + view link */}
                    <div className="shrink-0 text-right space-y-1.5">
                      <p className="text-xs text-portal-muted font-medium">{timeAgo(sub.created_at)}</p>
                      {sub.editorial_deadline && (
                        <p className="text-xs font-semibold text-portal-amber">
                          Due {shortDate(sub.editorial_deadline)}
                        </p>
                      )}
                      <Link
                        href={`/admin/community/${sub.id}`}
                        className="block text-xs text-portal-blue hover:underline font-semibold"
                      >
                        View →
                      </Link>
                    </div>
                  </div>

                  {/* Quick actions */}
                  {nextAct.length > 0 && (
                    <div className="flex gap-2 mt-3.5 pt-3 border-t border-gray-50 flex-wrap">
                      {nextAct.map(action => {
                        const targetStatus = ACTION_STATUS[action]
                        if (!targetStatus) return null
                        const isBad = action === 'Reject' || action === 'Archive if no reply'
                        return (
                          <form key={action} action={setStatus}>
                            <input type="hidden" name="id"     value={sub.id} />
                            <input type="hidden" name="status" value={targetStatus} />
                            <button
                              type="submit"
                              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                                isBad
                                  ? 'border-portal-red/30 text-portal-red hover:bg-portal-red-lt'
                                  : 'border-portal-border text-portal-text hover:bg-portal-bg'
                              }`}
                            >
                              {action}
                            </button>
                          </form>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {subs.length >= 100 && (
            <p className="text-center text-xs text-portal-muted py-2">
              Showing first 100 results. Use filters to narrow results.
            </p>
          )}
        </div>
      )}

    </main>
  )
}
