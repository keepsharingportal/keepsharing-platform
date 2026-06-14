'use client'

// Per-category pool list. Each row shows the article preview (title +
// excerpt + first image) plus a month picker + Schedule button.
// Scheduled rows surface first, sorted by their scheduled month, with
// a Publish-now button that fires the publish-to-article bridge.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Send, CheckCircle2 } from 'lucide-react'

export interface PoolRow {
  id:                     string
  submission_type:        string
  target_publication:     string
  working_title:          string | null
  excerpt:                string | null
  feature_image_url:      string | null
  related_person_name:    string | null
  related_business_name:  string | null
  related_school_name:    string | null
  phase:                  string
  scheduled_for_month:    string | null  // 'YYYY-MM'
  issue_month:            string | null
  issue_year:             number | null
  interview_image_urls:   Array<{ url: string }> | null
  ai_draft_content:       string | null
  promoted_to_article_id: string | null
  created_at:             string
  updated_at:             string
}

interface Props { rows: PoolRow[] }

// Month options — current month + next 6 (most editorial planning is
// 1-3 months out; we give a generous window).
function monthOptions(): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    out.push({ value, label })
  }
  return out
}

function subjectLine(r: PoolRow): string {
  if (r.working_title) return r.working_title
  const entity = r.related_person_name ?? r.related_business_name ?? r.related_school_name
  if (entity) return entity
  return '(no title yet)'
}

function thumbnailUrl(r: PoolRow): string | null {
  if (r.feature_image_url) return r.feature_image_url
  if (Array.isArray(r.interview_image_urls) && r.interview_image_urls.length > 0) {
    return r.interview_image_urls[0].url
  }
  return null
}

export function PendingPoolClient({ rows }: Props) {
  const router = useRouter()
  const [busy,  setBusy]  = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Local month selection per row before they hit Schedule
  const [monthChoice, setMonthChoice] = useState<Record<string, string>>({})

  // Scheduled rows first, then in-pool. Within each group, sort by
  // scheduled month / updated date.
  const sorted = [...rows].sort((a, b) => {
    const aSched = a.phase === 'scheduled' ? 0 : 1
    const bSched = b.phase === 'scheduled' ? 0 : 1
    if (aSched !== bSched) return aSched - bSched
    if (a.scheduled_for_month && b.scheduled_for_month) {
      return a.scheduled_for_month.localeCompare(b.scheduled_for_month)
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  async function schedule(rowId: string, month: string) {
    if (!month) { setError('Pick a month first.'); return }
    setBusy(rowId); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${rowId}/schedule`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Schedule failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  async function unschedule(rowId: string) {
    if (!confirm('Move this back to the unscheduled pool?')) return
    setBusy(rowId); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${rowId}/schedule`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month: null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Unschedule failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  async function publishNow(rowId: string) {
    if (!confirm('Publish to homepage now? Creates a public guide_articles row and (if approved for social) fires Meta Suite auto-post.')) return
    setBusy(rowId); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${rowId}/publish-to-article`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Publish failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  const months = monthOptions()

  return (
    <>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="fw-700">No approved articles in this category&apos;s pool yet.</p>
          <p className="text-muted text-xs" style={{ marginTop: 4 }}>
            Items get here from the submission detail page after the editor sets phase = <strong>In monthly pool</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(r => {
            const isScheduled = r.phase === 'scheduled'
            const isPublished = !!r.promoted_to_article_id
            const thumb = thumbnailUrl(r)
            return (
              <div
                key={r.id}
                className="card"
                style={{
                  borderLeft: isScheduled
                    ? '3px solid var(--color-portal-green)'
                    : '3px solid var(--color-portal-border-2)',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {thumb && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt=""
                      style={{
                        width: 80, height: 80, objectFit: 'cover',
                        borderRadius: 8, flexShrink: 0,
                        border: '1px solid var(--color-portal-border)',
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="text-muted text-xs fw-700" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>
                        {r.target_publication?.toUpperCase()}
                      </span>
                      {isScheduled && r.scheduled_for_month && (
                        <span className="badge badge-green">
                          <Calendar size={9} style={{ display: 'inline', verticalAlign: -1 }} />{' '}
                          Scheduled for {labelFor(r.scheduled_for_month)}
                        </span>
                      )}
                      {isPublished && (
                        <span className="badge badge-green">
                          <CheckCircle2 size={9} style={{ display: 'inline', verticalAlign: -1 }} /> Published
                        </span>
                      )}
                    </div>
                    <div className="fw-700" style={{ fontSize: 15, color: 'var(--color-portal-text)', lineHeight: 1.3 }}>
                      {subjectLine(r)}
                    </div>
                    {r.excerpt && (
                      <div className="text-sub text-sm" style={{ marginTop: 4, lineHeight: 1.45 }}>
                        {r.excerpt.length > 200 ? r.excerpt.slice(0, 200) + '…' : r.excerpt}
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <Link
                        href={`/admin/community/${r.id}`}
                        className="text-xs"
                        style={{ color: 'var(--color-portal-blue)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Open detail →
                      </Link>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {isPublished ? (
                      <Link
                        href={`/admin/articles/${r.promoted_to_article_id}/edit`}
                        className="btn btn-ghost btn-sm"
                      >
                        Edit article →
                      </Link>
                    ) : isScheduled ? (
                      <>
                        <button
                          type="button"
                          onClick={() => publishNow(r.id)}
                          disabled={busy === r.id}
                          className="btn btn-primary btn-sm"
                        >
                          {busy === r.id ? <Loader2 size={11} className="animate-spin" /> : <><Send size={11} /> Publish now</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => unschedule(r.id)}
                          disabled={busy === r.id}
                          className="btn btn-ghost btn-xs"
                        >
                          Unschedule
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={monthChoice[r.id] ?? ''}
                          onChange={e => setMonthChoice(prev => ({ ...prev, [r.id]: e.target.value }))}
                          style={{
                            padding: '6px 10px',
                            border: '1.5px solid var(--color-portal-border)',
                            borderRadius: 6,
                            fontSize: 12,
                            background: 'white',
                          }}
                        >
                          <option value="">— month —</option>
                          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => schedule(r.id, monthChoice[r.id] ?? '')}
                          disabled={busy === r.id || !monthChoice[r.id]}
                          className="btn btn-primary btn-sm"
                        >
                          {busy === r.id ? <Loader2 size={11} className="animate-spin" /> : 'Schedule'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function labelFor(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}
