'use client'

// Channel approvals panel. Renamed from "Approve & Publish" because
// publishing no longer happens from this page — it happens in
// /admin/pending (the editor schedules + publishes from the monthly
// pool). What stays here: the three channel gates (web / newsletter
// / social) that drive downstream automation:
//   - approved_web        → article eligible for homepage rotation
//                            (via the publish-to-article bridge when
//                             scheduled in the pool)
//   - approved_newsletter → flagged for the newsletter draft builder
//                            in Content Deployment
//   - approved_social     → Meta Suite auto-posts to Facebook when
//                            the article publishes
//
// These channel gates are ONLY meaningful at draft-ready and beyond.
// Earlier phases (nominated, outreach-sent, etc.) have nothing to
// approve yet — the calling page hides this panel for those phases.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  submissionId:        string
  initialApproved:     { web: boolean; newsletter: boolean; social: boolean }
  initialChangesNote?: string | null
}

const CHANNELS = [
  { key: 'web',        label: 'Approve for Website',     hint: 'Homepage rotation + article archives' },
  { key: 'newsletter', label: 'Approve for Newsletter',  hint: 'Eligible for next newsletter issue' },
  { key: 'social',     label: 'Approve for Social',      hint: 'Auto-posts to Facebook on publish' },
] as const

export function ApproveAndPublishPanel({
  submissionId, initialApproved, initialChangesNote,
}: Props) {
  const router = useRouter()
  const [approved, setApproved]     = useState(initialApproved)
  const [busy, setBusy]             = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [changesNote, setChangesNote] = useState(initialChangesNote ?? '')
  const [changesBusy, setChangesBusy] = useState(false)
  const [showChanges, setShowChanges] = useState(false)

  async function toggleChannel(channel: 'web' | 'newsletter' | 'social', next: boolean) {
    setBusy(channel); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/approve-channel`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ channel, approved: next }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Approval failed.'); return }
      setApproved(prev => ({ ...prev, [channel]: next }))
    } finally { setBusy(null) }
  }

  async function requestChanges() {
    if (!changesNote.trim()) { setError('Add a note describing what needs to change.'); return }
    setChangesBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/request-changes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note: changesNote.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Failed to flag changes.'); return }
      setShowChanges(false)
      router.refresh()
    } finally { setChangesBusy(false) }
  }

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 4 }}>Channel approvals</div>
      <div className="text-muted text-xs" style={{ marginBottom: 12 }}>
        Which channels can this run on once it&apos;s published from the pool.
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Channel toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHANNELS.map(ch => (
          <div key={ch.key} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggleChannel(ch.key, !approved[ch.key])}
              disabled={busy === ch.key}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${approved[ch.key] ? 'var(--color-portal-green)' : 'var(--color-portal-border-2)'}`,
                background: approved[ch.key] ? 'var(--color-portal-green)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: busy === ch.key ? 'wait' : 'pointer',
                marginTop: 2,
              }}
              title={approved[ch.key] ? 'Click to un-approve' : 'Click to approve'}
            >
              {busy === ch.key ? <Loader2 size={12} className="animate-spin" color="white" /> :
                approved[ch.key] ? <Check size={14} color="white" strokeWidth={3} /> : null}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`text-sm fw-700 ${approved[ch.key] ? 'text-portal-green' : 'text-portal-text'}`}>
                {ch.label}
              </div>
              <div className="text-[11px] text-portal-muted">{ch.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Approve-the-rest shortcut. Hides when all three are on. */}
      {!(approved.web && approved.newsletter && approved.social) && (
        <button
          type="button"
          onClick={async () => {
            if (!approved.web)        await toggleChannel('web', true)
            if (!approved.newsletter) await toggleChannel('newsletter', true)
            if (!approved.social)     await toggleChannel('social', true)
          }}
          disabled={!!busy}
          style={{
            width: '100%', padding: '8px 12px', marginTop: 12,
            background: 'var(--color-portal-navy)', color: 'white',
            border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✓ Approve {!approved.web && !approved.newsletter && !approved.social ? 'all channels' : 'remaining channels'}
        </button>
      )}

      {/* Request changes — small secondary link, not a giant button. */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-portal-border)' }}>
        {!showChanges ? (
          <button
            type="button"
            onClick={() => setShowChanges(true)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 11, color: 'var(--color-portal-amber)', fontWeight: 600,
              textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            ↩ Request changes from the editor
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={changesNote}
              onChange={e => setChangesNote(e.target.value)}
              rows={3}
              placeholder="Describe what needs to change before this is ready…"
              className="w-full text-xs px-3 py-2 rounded-lg border border-portal-border"
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={requestChanges}
                disabled={changesBusy}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-portal-amber text-white font-bold"
              >
                {changesBusy ? <Loader2 size={11} className="animate-spin inline" /> : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setShowChanges(false)}
                disabled={changesBusy}
                className="text-xs px-3 py-2 rounded-lg text-portal-sub"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
