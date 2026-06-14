'use client'

// Right-column action panel for every phase EXCEPT nominated /
// nomination-accepted (those use OutreachComposerPanel). One primary
// CTA + a matching-weight red destructive button when the current
// phase allows reject. Same dimensions / typography as the
// OutreachComposerPanel pair so the right column feels coherent.

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import { ArrowRight, Loader2, AlertTriangle, Archive } from 'lucide-react'
import { PHASES, type Phase } from '@/lib/submissions/phases'
import { RejectModal }   from './RejectModal'

interface Props {
  submissionId: string
  currentPhase: Phase
  needsOutreach: boolean
  hasInterview: boolean
  hasDraft:     boolean
  /** Used by RejectModal's confirm copy. */
  nomineeName:  string
}

export function NextActionPanel({
  submissionId, currentPhase, needsOutreach, hasInterview, hasDraft, nomineeName,
}: Props) {
  const router = useRouter()
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [rejectOpen,  setRejectOpen]  = useState(false)

  const config        = PHASES[currentPhase]
  const canReject     = config.allowedNext.includes('rejected')
  const canArchive    = currentPhase !== 'archived' && currentPhase !== 'published' && currentPhase !== 'rejected'
  const showSkipDraft = !needsOutreach && currentPhase === 'nominated'

  async function advance(nextPhase: Phase, requireConfirm?: string) {
    if (requireConfirm && !confirm(requireConfirm)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/set-phase`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phase: nextPhase }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Phase update failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  async function callOutreach(action: 'outreach' | 'send-interview') {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/outreach`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Send failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  async function handlePrimary(nextPhase: Phase, label: string) {
    if (currentPhase === 'nomination-accepted' && nextPhase === 'outreach-sent') {
      if (!confirm(`Send the outreach email to the nominee?\n\nThey'll get a message explaining they were nominated for ${label.toLowerCase()} and asking if they'd like to participate.`)) return
      await callOutreach('outreach'); return
    }
    if (currentPhase === 'nominee-accepted' && nextPhase === 'interview-sent') {
      if (!confirm('Send the interview form link to the nominee?\n\nThey\'ll get an email with a per-type questionnaire + photo upload.')) return
      await callOutreach('send-interview'); return
    }
    if (currentPhase === 'scheduled' && nextPhase === 'published') {
      if (!confirm('Publish to homepage now? Creates a public guide_articles row + (if approved) fires Meta Suite auto-post.')) return
    }
    await advance(nextPhase)
  }

  async function handleReject(reason: string) {
    const res = await fetch(`/api/admin/community-submissions/${submissionId}/reject`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error ?? 'Reject failed.')
    setRejectOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-portal-border)',
          background: 'var(--color-portal-bg)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-portal-text)' }}>
            Next action
          </span>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {config.nextAction ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => handlePrimary(config.nextAction!.nextPhase, config.nextAction!.label)}
              style={primaryBtn(busy)}
            >
              {busy
                ? <><Loader2 size={14} className="animate-spin" /><span>Working…</span></>
                : <><span>{config.nextAction.label}</span><ArrowRight size={14} /></>}
            </button>
          ) : (
            <div style={{
              padding: 12,
              background: 'var(--color-portal-bg)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--color-portal-text)',
              lineHeight: 1.5,
            }}>
              {currentPhase === 'in-pool'
                ? <>This article is in the monthly pool. Schedule + publish from <a href="/admin/pending" style={{ color: 'var(--color-portal-blue)', fontWeight: 600 }}>Pending Pool →</a></>
                : currentPhase === 'published'
                  ? 'Article is live on the homepage.'
                  : currentPhase === 'archived'
                    ? 'Archived. No further action.'
                    : 'No editor action — waiting on external state (nominee response, etc).'}
            </div>
          )}

          {canReject && (
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              disabled={busy}
              style={destructiveBtn(busy)}
            >
              Reject nomination
            </button>
          )}

          {/* Secondary actions — restrained text links at the bottom.
              These are the rare side-paths (skip outreach when the
              type doesn't need it, mark nominee declined, archive). */}
          {(showSkipDraft || currentPhase === 'outreach-sent' || canArchive) && (
            <div style={{
              display: 'flex',
              gap: 14,
              paddingTop: 10,
              marginTop: 2,
              borderTop: '1px solid var(--color-portal-border)',
              flexWrap: 'wrap',
            }}>
              {showSkipDraft && (
                <SecondaryLink
                  disabled={busy}
                  onClick={() => advance('draft-in-progress', 'This type doesn\'t need outreach. Jump straight to drafting?')}
                >
                  Skip outreach
                </SecondaryLink>
              )}
              {currentPhase === 'outreach-sent' && (
                <SecondaryLink
                  disabled={busy}
                  tone="muted"
                  onClick={() => advance('nominee-declined', 'Mark nominee as declined? (You won\'t be able to send the interview after this.)')}
                >
                  Nominee declined
                </SecondaryLink>
              )}
              {canArchive && (
                <SecondaryLink
                  disabled={busy}
                  onClick={() => advance('archived', 'Archive this submission? It will stop appearing in the active queue.')}
                  style={{ marginLeft: 'auto' }}
                >
                  <Archive size={11} style={{ marginRight: 4 }} /> Archive
                </SecondaryLink>
              )}
            </div>
          )}

          {/* Phase hints */}
          {currentPhase === 'interview-sent' && hasInterview && (
            <div className="text-sm" style={{ color: 'var(--color-portal-sub)', fontStyle: 'italic' }}>
              ℹ︎ Nominee already submitted the interview. Click the main action above to move forward.
            </div>
          )}
          {currentPhase === 'draft-ready' && !hasDraft && (
            <div className="text-sm" style={{ color: 'var(--color-portal-sub)', fontStyle: 'italic' }}>
              ℹ︎ No draft body yet. Use AI draft below or write manually first.
            </div>
          )}

        </div>
      </div>

      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        nomineeName={nomineeName}
        onConfirm={handleReject}
      />
    </>
  )
}

function SecondaryLink({
  children, onClick, disabled, tone = 'sub', style,
}: {
  children: React.ReactNode
  onClick:  () => void
  disabled?: boolean
  tone?:    'sub' | 'muted'
  style?:   React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center',
        background: 'none', border: 'none', padding: 0,
        fontSize: 12, fontWeight: 500,
        color: tone === 'muted' ? 'var(--color-portal-sub)' : 'var(--color-portal-sub)',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

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

function destructiveBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px',
    background: 'var(--color-portal-red)',
    color: 'white',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.5 : 1,
    whiteSpace: 'nowrap',
  }
}
