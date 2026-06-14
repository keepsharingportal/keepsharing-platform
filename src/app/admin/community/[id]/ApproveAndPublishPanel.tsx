'use client'

// Channel approvals panel. The three channel gates (web / newsletter
// / social) that drive downstream automation:
//   - approved_web        → article eligible for homepage rotation
//                            via the publish-to-article bridge when
//                            scheduled in the pool
//   - approved_newsletter → flagged for the newsletter draft builder
//                            in Content Deployment
//   - approved_social     → Meta Suite auto-posts to Facebook when
//                            the article publishes
//
// Only meaningful at draft-ready and beyond. The detail page hides
// this panel for earlier phases.

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
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
  const [approved,    setApproved]    = useState(initialApproved)
  const [busy,        setBusy]        = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
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

  const allApproved = approved.web && approved.newsletter && approved.social

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-portal-border)',
        background: 'var(--color-portal-bg)',
      }}>
        <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Channel approvals</div>
        <div className="text-portal-sub" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>
          Which channels can this run on once it&apos;s published from the pool.
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {error && (
          <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Channel toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <div className="text-portal-sub" style={{ fontSize: 12 }}>{ch.hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Primary action: approve remaining channels. Hides when all
            three are on. Same dimensions as Approve & send email in
            OutreachComposerPanel so the right column stays consistent. */}
        {!allApproved && (
          <button
            type="button"
            onClick={async () => {
              if (!approved.web)        await toggleChannel('web', true)
              if (!approved.newsletter) await toggleChannel('newsletter', true)
              if (!approved.social)     await toggleChannel('social', true)
            }}
            disabled={!!busy}
            style={primaryBtn(!!busy)}
          >
            <Check size={14} />
            <span>Approve {!approved.web && !approved.newsletter && !approved.social ? 'all channels' : 'remaining channels'}</span>
          </button>
        )}

        {/* Request changes — collapsible. When expanded, the Send
            button matches the destructiveBtn dimensions (same height
            as Reject) but in amber tone so the panel's two paths
            (approve / request-changes) feel balanced. */}
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-portal-border)' }}>
          {!showChanges ? (
            <button
              type="button"
              onClick={() => setShowChanges(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 12, color: 'var(--color-portal-amber)', fontWeight: 600,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              ↩ Request changes from the editor
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={changesNote}
                onChange={e => setChangesNote(e.target.value)}
                rows={3}
                placeholder="Describe what needs to change before this is ready…"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1.5px solid var(--color-portal-border)',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: 'white',
                  outline: 'none',
                  color: 'var(--color-portal-text)',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowChanges(false)}
                  disabled={changesBusy}
                  style={ghostBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={requestChanges}
                  disabled={changesBusy || !changesNote.trim()}
                  style={amberBtn(changesBusy || !changesNote.trim())}
                >
                  {changesBusy
                    ? <><Loader2 size={12} className="animate-spin" /><span>Sending…</span></>
                    : <span>Send change request</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Same shared button vocabulary as OutreachComposerPanel /
// NextActionPanel so all right-column buttons feel coherent.
function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px',
    background: 'var(--color-portal-navy)',
    color: 'white',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    whiteSpace: 'nowrap',
  }
}

function amberBtn(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 14px',
    background: 'var(--color-portal-amber)',
    color: 'white',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  }
}

const ghostBtn: React.CSSProperties = {
  padding: '9px 14px',
  background: 'white',
  color: 'var(--color-portal-sub)',
  border: '1px solid var(--color-portal-border)',
  borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
