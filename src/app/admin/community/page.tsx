// ── /admin/community ──────────────────────────────────────────────────────────
// Community Submissions Queue — all recurring community content.
// Covers: nominations, student spotlights, school news, events, business picks,
// birthday celebrations, and feature applications.
// Separate from /admin/submissions (reader_submissions legacy system).

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  STATUS_CONFIG, SUBMISSION_TYPES, TYPE_COLORS,
  type SubmissionStatus,
} from '@/lib/submissions'

export const metadata: Metadata = { title: 'Community Submissions — Admin' }
// Without force-dynamic, Next.js caches the page on first build.
// New submissions don't show until next deploy.
export const dynamic = 'force-dynamic'

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

// ── Helpers ───────────────────────────────────────────────────────────────────
// Inline quick-action server actions used to live here. Removed —
// queue-level "Mark needs-review / Request more info / Reject" buttons
// created editorial decisions from row-level context, but the right
// context lives inside the submission. Editor clicks Open → makes the
// call from the detail page where they can read the full nomination,
// rejection reasons get captured, and the audit trail is unambiguous.

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
  const rejected    = rows.filter(r => r.status === 'rejected').length
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
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Community Submissions</h1>
          <div className="text-muted text-sm">
            Nominations, celebrations, school news, events, and feature applications. Triage here, deep-edit in the detail view, publish to homepage when ready.
          </div>
        </div>
        <div className="ph-actions">
          <Link href="/admin/editorial" className="btn btn-ghost btn-sm">Editorial Pipeline →</Link>
          <Link href="/admin/editorial/approval" className="btn btn-ghost btn-sm">Approval Desk →</Link>
          <Link href="/admin/go/submit" target="_blank" className="btn btn-blue btn-sm">Public Gateway ↗</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Operator guidance banners */}
        {guidance.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {guidance.map((g, i) => (
              <div key={i} className={`alert ${g.critical ? 'alert-error' : 'alert-info'}`}>
                <span style={{ marginRight: 6 }}>{g.icon}</span>{g.msg}
              </div>
            ))}
          </div>
        )}

        {/* Stats — true portal stat cards */}
        <div className="stats-row" style={{ marginBottom: 16 }}>
          <Link href="/admin/community" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-num">{total}</div>
            <div className="stat-label">Total</div>
          </Link>
          <Link href="/admin/community?status=new" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className={`stat-num ${newCount > 0 ? 'has-amber' : ''}`}>{newCount}</div>
            <div className="stat-label">New</div>
          </Link>
          <Link href="/admin/community?status=needs-review" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className={`stat-num ${inReview > 0 ? 'has-amber' : ''}`}>{inReview}</div>
            <div className="stat-label">Needs Review</div>
          </Link>
          <Link href="/admin/community?status=in-progress" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-num">{inProgress}</div>
            <div className="stat-label">In Progress</div>
          </Link>
          <Link href="/admin/community?status=in-editing" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-num">{inEditing}</div>
            <div className="stat-label">In Editing</div>
          </Link>
          <Link href="/admin/community?status=published" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-num">{published}</div>
            <div className="stat-label">Published</div>
          </Link>
          <Link href="/admin/community?status=rejected" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className={`stat-num ${filterStatus === 'rejected' ? 'has-red' : ''}`} style={filterStatus === 'rejected' ? { color: 'var(--color-portal-red)' } : undefined}>{rejected}</div>
            <div className="stat-label">Rejected</div>
          </Link>
        </div>

        {/* Filters card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="text-muted text-xs fw-700" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>Status:</span>
              <FilterChip href={statusHref()} active={!filterStatus} label="All" />
              {statusChips.map(s => {
                const sc = STATUS_CONFIG[s]
                const count = rows.filter(r => r.status === s).length
                if (count === 0) return null
                return (
                  <FilterChip key={s} href={statusHref(s)} active={filterStatus === s} label={`${sc.label} (${count})`} />
                )
              })}
            </div>

            {typeCounts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="text-muted text-xs fw-700" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>Type:</span>
                <FilterChip href={typeHref()} active={!filterType} label="All" />
                {typeCounts.map(t => (
                  <FilterChip
                    key={t.type}
                    href={typeHref(t.type)}
                    active={filterType === t.type}
                    label={`${t.shortLabel} (${t.count})`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submission list */}
        {subs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p className="fw-700">{total === 0 ? 'No community submissions yet.' : 'No submissions match the current filters.'}</p>
            {total > 0 && (
              <Link href="/admin/community" className="text-xs" style={{ color: 'var(--color-portal-blue)', marginTop: 8, display: 'inline-block' }}>
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subs.map(sub => {
              const tc      = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
              const sc      = STATUS_CONFIG[sub.status]
              const subject = subjectLine(sub)
              const accent  = TYPE_COLORS[sub.submission_type] ?? 'var(--color-portal-border-2)'

              return (
                // Whole card is a Link now. Inline mailto: was the
                // reason we couldn't make the whole row clickable
                // before — moved to a plain visible string here, since
                // the editor opens the row and emails from the
                // detail page anyway.
                <Link
                  key={sub.id}
                  href={`/admin/community/${sub.id}`}
                  className="card"
                  style={{
                    borderLeft: `3px solid ${accent}`,
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span className="text-xs fw-700" style={{ color: 'var(--color-portal-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          {tc?.shortLabel ?? sub.submission_type}
                        </span>
                        <span className="badge" style={{ background: sc?.bg ?? 'var(--color-portal-bg)', color: sc?.color ?? 'var(--color-portal-text)' }}>
                          {sc?.label ?? sub.status}
                        </span>
                        {sub.internal_priority !== 'normal' && (
                          <span className={`badge ${sub.internal_priority === 'urgent' ? 'badge-red' : sub.internal_priority === 'high' ? 'badge-amber' : 'badge-gray'}`}>
                            ↑ {sub.internal_priority}
                          </span>
                        )}
                      </div>
                      {subject && (
                        <div className="fw-700" style={{ fontSize: 15, color: 'var(--color-portal-text)', lineHeight: 1.3 }}>
                          {subject}
                        </div>
                      )}
                      <div className="text-sub text-sm" style={{ marginTop: 4 }}>
                        From <span className="fw-600">{sub.submitter_name}</span>
                        <span className="text-muted"> · {sub.submitter_email}</span>
                        {sub.submitter_phone && <span className="text-muted"> · {sub.submitter_phone}</span>}
                      </div>
                      {sub.editor_notes && (
                        <div className="alert alert-warning" style={{ marginTop: 6, padding: '4px 8px', fontSize: 11 }}>
                          📝 {sub.editor_notes}
                        </div>
                      )}
                      {sub.assigned_to && (
                        <div className="text-muted text-xs" style={{ marginTop: 4 }}>
                          Assigned to: <span className="fw-600">{sub.assigned_to}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 92 }}>
                      <div className="text-muted text-xs">{timeAgo(sub.created_at)}</div>
                      {sub.editorial_deadline && (
                        <div className="text-xs fw-700" style={{ color: 'var(--color-portal-amber)' }}>
                          Due {shortDate(sub.editorial_deadline)}
                        </div>
                      )}
                      {/* Open → button. Used to be a small text link
                          on the far right, with three inline action
                          buttons (Mark needs-review / Request more
                          info / Reject) below the row. Removed those
                          quick actions — editorial decisions happen
                          inside the detail page where the full
                          context lives. Open is now the single
                          primary affordance on every row. */}
                      <span
                        className="btn btn-blue btn-xs"
                        style={{
                          padding: '5px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 6,
                          background: 'var(--color-portal-navy)',
                          color: 'white',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Open →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}

            {subs.length >= 100 && (
              <p className="text-muted text-xs" style={{ textAlign: 'center', padding: 12 }}>
                Showing first 100 results. Use filters to narrow.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Compact filter chip — used in both status + type rows.
function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        background: active ? 'var(--color-portal-navy)' : 'white',
        color: active ? 'white' : 'var(--color-portal-sub)',
        border: `1px solid ${active ? 'var(--color-portal-navy)' : 'var(--color-portal-border)'}`,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  )
}
